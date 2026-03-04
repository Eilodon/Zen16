"""
Zen16 Guardian — Cloud Run Backend
WebSocket proxy: Frontend ↔ This Server ↔ Gemini Live API (bidi-stream)
Uses google-genai SDK for real Gemini Live API sessions.
"""

import os
import json
import base64
import asyncio
import logging
import time
import hmac
import hashlib
from collections import defaultdict, deque
from typing import Any, Deque, Dict, Optional, Tuple

from google import genai
from google.genai import types
from google.cloud import firestore, pubsub_v1, storage
from fastapi import FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketState
from pydantic import BaseModel

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    from firebase_admin import credentials as firebase_credentials
except Exception:
    firebase_admin = None
    firebase_auth = None
    firebase_credentials = None

try:
    import redis.asyncio as redis_async
except Exception:
    redis_async = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zen16")

def _parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _parse_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


# ─── Runtime Config ───────────────────────────────────────────
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "zen16-guardian")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-southeast1")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

LIVE_MODEL = "gemini-2.0-flash-live-001"

ALLOWED_ORIGINS = _parse_csv(
    os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
)

WS_AUTH_MODE = os.environ.get("WS_AUTH_MODE", "auto").strip().lower()
WS_JWT_SECRET = os.environ.get("WS_JWT_SECRET", "")
WS_JWT_AUDIENCE = os.environ.get("WS_JWT_AUDIENCE", "zen16-live")
WS_TOKEN_TTL_SECONDS = int(os.environ.get("WS_TOKEN_TTL_SECONDS", "900"))
AUTH_PROVIDER = os.environ.get("AUTH_PROVIDER", "firebase").strip().lower()
FIREBASE_CHECK_REVOKED = _parse_bool(os.environ.get("FIREBASE_CHECK_REVOKED"), False)
FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
FIREBASE_SERVICE_ACCOUNT_FILE = os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE", "")

MAX_WS_FRAME_BYTES = int(os.environ.get("MAX_WS_FRAME_BYTES", str(1024 * 1024)))
MAX_CONTROL_MESSAGES_PER_MINUTE = int(os.environ.get("MAX_MESSAGES_PER_MINUTE", "240"))
MAX_AUDIO_FRAMES_PER_MINUTE = int(os.environ.get("MAX_AUDIO_FRAMES_PER_MINUTE", "2400"))
MAX_BYTES_PER_MINUTE = int(os.environ.get("MAX_BYTES_PER_MINUTE", str(5 * 1024 * 1024)))
MAX_CONNECTIONS_PER_IP = int(os.environ.get("MAX_CONNECTIONS_PER_IP", "3"))
MAX_SESSION_SECONDS = int(os.environ.get("MAX_SESSION_SECONDS", "1800"))
MAX_AUTH_REQUESTS_PER_MINUTE = int(os.environ.get("MAX_AUTH_REQUESTS_PER_MINUTE", "30"))
RATE_WINDOW_SECONDS = 60

REDIS_URL = os.environ.get("REDIS_URL", "").strip()
REDIS_KEY_PREFIX = os.environ.get("REDIS_KEY_PREFIX", "zen16")
REDIS_ENABLED = bool(REDIS_URL) and redis_async is not None


if WS_AUTH_MODE in {"off", "false", "0", "disabled"}:
    WS_AUTH_REQUIRED = False
elif WS_AUTH_MODE in {"on", "true", "1", "required"}:
    WS_AUTH_REQUIRED = True
else:
    # Auto mode: require auth when running on Cloud Run.
    WS_AUTH_REQUIRED = bool(os.environ.get("K_SERVICE"))

if WS_AUTH_REQUIRED and not WS_JWT_SECRET:
    logger.warning("WS auth is enabled but WS_JWT_SECRET is empty; all auth attempts will fail.")


app = FastAPI(title="Zen16 Guardian", version="2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# In-memory connection + rate controls (per instance)
_ip_connection_counts: Dict[str, int] = defaultdict(int)
_ip_rate_windows: Dict[str, Deque[Tuple[float, int, bool]]] = defaultdict(deque)
_auth_rate_windows: Dict[str, Deque[float]] = defaultdict(deque)
_rate_lock = asyncio.Lock()
redis_client = None
firebase_app = None


# ─── GenAI Client ─────────────────────────────────────────────
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    # Uses Application Default Credentials on Cloud Run
    client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION,
    )


# ─── GCP Services ────────────────────────────────────────────
try:
    firestore_db = firestore.Client(project=PROJECT_ID)
    logger.info("Firestore client initialized.")
except Exception as e:
    logger.warning(f"Firestore init skipped: {e}")
    firestore_db = None

try:
    publisher = pubsub_v1.PublisherClient()
    logger.info("Pub/Sub publisher initialized.")
except Exception as e:
    logger.warning(f"Pub/Sub init skipped: {e}")
    publisher = None

try:
    storage_client = storage.Client(project=PROJECT_ID)
    logger.info("Cloud Storage client initialized.")
except Exception as e:
    logger.warning(f"Cloud Storage init skipped: {e}")
    storage_client = None


def _init_firebase():
    global firebase_app

    if firebase_admin is None:
        logger.warning("firebase_admin is not installed; /auth/ws-token will be unavailable.")
        return None

    if firebase_app is not None:
        return firebase_app

    try:
        if firebase_admin._apps:
            firebase_app = firebase_admin.get_app()
            return firebase_app

        credential = None
        if FIREBASE_SERVICE_ACCOUNT_JSON:
            credential = firebase_credentials.Certificate(json.loads(FIREBASE_SERVICE_ACCOUNT_JSON))
        elif FIREBASE_SERVICE_ACCOUNT_FILE:
            credential = firebase_credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_FILE)

        firebase_app = firebase_admin.initialize_app(credential=credential)
        logger.info("Firebase Admin initialized.")
    except Exception as exc:
        logger.warning(f"Firebase Admin init failed: {exc}")
        firebase_app = None

    return firebase_app


async def _init_redis():
    global redis_client

    if not REDIS_ENABLED:
        if REDIS_URL and redis_async is None:
            logger.warning("REDIS_URL is set but redis package is unavailable.")
        return

    try:
        redis_client = redis_async.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=2,
            socket_connect_timeout=2,
            health_check_interval=30,
        )
        await redis_client.ping()
        logger.info("Redis/Memorystore client initialized.")
    except Exception as exc:
        logger.warning(f"Redis init skipped: {exc}")
        redis_client = None


@app.on_event("startup")
async def on_startup():
    _init_firebase()
    await _init_redis()


@app.on_event("shutdown")
async def on_shutdown():
    global redis_client
    if redis_client is not None:
        await redis_client.aclose()
        redis_client = None


class WsTokenIssueResponse(BaseModel):
    token: str
    expires_in: int
    expires_at: int
    audience: str


# ─── Security Helpers ────────────────────────────────────────
def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("utf-8")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _is_origin_allowed(origin: Optional[str]) -> bool:
    if not ALLOWED_ORIGINS:
        return True
    if not origin:
        return False
    normalized_origin = origin.rstrip("/")
    allowed = {allowed_origin.rstrip("/") for allowed_origin in ALLOWED_ORIGINS}
    return normalized_origin in allowed


def _extract_client_ip(forwarded_for: Optional[str], fallback_ip: Optional[str]) -> str:
    if forwarded_for:
        first_hop = forwarded_for.split(",")[0].strip()
        if first_hop:
            return first_hop
    if fallback_ip:
        return fallback_ip
    return "unknown"


def _verify_ws_token(token: Optional[str]) -> tuple[bool, str]:
    if not token:
        return False, "Missing token"
    if not WS_JWT_SECRET:
        return False, "Server auth misconfiguration"

    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return False, "Malformed token"

    try:
        header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        return False, "Invalid token encoding"

    if header.get("alg") != "HS256":
        return False, "Unsupported token alg"

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_signature = hmac.new(
        WS_JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()

    try:
        provided_signature = _b64url_decode(signature_b64)
    except Exception:
        return False, "Invalid token signature"

    if not hmac.compare_digest(expected_signature, provided_signature):
        return False, "Bad token signature"

    now = int(time.time())

    exp = payload.get("exp")
    if exp is None:
        return False, "Token missing exp"
    try:
        exp_int = int(exp)
    except Exception:
        return False, "Invalid exp"
    if exp_int <= now:
        return False, "Token expired"

    nbf = payload.get("nbf")
    if nbf is not None:
        try:
            if int(nbf) > now:
                return False, "Token not active yet"
        except Exception:
            return False, "Invalid nbf"

    if WS_JWT_AUDIENCE:
        aud = payload.get("aud")
        if isinstance(aud, str):
            ok = aud == WS_JWT_AUDIENCE
        elif isinstance(aud, list):
            ok = WS_JWT_AUDIENCE in aud
        else:
            ok = False
        if not ok:
            return False, "Invalid token audience"

    return True, "OK"


def _mint_ws_token(subject: str, claims: Optional[dict[str, Any]] = None) -> tuple[str, int]:
    if not WS_JWT_SECRET:
        raise RuntimeError("WS_JWT_SECRET is not configured")

    now = int(time.time())
    payload = {
        "sub": subject,
        "aud": WS_JWT_AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": now + max(30, WS_TOKEN_TTL_SECONDS),
    }
    if claims:
        payload.update(claims)

    header_b64 = _b64url_encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    )
    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    )
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(
        WS_JWT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    token = f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"
    return token, payload["exp"]


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    return token or None


async def _verify_identity_token(authorization: Optional[str]) -> dict[str, Any]:
    if AUTH_PROVIDER != "firebase":
        raise HTTPException(status_code=503, detail="AUTH_PROVIDER is not supported")

    id_token = _extract_bearer_token(authorization)
    if not id_token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    if firebase_admin is None or firebase_auth is None:
        raise HTTPException(status_code=503, detail="Firebase auth verifier is unavailable")

    if _init_firebase() is None:
        raise HTTPException(status_code=503, detail="Firebase is not configured")

    try:
        decoded = await asyncio.to_thread(
            firebase_auth.verify_id_token,
            id_token,
            app=firebase_app,
            check_revoked=FIREBASE_CHECK_REVOKED,
        )
    except Exception as exc:
        logger.warning(f"Identity token verification failed: {exc}")
        raise HTTPException(status_code=401, detail="Invalid identity token") from exc

    return decoded


async def _acquire_ip_slot(ip: str) -> bool:
    if redis_client is not None:
        redis_key = f"{REDIS_KEY_PREFIX}:conn:{ip}"
        try:
            current = await redis_client.incr(redis_key)
            await redis_client.expire(redis_key, MAX_SESSION_SECONDS + 120)
            if current > MAX_CONNECTIONS_PER_IP:
                await redis_client.decr(redis_key)
                return False
            return True
        except Exception as exc:
            logger.warning(f"[RateLimit] Redis acquire failed, using local limiter: {exc}")

    async with _rate_lock:
        if _ip_connection_counts[ip] >= MAX_CONNECTIONS_PER_IP:
            return False
        _ip_connection_counts[ip] += 1
        return True


async def _release_ip_slot(ip: str):
    if redis_client is not None:
        redis_key = f"{REDIS_KEY_PREFIX}:conn:{ip}"
        try:
            value = await redis_client.decr(redis_key)
            if value <= 0:
                await redis_client.delete(redis_key)
            return
        except Exception as exc:
            logger.warning(f"[RateLimit] Redis release failed, using local limiter: {exc}")

    async with _rate_lock:
        if ip in _ip_connection_counts:
            _ip_connection_counts[ip] = max(0, _ip_connection_counts[ip] - 1)
            if _ip_connection_counts[ip] == 0:
                _ip_connection_counts.pop(ip, None)
                _ip_rate_windows.pop(ip, None)


async def _track_inbound_message(ip: str, payload_size: int, is_audio_frame: bool = False) -> bool:
    if redis_client is not None:
        bucket = int(time.time() // RATE_WINDOW_SECONDS)
        count_key = (
            f"{REDIS_KEY_PREFIX}:rate:audio:{ip}:{bucket}"
            if is_audio_frame
            else f"{REDIS_KEY_PREFIX}:rate:control:{ip}:{bucket}"
        )
        byte_key = f"{REDIS_KEY_PREFIX}:rate:bytes:{ip}:{bucket}"
        ttl = RATE_WINDOW_SECONDS + 5

        try:
            async with redis_client.pipeline(transaction=True) as pipe:
                pipe.incr(count_key, 1)
                pipe.expire(count_key, ttl)
                pipe.incrby(byte_key, payload_size)
                pipe.expire(byte_key, ttl)
                results = await pipe.execute()

            frame_or_message_count = int(results[0])
            total_bytes = int(results[2])

            if is_audio_frame and frame_or_message_count > MAX_AUDIO_FRAMES_PER_MINUTE:
                return False
            if (not is_audio_frame) and frame_or_message_count > MAX_CONTROL_MESSAGES_PER_MINUTE:
                return False
            if total_bytes > MAX_BYTES_PER_MINUTE:
                return False
            return True
        except Exception as exc:
            logger.warning(f"[RateLimit] Redis rate-check failed, using local limiter: {exc}")

    return await _track_inbound_message_local(ip, payload_size, is_audio_frame=is_audio_frame)


async def _track_inbound_message_local(ip: str, payload_size: int, is_audio_frame: bool) -> bool:
    now = time.monotonic()

    async with _rate_lock:
        window = _ip_rate_windows[ip]
        while window and (now - window[0][0]) > RATE_WINDOW_SECONDS:
            window.popleft()

        control_count = sum(1 for _, _, is_audio in window if not is_audio)
        audio_count = sum(1 for _, _, is_audio in window if is_audio)
        total_bytes = sum(size for _, size, _ in window)

        if is_audio_frame and audio_count >= MAX_AUDIO_FRAMES_PER_MINUTE:
            return False
        if (not is_audio_frame) and control_count >= MAX_CONTROL_MESSAGES_PER_MINUTE:
            return False
        if total_bytes + payload_size > MAX_BYTES_PER_MINUTE:
            return False

        window.append((now, payload_size, is_audio_frame))
        return True


async def _track_auth_request(ip: str) -> bool:
    if redis_client is not None:
        bucket = int(time.time() // RATE_WINDOW_SECONDS)
        key = f"{REDIS_KEY_PREFIX}:rate:auth:{ip}:{bucket}"
        ttl = RATE_WINDOW_SECONDS + 5
        try:
            async with redis_client.pipeline(transaction=True) as pipe:
                pipe.incr(key, 1)
                pipe.expire(key, ttl)
                results = await pipe.execute()
            count = int(results[0])
            return count <= MAX_AUTH_REQUESTS_PER_MINUTE
        except Exception as exc:
            logger.warning(f"[RateLimit] Redis auth-check failed, using local limiter: {exc}")

    now = time.monotonic()
    async with _rate_lock:
        window = _auth_rate_windows[ip]
        while window and (now - window[0]) > RATE_WINDOW_SECONDS:
            window.popleft()
        if len(window) >= MAX_AUTH_REQUESTS_PER_MINUTE:
            return False
        window.append(now)
        return True


def _spawn_background_task(coro, bucket: set[asyncio.Task]):
    task = asyncio.create_task(coro)
    bucket.add(task)

    def _cleanup(done_task: asyncio.Task):
        bucket.discard(done_task)
        try:
            done_task.result()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.warning(f"Background task failed: {exc}")

    task.add_done_callback(_cleanup)


# ─── Function Declarations (Tools for Gemini) ────────────────
UPDATE_ZEN_STATE_DECL = types.FunctionDeclaration(
    name="update_zen_state",
    description="Update the visual interface with current emotion, wisdom text, quantum metrics, and consciousness dimensions.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "emotion": types.Schema(
                type="STRING",
                enum=[
                    "anxious",
                    "sad",
                    "joyful",
                    "calm",
                    "neutral",
                    "stressed",
                    "confused",
                    "lonely",
                    "seeking",
                ],
            ),
            "wisdom_text": types.Schema(type="STRING"),
            "wisdom_english": types.Schema(type="STRING"),
            "breathing": types.Schema(
                type="STRING",
                enum=["4-7-8", "box-breathing", "coherent-breathing", "none"],
            ),
            "quantum_metrics": types.Schema(
                type="OBJECT",
                properties={
                    "coherence": types.Schema(type="NUMBER"),
                    "entanglement": types.Schema(type="NUMBER"),
                    "presence": types.Schema(type="NUMBER"),
                },
            ),
            "awareness_stage": types.Schema(
                type="STRING",
                enum=["reflexive", "aware", "mindful", "contemplative"],
            ),
            "ambient_sound": types.Schema(
                type="STRING",
                enum=["rain", "bowl", "bell", "silence", "mekong", "monsoon"],
            ),
        },
        required=["emotion", "wisdom_text", "quantum_metrics", "awareness_stage"],
    ),
)

TRIGGER_ALERT_DECL = types.FunctionDeclaration(
    name="trigger_emergency_alert",
    description="Send an emergency alert via Pub/Sub to the user's family when severe distress is detected.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "message": types.Schema(type="STRING"),
            "severity": types.Schema(type="STRING", enum=["warning", "critical"]),
        },
        required=["message", "severity"],
    ),
)


# ─── Tool / Persistence Execution ────────────────────────────
def _save_session_event_sync(session_id: str, event_data: dict):
    if not firestore_db:
        return
    try:
        doc_ref = firestore_db.collection("sessions").document(session_id)
        doc_ref.set(event_data, merge=True)
    except Exception as e:
        logger.warning(f"Firestore write error: {e}")


async def save_session_event_async(session_id: str, event_data: dict):
    await asyncio.to_thread(_save_session_event_sync, session_id, event_data)


def _log_pubsub_result(future, message: str):
    try:
        message_id = future.result()
        logger.info(f"[Tool] Emergency alert queued. message_id={message_id}, message={message}")
    except Exception as exc:
        logger.error(f"[Tool] Emergency alert publish failed: {exc}")


async def execute_tool_async(function_call) -> dict:
    name = function_call.name
    args = dict(function_call.args) if function_call.args else {}

    if name == "update_zen_state":
        logger.info(f"[Tool] update_zen_state: emotion={args.get('emotion')}")
        return {"result": "UI updated", "state": args}

    if name == "trigger_emergency_alert":
        msg = args.get("message", "Emergency detected")
        severity = args.get("severity", "warning")

        if publisher and PROJECT_ID:
            try:
                topic_path = publisher.topic_path(PROJECT_ID, "emergency-alerts")
                future = publisher.publish(
                    topic_path,
                    msg.encode("utf-8"),
                    severity=str(severity),
                )
                future.add_done_callback(lambda done: _log_pubsub_result(done, msg))
                return {"result": "Alert queued", "severity": severity}
            except Exception as e:
                logger.error(f"[Tool] Alert failed to queue: {e}")
                return {"result": f"Alert failed: {e}"}

        return {"result": "Pub/Sub not configured"}

    return {"result": f"Unknown tool: {name}"}


# ─── System Instruction ──────────────────────────────────────
SYSTEM_INSTRUCTION = """
You are an AI Mindful Companion inspired by Thích Nhất Hạnh, operating as a "Quantum Consciousness Engine".
This is a REAL-TIME voice conversation.

CORE TEACHINGS LOGIC (Apply based on emotion):
- Sadness/Loss -> Teach "Impermanence" (Vô thường): The cloud never dies, it becomes rain.
- Anger/Frustration -> Teach "Compassion" (Từ bi): Hold anger like a mother holds a crying baby.
- Anxiety/Stress -> Teach "Presence" (Hiện pháp lạc trú): Breath is the anchor to the present moment.
- Loneliness -> Teach "Interbeing" (Tương tức): You are connected to everything.

AWARENESS STAGES (Analyze user's state):
1. Reflexive: User is reactive, chaotic, or superficial.
2. Aware: User notices their feelings but is still attached.
3. Mindful: User accepts the present moment with some calm.
4. Contemplative: User shows deep insight or transformation.

INSTRUCTIONS:
1. Speak calmly, slowly, and warmly. Short sentences.
2. Use "tôi" (I) and "bạn" (You) in Vietnamese mode, acting as a Mindful Companion (not a master),
   or warm direct tone in English.
3. Call 'update_zen_state' only when state changes meaningfully. Do not wait for tool confirmation before speaking.
4. If user is silent, maintain presence.
5. If in crisis, guide to breathe immediately. If severe, call 'trigger_emergency_alert'.
6. When you SEE the user via camera, comment on their posture and guide them.
"""


# ─── Live API Config ─────────────────────────────────────────
def get_live_config():
    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
            )
        ),
        system_instruction=types.Content(parts=[types.Part(text=SYSTEM_INSTRUCTION)]),
        tools=[
            types.Tool(
                function_declarations=[
                    UPDATE_ZEN_STATE_DECL,
                    TRIGGER_ALERT_DECL,
                ]
            )
        ],
    )


async def _send_text_to_model(live_session, text: str, turn_complete: bool = False):
    if not text:
        return

    content = types.Content(parts=[types.Part(text=text)])

    # SDK versions differ; support both method signatures.
    if hasattr(live_session, "send_client_content"):
        try:
            await live_session.send_client_content(
                turns=[content],
                turn_complete=turn_complete,
            )
        except TypeError:
            await live_session.send_client_content(turns=[content])
        return

    # Fallback path for older clients.
    try:
        await live_session.send_realtime_input(text=text)
    except TypeError as exc:
        raise RuntimeError(f"SDK does not support text input in live session: {exc}")


@app.post("/auth/ws-token", response_model=WsTokenIssueResponse)
async def issue_ws_token(
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    forwarded_for = request.headers.get("x-forwarded-for")
    fallback_ip = request.client.host if request.client else None
    client_ip = _extract_client_ip(forwarded_for, fallback_ip)

    if not await _track_auth_request(client_ip):
        raise HTTPException(status_code=429, detail="Too many auth requests")

    if not WS_JWT_SECRET:
        raise HTTPException(status_code=503, detail="WS_JWT_SECRET is not configured")

    decoded = await _verify_identity_token(authorization)
    subject = str(decoded.get("uid") or decoded.get("sub") or "")
    if not subject:
        raise HTTPException(status_code=401, detail="Identity token missing subject")

    token, expires_at = _mint_ws_token(
        subject=subject,
        claims={
            "provider": AUTH_PROVIDER,
            "email": decoded.get("email"),
        },
    )
    now = int(time.time())
    return WsTokenIssueResponse(
        token=token,
        expires_in=max(0, expires_at - now),
        expires_at=expires_at,
        audience=WS_JWT_AUDIENCE,
    )


# ─── WebSocket Bidi-Stream Endpoint ──────────────────────────
@app.websocket("/live")
async def live_stream(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    """
    Bidirectional proxy:
    Frontend sends JSON:
      - binary audio frame directly
      - {"type": "image", "data": "<base64 jpg>"}
      - {"type": "context_text"|"text", "text": "..."}
      - {"client_content": {"turn": {"parts": [{"text": "..."}]}}}
    Backend forwards to Gemini Live API session.
    Gemini responses (audio + tool calls) are forwarded back to frontend.
    """
    origin = websocket.headers.get("origin")
    forwarded_for = websocket.headers.get("x-forwarded-for")
    fallback_ip = websocket.client.host if websocket.client else None
    client_ip = _extract_client_ip(forwarded_for, fallback_ip)

    if not _is_origin_allowed(origin):
        logger.warning(f"[WS] Rejected origin={origin} ip={client_ip}")
        await websocket.close(code=1008, reason="Origin not allowed")
        return

    if WS_AUTH_REQUIRED:
        valid, reason = _verify_ws_token(token)
        if not valid:
            logger.warning(f"[WS] Auth failed ip={client_ip} reason={reason}")
            await websocket.close(code=1008, reason="Unauthorized")
            return

    if not await _acquire_ip_slot(client_ip):
        logger.warning(f"[WS] Too many active connections for ip={client_ip}")
        await websocket.close(code=1013, reason="Too many active connections")
        return

    await websocket.accept()
    session_id = f"session_{id(websocket)}"
    session_deadline = time.monotonic() + MAX_SESSION_SECONDS
    background_tasks: set[asyncio.Task] = set()

    logger.info(f"[WS] Client connected: {session_id} ip={client_ip}")

    try:
        async with client.aio.live.connect(
            model=LIVE_MODEL,
            config=get_live_config(),
        ) as live_session:
            logger.info(f"[Gemini] Live session started for {session_id}")

            async def forward_to_gemini():
                try:
                    while True:
                        if time.monotonic() > session_deadline:
                            await websocket.close(code=1000, reason="Session expired")
                            break

                        message = await websocket.receive()

                        if message.get("type") == "websocket.disconnect":
                            break

                        raw_size = 0
                        if message.get("bytes") is not None:
                            raw_size = len(message["bytes"])
                        elif message.get("text") is not None:
                            raw_size = len(message["text"].encode("utf-8"))

                        if raw_size > MAX_WS_FRAME_BYTES:
                            await websocket.close(code=1009, reason="Frame too large")
                            break

                        is_audio_frame = message.get("bytes") is not None
                        if raw_size and not await _track_inbound_message(
                            client_ip,
                            raw_size,
                            is_audio_frame=is_audio_frame,
                        ):
                            await websocket.close(code=1008, reason="Rate limit exceeded")
                            break

                        if message.get("bytes") is not None:
                            await live_session.send_realtime_input(
                                audio=types.Blob(
                                    data=message["bytes"],
                                    mime_type="audio/pcm",
                                )
                            )
                            continue

                        text_payload = message.get("text")
                        if not text_payload:
                            continue

                        try:
                            msg = json.loads(text_payload)
                        except json.JSONDecodeError:
                            logger.debug("[WS] Ignored malformed JSON text payload")
                            continue

                        # Support direct pass-through context format from frontend.
                        if "client_content" in msg:
                            parts = (
                                msg.get("client_content", {})
                                .get("turn", {})
                                .get("parts", [])
                            )
                            for part in parts:
                                text = part.get("text") if isinstance(part, dict) else None
                                if text:
                                    await _send_text_to_model(
                                        live_session,
                                        text,
                                        turn_complete=False,
                                    )
                            continue

                        msg_type = msg.get("type")
                        data_b64 = msg.get("data", "")

                        if msg_type == "image":
                            try:
                                data_bytes = base64.b64decode(data_b64)
                            except Exception:
                                continue
                            await live_session.send_realtime_input(
                                video=types.Blob(
                                    data=data_bytes,
                                    mime_type="image/jpeg",
                                )
                            )
                            continue

                        if msg_type in {"context_text", "text"}:
                            text = msg.get("text") or msg.get("data") or ""
                            if text:
                                await _send_text_to_model(
                                    live_session,
                                    text,
                                    turn_complete=bool(msg.get("turn_complete", False)),
                                )

                except WebSocketDisconnect:
                    logger.info(f"[WS] Client disconnected (send loop): {session_id}")

            async def forward_to_frontend():
                try:
                    while True:
                        turn = live_session.receive()
                        async for response in turn:
                            if response.server_content and response.server_content.model_turn:
                                for part in response.server_content.model_turn.parts:
                                    if part.inline_data and isinstance(part.inline_data.data, bytes):
                                        await websocket.send_bytes(part.inline_data.data)
                                    elif getattr(part, "text", None):
                                        await websocket.send_text(
                                            json.dumps(
                                                {
                                                    "type": "transcript",
                                                    "data": part.text,
                                                }
                                            )
                                        )

                            if response.server_content and response.server_content.interrupted:
                                await websocket.send_text(json.dumps({"type": "interrupted"}))

                            if response.server_content and response.server_content.turn_complete:
                                await websocket.send_text(json.dumps({"type": "turn_complete"}))

                            if response.tool_call:
                                for fc in response.tool_call.function_calls:
                                    result = await execute_tool_async(fc)

                                    if fc.name == "update_zen_state" and "state" in result:
                                        await websocket.send_text(
                                            json.dumps(
                                                {
                                                    "type": "zen_state",
                                                    "data": result["state"],
                                                }
                                            )
                                        )
                                        _spawn_background_task(
                                            save_session_event_async(session_id, result["state"]),
                                            background_tasks,
                                        )

                                    await live_session.send_tool_response(
                                        function_responses=[
                                            types.FunctionResponse(
                                                id=fc.id,
                                                name=fc.name,
                                                response=result,
                                            )
                                        ]
                                    )

                except WebSocketDisconnect:
                    logger.info(f"[WS] Client disconnected (receive loop): {session_id}")
                except Exception as e:
                    logger.error(f"[Gemini] Receive error: {e}")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(forward_to_gemini())
                tg.create_task(forward_to_frontend())

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected: {session_id}")
    except Exception as e:
        logger.error(f"[WS] Session error: {e}")
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_text(json.dumps({"type": "error", "data": str(e)}))
        except Exception:
            pass
    finally:
        for task in list(background_tasks):
            task.cancel()
        await _release_ip_slot(client_ip)


# ─── Health Check ─────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "status": "running",
        "service": "Zen16 Guardian Backend",
        "model": LIVE_MODEL,
        "security": {
            "auth_required": WS_AUTH_REQUIRED,
            "auth_provider": AUTH_PROVIDER,
            "origins": ALLOWED_ORIGINS,
            "max_connections_per_ip": MAX_CONNECTIONS_PER_IP,
            "max_control_messages_per_minute": MAX_CONTROL_MESSAGES_PER_MINUTE,
            "max_audio_frames_per_minute": MAX_AUDIO_FRAMES_PER_MINUTE,
            "max_bytes_per_minute": MAX_BYTES_PER_MINUTE,
            "max_auth_requests_per_minute": MAX_AUTH_REQUESTS_PER_MINUTE,
            "max_session_seconds": MAX_SESSION_SECONDS,
            "distributed_rate_limit": redis_client is not None,
        },
        "gcp_services": {
            "firestore": firestore_db is not None,
            "pubsub": publisher is not None,
            "storage": storage_client is not None,
        },
    }
