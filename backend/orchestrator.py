import asyncio
import base64
import json
import logging
import time
from typing import Any, Awaitable, Callable, Optional

from fastapi import WebSocket
from google.genai import types

try:
    from .agents.guardian import evaluate_telemetry
    from .agents.zen_master import get_live_config, LIVE_MODEL
except ImportError:
    from agents.guardian import evaluate_telemetry
    from agents.zen_master import get_live_config, LIVE_MODEL

logger = logging.getLogger("zen16.orchestrator")


class CognitiveOrchestrator:
    def __init__(
        self,
        websocket: WebSocket,
        client: Any,
        session_id: str,
        client_ip: str,
        max_session_seconds: int = 300,
    ):
        self.websocket = websocket
        self.client = client
        self.session_id = session_id
        self.client_ip = client_ip
        self.session_deadline = time.monotonic() + max_session_seconds
        self.live_session = None

        # Injected callbacks from main.py
        self.on_tool_call: Optional[Callable[[Any], Awaitable[dict]]] = None
        self.track_inbound_fn: Optional[Callable[[str, int, bool], Awaitable[bool]]] = None

    async def run(self):
        logger.info(f"[Orchestrator] Starting session {self.session_id} model={LIVE_MODEL}")

        try:
            async with self.client.aio.live.connect(
                model=LIVE_MODEL,
                config=get_live_config(),
            ) as live_session:
                self.live_session = live_session
                logger.info(f"[ZenMaster] Live session active for {self.session_id}")

                client_task = asyncio.create_task(self._handle_client_messages())
                gemini_task = asyncio.create_task(self._handle_gemini_responses())

                done, pending = await asyncio.wait(
                    [client_task, gemini_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for task in pending:
                    task.cancel()
                for task in pending:
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass

                for task in done:
                    exception = task.exception()
                    if exception:
                        raise exception

        except Exception as exc:
            logger.error(f"[Orchestrator] Error: {exc}")
            raise

    async def _handle_client_messages(self):
        while True:
            if time.monotonic() > self.session_deadline:
                await self.websocket.close(code=1000, reason="Session expired")
                break

            try:
                message = await self.websocket.receive()
            except Exception:
                break

            if message.get("type") == "websocket.disconnect":
                break

            raw_size = 0
            if message.get("bytes") is not None:
                raw_size = len(message["bytes"])
            elif message.get("text") is not None:
                raw_size = len(message["text"].encode("utf-8"))

            if raw_size > 10 * 1024 * 1024:
                await self.websocket.close(code=1009, reason="Frame too large")
                break

            is_audio_frame = message.get("bytes") is not None
            if self.track_inbound_fn is not None and not await self.track_inbound_fn(
                self.client_ip,
                raw_size,
                is_audio_frame,
            ):
                await self.websocket.close(code=1008, reason="Rate limit exceeded")
                break

            if is_audio_frame:
                await self.live_session.send_realtime_input(
                    audio=types.Blob(
                        data=message["bytes"],
                        mime_type="audio/pcm;rate=16000",
                    )
                )
                continue

            text_payload = message.get("text")
            if not text_payload:
                continue

            try:
                msg = json.loads(text_payload)
            except json.JSONDecodeError:
                continue

            if "client_content" in msg:
                asyncio.create_task(self._process_telemetry(msg))
                continue

            msg_type = msg.get("type")

            if msg_type == "image":
                try:
                    data_bytes = base64.b64decode(msg.get("data", ""))
                except Exception:
                    continue
                await self.live_session.send_realtime_input(
                    video=types.Blob(
                        data=data_bytes,
                        mime_type="image/jpeg",
                    )
                )
                continue

            if msg_type in {"context_text", "text"}:
                text = msg.get("text") or msg.get("data") or ""
                if text:
                    await self._send_text_to_zen_master(
                        text=text,
                        turn_complete=bool(msg.get("turn_complete", False)),
                    )
                continue

    async def _process_telemetry(self, msg: dict):
        try:
            parts = msg.get("client_content", {}).get("turn", {}).get("parts", [])
            telemetry_text = " ".join(
                part.get("text", "") for part in parts if isinstance(part, dict)
            ).strip()
            if not telemetry_text:
                return

            logger.info(f"[Guardian] Evaluating telemetry: {telemetry_text[:160]}")
            decision = await evaluate_telemetry(telemetry_text)
            requires_interruption = bool(decision.get("requires_interruption"))
            injection = str(decision.get("suggested_context_injection") or "").strip()

            if requires_interruption and injection:
                logger.warning("[Guardian] Intervention required, injecting context.")
                await self._send_text_to_zen_master(injection)
            else:
                await self._send_text_to_zen_master(telemetry_text)
        except Exception as exc:
            logger.warning(f"[Guardian] Evaluation failed: {exc}")

    async def _send_text_to_zen_master(self, text: str, turn_complete: bool = False):
        if not text:
            return

        content = types.Content(parts=[types.Part(text=text)])

        if hasattr(self.live_session, "send_client_content"):
            try:
                await self.live_session.send_client_content(
                    turns=[content],
                    turn_complete=turn_complete,
                )
            except TypeError:
                await self.live_session.send_client_content(turns=[content])
            return

        await self.live_session.send_realtime_input(text=text)

    async def _respond_to_tool_calls(self, function_calls: list[Any]):
        if not function_calls or self.on_tool_call is None:
            return

        function_responses: list[types.FunctionResponse] = []
        for function_call in function_calls:
            result = await self.on_tool_call(function_call)
            function_responses.append(
                types.FunctionResponse(
                    id=getattr(function_call, "id", ""),
                    name=getattr(function_call, "name", ""),
                    response=result,
                )
            )

        if function_responses:
            await self.live_session.send_tool_response(
                function_responses=function_responses
            )

    async def _handle_gemini_responses(self):
        try:
            while True:
                turn = self.live_session.receive()
                async for response in turn:
                    if response.server_content and response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            inline = getattr(part, "inline_data", None)
                            if inline and isinstance(getattr(inline, "data", None), bytes):
                                await self.websocket.send_bytes(inline.data)
                            elif getattr(part, "text", None):
                                await self.websocket.send_text(
                                    json.dumps({"type": "transcript", "data": part.text})
                                )

                    if response.server_content and response.server_content.turn_complete:
                        await self.websocket.send_text(json.dumps({"type": "turn_complete"}))

                    if response.server_content and response.server_content.interrupted:
                        await self.websocket.send_text(json.dumps({"type": "interrupted"}))

                    if response.tool_call and response.tool_call.function_calls:
                        await self._respond_to_tool_calls(response.tool_call.function_calls)
        except Exception as exc:
            logger.warning(f"[ZenMaster] Response loop error: {exc}")
            raise
