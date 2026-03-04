import asyncio
import base64
import json
import logging
import time
from fastapi import WebSocket
from google.genai import types

from agents.guardian import evaluate_telemetry
from agents.zen_master import get_live_config, LIVE_MODEL

logger = logging.getLogger("zen16.orchestrator")

class CognitiveOrchestrator:
    def __init__(self, websocket: WebSocket, client, session_id: str, client_ip: str, max_session_seconds: int = 300):
        self.websocket = websocket
        self.client = client
        self.session_id = session_id
        self.client_ip = client_ip
        self.session_deadline = time.monotonic() + max_session_seconds
        self.live_session = None

        # Callbacks (to be injected from main.py)
        self.on_tool_call = None
        self.track_inbound_fn = None

    async def run(self):
        """Start the multi-agent cognitive architecture loop."""
        from agents.zen_master import zen_master_agent
        logger.info(f"[Orchestrator] Starting session {self.session_id} using {LIVE_MODEL}")

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

                for t in pending:
                    t.cancel()
                for t in pending:
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass

        except Exception as e:
            logger.error(f"[Orchestrator] Error: {e}")
            await self.websocket.close(code=1011, reason="Internal Server Error")
            raise e

    async def _handle_client_messages(self):
        """Receive messages from WebSocket and route them to appropriate agents."""
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

            if raw_size > 10 * 1024 * 1024:  # 10MB sanity check
                await self.websocket.close(code=1009, reason="Frame too large")
                break

            is_audio_frame = message.get("bytes") is not None
            if self.track_inbound_fn and not await self.track_inbound_fn(
                self.client_ip,
                raw_size,
                is_audio_frame=is_audio_frame,
            ):
                await self.websocket.close(code=1008, reason="Rate limit exceeded")
                break

            if is_audio_frame:
                # Route audio directly to Zen Master
                await self.live_session.send_realtime_input(
                    audio=types.Blob(
                        data=message["bytes"],
                        mime_type="audio/pcm;rate=16000",
                    )
                )
                continue

            # Handle JSON/Text inputs
            text_payload = message.get("text")
            if not text_payload:
                continue

            try:
                msg = json.loads(text_payload)
            except json.JSONDecodeError:
                continue

            # 1. Frontend Telemetry (Blink Rate / Posture constraints)
            # Route to Guardian Agent
            if "client_content" in msg:
                asyncio.create_task(self._process_telemetry(msg))
                continue

            # 2. General commands
            msg_type = msg.get("type")
            data_b64 = msg.get("data", "")

             # Forward explicit text messages to ZenMaster
            if msg_type in {"context_text", "text"}:
                text = msg.get("text") or msg.get("data") or ""
                if text:
                    await self._send_text_to_zen_master(text)

    async def _process_telemetry(self, msg: dict):
        """Guardian Agent evaluates telemetry to decide if an intervention is needed."""
        try:
            parts = msg.get("client_content", {}).get("turn", {}).get("parts", [])
            telemetry_text = " ".join(part.get("text", "") for part in parts if isinstance(part, dict))

            if not telemetry_text:
                return

            logger.info(f"[Guardian Agent] Evaluating telemetry: {telemetry_text}")
            guardian_decision = await evaluate_telemetry(telemetry_text)

            if guardian_decision.requires_interruption and guardian_decision.suggested_context_injection:
                logger.warning(f"[Guardian Agent] INTERVENTION REQUIRED. Injecting: {guardian_decision.suggested_context_injection}")
                await self._send_text_to_zen_master(guardian_decision.suggested_context_injection)
            else:
                # Telemetry is stable, silently forward as passive context
                await self._send_text_to_zen_master(telemetry_text)
                
        except Exception as e:
            logger.error(f"[Guardian Agent] Evaluation failed: {e}")

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
        else:
            await self.live_session.send_realtime_input(text=text)

    async def _handle_gemini_responses(self):
        """Receive responses from Zen Master and forward to Frontend WebSocket."""
        try:
            async for response in self.live_session.receive():
                server_content = response.server_content
                if server_content is None:
                    continue

                if server_content.model_turn is not None:
                    for part in server_content.model_turn.parts:
                        if part.inline_data:
                            # Forward Audio from ZenMaster
                            await self.websocket.send_bytes(part.inline_data.data)

                if server_content.turn_complete:
                    await self.websocket.send_text(json.dumps({"type": "turn_complete"}))

                if server_content.interrupted:
                    await self.websocket.send_text(json.dumps({"type": "interrupted"}))

                # Tool Calls
                if server_content.model_turn is not None:
                    for part in server_content.model_turn.parts:
                        if part.executable_code or part.code_execution_result:
                            pass
                        if part.function_call:
                            # Delegate tool execution
                            if self.on_tool_call:
                                result = await self.on_tool_call(part.function_call)
                                await self.live_session.send_tool_response(
                                    function_responses=[
                                        types.FunctionResponse(
                                            name=part.function_call.name,
                                            id=part.function_call.id,
                                            response=result,
                                        )
                                    ]
                                )
        except Exception as e:
            logger.warning(f"[ZenMaster] Response loop error: {e}")
            raise e
