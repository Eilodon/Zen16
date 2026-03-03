<div align="center">
<img width="1200" height="475" alt="Zen16 Guardian" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🧘 Zen16 Guardian — AI Zen Master

**A real-time, multimodal AI mental health companion inspired by Thích Nhất Hạnh**

*Live Agents Category — Gemini Live Agent Challenge*

[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Run-blue?logo=googlecloud)](https://cloud.google.com/run)
[![Gemini](https://img.shields.io/badge/Gemini-Live%20API-orange?logo=google)](https://ai.google.dev/gemini-api/docs/live)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 🎯 The Problem

**Mental health crisis among Gen Z in Vietnam**: 1 in 4 students experience anxiety or depression, yet cultural stigma prevents seeking help. Traditional therapy is inaccessible, expensive, and doesn't speak the cultural language of Vietnamese Buddhism that 80% of the population identifies with.

## 💡 The Solution

**Zen16 Guardian** is a real-time AI companion that users can **talk to naturally** via voice. It **sees** the user via camera (detecting stress posture, fidgeting), **speaks** calmly like a Zen Master, and applies Buddhist psychological wisdom from Thích Nhất Hạnh's teachings — all powered by **Gemini Live API** on **Google Cloud**.

### Key Features
- 🗣️ **Natural Voice Conversation** — Real-time bidi-streaming via Gemini Live API with barge-in support
- 👁️ **Vision AI** — Camera detects stress, posture, and environment (Buddhist altar detection)
- 🧠 **Quantum Consciousness Engine** — Tracks 6 dimensions of awareness + emotion analysis
- 🫧 **Immersive 3D Orb** — Three.js visualization responds to emotional state in real-time
- 🫁 **Guided Breathing** — AI triggers 4-7-8, box breathing exercises when stress detected
- 🚨 **Emergency Protocol** — Pub/Sub alerts family members when severe distress detected
- 💾 **Session Memory** — Firestore persistent memory for long-term relationship

---

## 🏗️ Architecture

```
User (React Frontend)
    ↓ WebSocket bidi-stream
Cloud Run (Python FastAPI)
    ↓ google-genai SDK Live API
Gemini 2.0 Flash Live (Audio + Vision)
    ↓ Tool Calls
├── update_zen_state → Frontend UI (Orb, Cards, Breathing)
├── trigger_emergency_alert → Pub/Sub → Family SMS/Email
└── Session Memory → Firestore
```

### Google Cloud Services Used (5+)
| Service | Usage |
|---------|-------|
| **Cloud Run** | Backend hosting (FastAPI WebSocket proxy) |
| **Vertex AI / Gemini Live API** | Real-time multimodal AI (audio + vision) |
| **Firestore** | Persistent session memory & user history |
| **Pub/Sub** | Emergency alert event bus |
| **Cloud Storage** | Audio history archival |
| **Cloud Build** | Automated deployment (IaC) |

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- Python 3.12+
- Google Cloud SDK (`gcloud`)
- A GCP project with billing enabled

### Frontend (Local Dev)

```bash
# Install dependencies
npm install

# Set backend URL (after deploying, or use localhost)
echo "VITE_BACKEND_URL=ws://localhost:8080" > .env.local

# Run
npm run dev
```

### Backend (Local Dev)

```bash
cd backend

# Install Python deps
pip install -r requirements.txt

# Set API key for local dev
export GEMINI_API_KEY="your-api-key"

# Run
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Deploy to Cloud Run

```bash
# Set your GCP project
export GOOGLE_CLOUD_PROJECT="your-project-id"

# One-command deploy
chmod +x deploy.sh
./deploy.sh
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Three.js (3D Orb), Tone.js (Ambient Audio) |
| Backend | Python 3.12, FastAPI, google-genai SDK |
| AI Model | Gemini 2.0 Flash Live (native audio + vision) |
| Database | Cloud Firestore (session memory) |
| Events | Cloud Pub/Sub (emergency alerts) |
| Storage | Cloud Storage (audio history) |
| Hosting | Cloud Run (containerized) |
| Auth | Application Default Credentials (ADC) |

---

## 📂 Project Structure

```
Zen16/
├── backend/
│   ├── main.py           # FastAPI + Gemini Live API proxy
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Cloud Run container
├── services/
│   └── liveAgent.ts      # WebSocket client (bidi-stream)
├── components/
│   ├── OrbViz.tsx        # Three.js 3D consciousness orb
│   ├── BreathingCircle.tsx
│   ├── EmergencyProtocol.tsx
│   └── ...
├── deploy.sh             # Automated Cloud Run deployment
├── App.tsx               # Main application
└── README.md
```

---

## 🏅 Hackathon Submission

- **Category**: Live Agents
- **Mandatory Tech**: ✅ Gemini Live API, ✅ google-genai SDK, ✅ Google Cloud (Cloud Run)
- **Content**: #GeminiLiveAgentChallenge

---

*Built with ❤️ for the Gemini Live Agent Challenge 2026*
