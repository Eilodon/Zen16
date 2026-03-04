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

from google import genai
from google.genai import types
from google.cloud import firestore, pubsub_v1, storage
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zen16")

app = FastAPI(title="Zen16 Guardian", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── GCP Config ───────────────────────────────────────────────
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "zen16-guardian")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-southeast1")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Model for Live API bidi-streaming (audio + vision)
LIVE_MODEL = "gemini-2.0-flash-live-001"

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


# ─── Function Declarations (Tools for Gemini) ────────────────
UPDATE_ZEN_STATE_DECL = types.FunctionDeclaration(
    name="update_zen_state",
    description="Update the visual interface with current emotion, wisdom text, quantum metrics, and consciousness dimensions.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "emotion": types.Schema(
                type="STRING",
                enum=["anxious", "sad", "joyful", "calm", "neutral",
                      "stressed", "confused", "lonely", "seeking"],
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


# ─── Tool Execution ──────────────────────────────────────────
def execute_tool(function_call) -> dict:
    """Execute a function call from Gemini and return the result."""
    name = function_call.name
    args = dict(function_call.args) if function_call.args else {}

    if name == "update_zen_state":
        # Forward to frontend (will be sent via websocket)
        logger.info(f"[Tool] update_zen_state: emotion={args.get('emotion')}")
        return {"result": "UI updated", "state": args}

    elif name == "trigger_emergency_alert":
        msg = args.get("message", "Emergency detected")
        if publisher and PROJECT_ID:
            try:
                topic_path = publisher.topic_path(PROJECT_ID, "emergency-alerts")
                future = publisher.publish(topic_path, msg.encode("utf-8"))
                future.result(timeout=5)
                logger.info(f"[Tool] Emergency alert sent: {msg}")
                return {"result": "Alert sent via Pub/Sub"}
            except Exception as e:
                logger.error(f"[Tool] Alert failed: {e}")
                return {"result": f"Alert failed: {e}"}
        return {"result": "Pub/Sub not configured"}

    return {"result": f"Unknown tool: {name}"}


# ─── Firestore Session Memory ────────────────────────────────
def save_session_event(session_id: str, event_data: dict):
    """Save an event to Firestore for persistent memory."""
    if not firestore_db:
        return
    try:
        doc_ref = firestore_db.collection("sessions").document(session_id)
        doc_ref.set(event_data, merge=True)
    except Exception as e:
        logger.warning(f"Firestore write error: {e}")


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
3. Call 'update_zen_state' IMMEDIATELY at the start of your turn to update the UI.
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
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Kore"
                )
            )
        ),
        system_instruction=types.Content(
            parts=[types.Part(text=SYSTEM_INSTRUCTION)]
        ),
        tools=[
            types.Tool(function_declarations=[
                UPDATE_ZEN_STATE_DECL,
                TRIGGER_ALERT_DECL,
            ])
        ],
    )


# ─── WebSocket Bidi-Stream Endpoint ──────────────────────────
@app.websocket("/live")
async def live_stream(websocket: WebSocket):
    """
    Bidirectional proxy:
    Frontend sends: JSON { "type": "audio"|"image", "data": "<base64>" }
    Backend forwards to Gemini Live API session.
    Gemini responses (audio + tool calls) are forwarded back to frontend.
    """
    await websocket.accept()
    session_id = f"session_{id(websocket)}"
    logger.info(f"[WS] Client connected: {session_id}")

    try:
        async with client.aio.live.connect(
            model=LIVE_MODEL,
            config=get_live_config(),
        ) as live_session:
            logger.info(f"[Gemini] Live session started for {session_id}")

            # Task: Forward frontend audio/video → Gemini
            async def forward_to_gemini():
                try:
                    async for raw_message in websocket.iter_text():
                        try:
                            msg = json.loads(raw_message)
                            msg_type = msg.get("type", "audio")
                            data_b64 = msg.get("data", "")
                            data_bytes = base64.b64decode(data_b64)

                            if msg_type == "audio":
                                await live_session.send_realtime_input(
                                    audio=types.Blob(
                                        data=data_bytes,
                                        mime_type="audio/pcm",
                                    )
                                )
                            elif msg_type == "image":
                                await live_session.send_realtime_input(
                                    video=types.Blob(
                                        data=data_bytes,
                                        mime_type="image/jpeg",
                                    )
                                )
                        except json.JSONDecodeError:
                            # Raw binary audio fallback
                            await live_session.send_realtime_input(
                                audio=types.Blob(
                                    data=raw_message.encode("latin-1")
                                    if isinstance(raw_message, str)
                                    else raw_message,
                                    mime_type="audio/pcm",
                                )
                            )
                except WebSocketDisconnect:
                    logger.info(f"[WS] Client disconnected (send loop): {session_id}")

            # Task: Forward Gemini responses → frontend
            async def forward_to_frontend():
                try:
                    while True:
                        turn = live_session.receive()
                        async for response in turn:
                            # Handle audio output
                            if (
                                response.server_content
                                and response.server_content.model_turn
                            ):
                                for part in response.server_content.model_turn.parts:
                                    if part.inline_data and isinstance(
                                        part.inline_data.data, bytes
                                    ):
                                        audio_b64 = base64.b64encode(
                                            part.inline_data.data
                                        ).decode("utf-8")
                                        await websocket.send_text(
                                            json.dumps(
                                                {"type": "audio", "data": audio_b64}
                                            )
                                        )

                            # Handle interruption (barge-in)
                            if (
                                response.server_content
                                and response.server_content.interrupted
                            ):
                                await websocket.send_text(
                                    json.dumps({"type": "interrupted"})
                                )

                            # Handle turn complete
                            if (
                                response.server_content
                                and response.server_content.turn_complete
                            ):
                                await websocket.send_text(
                                    json.dumps({"type": "turn_complete"})
                                )

                            # Handle tool calls
                            if response.tool_call:
                                for fc in response.tool_call.function_calls:
                                    result = execute_tool(fc)
                                    # Forward tool state to frontend
                                    if fc.name == "update_zen_state" and "state" in result:
                                        await websocket.send_text(
                                            json.dumps(
                                                {
                                                    "type": "zen_state",
                                                    "data": result["state"],
                                                }
                                            )
                                        )
                                        # Save to Firestore
                                        save_session_event(
                                            session_id, result["state"]
                                        )

                                    # Send tool response back to Gemini
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
                    logger.info(
                        f"[WS] Client disconnected (receive loop): {session_id}"
                    )
                except Exception as e:
                    logger.error(f"[Gemini] Receive error: {e}")

            # Run both directions concurrently
            async with asyncio.TaskGroup() as tg:
                tg.create_task(forward_to_gemini())
                tg.create_task(forward_to_frontend())

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected: {session_id}")
    except Exception as e:
        logger.error(f"[WS] Session error: {e}")
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "data": str(e)})
            )
        except Exception:
            pass


# ─── Health Check ─────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "status": "running",
        "service": "Zen16 Guardian Backend",
        "model": LIVE_MODEL,
        "gcp_services": {
            "firestore": firestore_db is not None,
            "pubsub": publisher is not None,
            "storage": storage_client is not None,
        },
    }
