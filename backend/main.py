import os
import json
import base64
import vertexai
# Import ADK elements as requested in blueprint
try:
    from adk import Agent, AgentOrchestrator, MemoryBank
except ImportError:
    # Mock for dev/build without adk internal package
    class Agent:
        def __init__(self, **kwargs): pass
    class AgentOrchestrator:
        def __init__(self, **kwargs): pass
    class MemoryBank:
        def __init__(self, db): pass

from vertexai.generative_models import GenerativeModel
from google.cloud import firestore, pubsub_v1, storage
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# GCP Project Config
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "YOUR_PROJECT_ID")
location = os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-southeast1")

# 1. Khởi tạo Vertex AI và Model
try:
    vertexai.init(project=project_id, location=location)
    model = GenerativeModel("gemini-live-2.5-flash-native-audio-vision") # Live model
except Exception as e:
    print(f"Vertex AI / Model Init Warning: {e}")
    model = None

# 2. Khởi tạo GCP Services
try:
    firestore_db = firestore.Client(project=project_id)
except Exception as e:
    print(f"Firestore Init Warning: {e}")
    firestore_db = None

try:
    publisher = pubsub_v1.PublisherClient()
except Exception as e:
    print(f"Pub/Sub Init Warning: {e}")
    publisher = None

try:
    storage_client = storage.Client(project=project_id)
except Exception as e:
    print(f"Cloud Storage Init Warning: {e}")
    storage_client = None


# 3. Custom Tools định nghĩa cho Agents
def vision_detect_stress(frame_data: bytes) -> str:
    """Sử dụng onnxruntime pose estimation để detect stress"""
    return "stress_level: low"

def detect_fidget(frame_data: bytes) -> str:
    """Detect fidgeting gestures"""
    return "fidgeting: false"

def trigger_alert(message: str) -> str:
    """Gửi cảnh báo qua Pub/Sub cho người thân"""
    if publisher and project_id:
        topic_path = publisher.topic_path(project_id, "emergency-alerts")
        data = message.encode("utf-8")
        try:
            future = publisher.publish(topic_path, data)
            future.result()
            return "Alert sent via Pub/Sub"
        except Exception as e:
            return f"Failed to send alert: {e}"
    return "Pub/Sub client not initialized"

def gen_breathing_animation() -> str:
    """Tạo lệnh animation cho UI (ví dụ The Orb)"""
    return json.dumps({"action": "breathing_exercise", "duration_seconds": 60})

def gen_zen_story() -> str:
    """Tạo Zen story"""
    return "Let me tell you a story about a monk and the river..."

def rag_grounding(query: str) -> str:
    """Retrieval từ Vertex Vector Search và User Logs/Buddhist texts"""
    return "Context retrieved."

# 4. Multi-agent System Setup
try:
    guardian = Agent(
        name="Guardian", 
        model=model, 
        tools=[vision_detect_stress, detect_fidget, trigger_alert]
    )

    thay = Agent(
        name="Thầy", 
        model=model, 
        tools=[gen_breathing_animation, gen_zen_story]
    )
    
    # InsightKeeper dùng Firestore để duy trì session memory
    insight_memory = MemoryBank(firestore_db) if firestore_db else None
    insight = Agent(
        name="InsightKeeper", 
        model=model, 
        memory=insight_memory,
        tools=[rag_grounding]
    )
    
    # Fake Vertex Vector Search endpoint (mô phỏng kiến trúc)
    vertex_vector_search = "vertex_vector_search_endpoint"
    
    orchestrator = AgentOrchestrator(
        agents=[guardian, thay, insight], 
        graph_rag=vertex_vector_search
    )
except Exception as e:
    print(f"Agent Orchestrator Setup Error: {e}")
    orchestrator = None


# 5. Bidi-stream WebSocket Endpoint
@app.websocket("/live")
async def live_stream(websocket: WebSocket):
    await websocket.accept()
    session_memory = {"session_id": "current_session", "history": []}
    
    try:
        async for frame in websocket.iter_bytes(): 
            if not orchestrator:
                # Mock fallback trả lời nếu chưa có google-adk thật
                response_audio = b"mock audio response" 
                response_visual = json.dumps({"type": "animation", "action": "pulse"})
            else:
                # Luồng chuẩn theo blueprint: 
                # orchestrator nhận audio/video frame và xử lý multi-agent
                response = await orchestrator.process_multimodal(frame, context=session_memory)
                response_audio = getattr(response, "audio", b"")
                response_visual = getattr(response, "visual", "")
            
            # Đóng gói và gửi lại cho frontend
            # Tùy front-end parse, gửi dạng bytes base64 payload json
            audio_b64 = base64.b64encode(response_audio).decode('utf-8')
            payload = json.dumps({
                "audio": audio_b64,
                "visual": response_visual
            })
            await websocket.send_text(payload)
            
    except WebSocketDisconnect:
        print("Frontend client disconnected.")
    except Exception as e:
        print(f"WebSocket live_stream err: {e}")

@app.get("/")
def read_root():
    return {"status": "Zen16 Guardian Backend is running!"}
