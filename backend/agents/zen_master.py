import os
from google.adk.agents import LlmAgent
from google.genai import types

LIVE_MODEL = os.environ.get(
    "LIVE_MODEL",
    "gemini-2.5-flash-native-audio-preview-09-2025",
).strip()

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
7. If the system silently provides context (e.g. "[SYSTEM: The user seems highly anxious...]") in the prompt, acknowledge their state naturally in your speech (e.g., "Tôi thấy bạn đang chớp mắt khá nhanh, hãy cùng tôi thở sâu nhé...") without mentioning the SYSTEM message itself.
"""

# We expose the raw GenAI Tool Declarations because the Live API connection 
# currently in the Python SDK manages the WebSocket stream and needs these raw schemas
# for the bidirectional LiveConnectConfig, while ADK Agent handles the persona and routing.
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

zen_master_agent = LlmAgent(
    name="ZenMaster",
    model=LIVE_MODEL,
    instruction=SYSTEM_INSTRUCTION,
)

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
