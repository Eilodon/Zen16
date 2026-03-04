"""
Guardian Agent — watches Vision/Telemetry telemetry sent from the frontend
and decides when to fire a proactive intervention into the ZenMaster stream.
"""

import json
import logging
from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.genai import types as genai_types

logger = logging.getLogger("zen16.guardian")

GUARDIAN_MODEL = "gemini-2.0-flash-lite"

GUARDIAN_INSTRUCTIONS = """
You are the Guardian. You silently observe the physical telemetry of the user
(e.g. eye blink rate, head posture) while they speak to the Zen Master.
Your goal is to detect signs of high cognitive load, stress, distraction, or sadness.

Given the following telemetry JSON, respond with a JSON object containing:
{
  "requires_interruption": true | false,
  "suggested_context_injection": "<string>"
}

Rules:
- If blinkRate > 25 bpm, lookingDown is true, or stressLevel > 0.7 → requires_interruption: true
  and provide a short compassionate instruction for the Zen Master in suggested_context_injection,
  e.g. "[SYSTEM: The user seems highly anxious right now based on rapid blinking. Please pause the current topic and gently guide them to breathe.]"
- Otherwise → requires_interruption: false, suggested_context_injection: ""
- Only output the JSON object, nothing else.
"""

_guardian_agent = LlmAgent(
    name="guardian_agent",
    model=GUARDIAN_MODEL,
    instruction=GUARDIAN_INSTRUCTIONS,
)

_guardian_runner = InMemoryRunner(
    app_name="zen16_guardian",
    agent=_guardian_agent,
)

async def evaluate_telemetry(telemetry_text: str) -> dict:
    """
    Send telemetry data to the GuardianAgent and parse its response.
    Returns a dict like: {requires_interruption: bool, suggested_context_injection: str}
    """
    try:
        session_svc = _guardian_runner.session_service
        session = await session_svc.create_session(
            app_name="zen16_guardian",
            user_id="guardian_eval",
        )

        result_text = ""
        async for event in _guardian_runner.run_async(
            user_id="guardian_eval",
            session_id=session.id,
            new_message=genai_types.Content(
                role="user",
                parts=[genai_types.Part(text=telemetry_text)],
            ),
        ):
            if hasattr(event, "content") and event.content:
                for part in event.content.parts:
                    if hasattr(part, "text") and part.text:
                        result_text += part.text

        result_text = result_text.strip()
        # Strip markdown code blocks if present
        if result_text.startswith("```"):
            result_text = "\n".join(result_text.split("\n")[1:])
            result_text = result_text.replace("```", "").strip()

        parsed = json.loads(result_text)
        return {
            "requires_interruption": bool(parsed.get("requires_interruption", False)),
            "suggested_context_injection": str(parsed.get("suggested_context_injection", "")),
        }
    except Exception as e:
        logger.warning(f"[Guardian] Evaluation failed: {e}")
        return {"requires_interruption": False, "suggested_context_injection": ""}
