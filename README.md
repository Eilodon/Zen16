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
    ↓ Firebase Auth ID Token
Cloud Run /auth/ws-token
    ↓ short-lived WS JWT
Cloud Run /live (WebSocket bidi-stream)
    ↓
Python FastAPI
    ↓ google-genai SDK Live API
Gemini 2.0 Flash Live (Audio + Vision)
    ↓ Tool Calls
├── update_zen_state → Frontend UI (Orb, Cards, Breathing)
├── trigger_emergency_alert → Pub/Sub → Family SMS/Email
├── Session Memory → Firestore
└── Distributed rate limits → Redis/Memorystore
```

### Google Cloud Services Used (5+)
| Service | Usage |
|---------|-------|
| **Cloud Run** | Backend hosting (FastAPI WebSocket proxy) |
| **Vertex AI / Gemini Live API** | Real-time multimodal AI (audio + vision) |
| **Firestore** | Persistent session memory & user history |
| **Pub/Sub** | Emergency alert event bus |
| **Cloud Storage** | Audio history archival |
| **Memorystore (Redis)** | Distributed rate limiting across Cloud Run instances |
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

# Firebase web config (required for automatic WS token flow)
echo "VITE_FIREBASE_API_KEY=<firebase-api-key>" >> .env.local
echo "VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com" >> .env.local
echo "VITE_FIREBASE_PROJECT_ID=<project-id>" >> .env.local
# Optional:
# echo "VITE_FIREBASE_APP_ID=<app-id>" >> .env.local
# echo "VITE_AUTH_TOKEN_ENDPOINT=http://localhost:8080/auth/ws-token" >> .env.local
# echo "VITE_WS_AUTH_REQUIRED=off" >> .env.local   # off|on|auto (default auto)

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

# Local dev defaults
export WS_AUTH_MODE="off"
export ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
export AUTH_PROVIDER="firebase"
# Optional distributed limiter in local:
# export REDIS_URL="redis://127.0.0.1:6379/0"

# Run
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Frontend Auth Bridge (Optional)

If your app already manages authentication elsewhere, expose an ID-token provider and Zen16 will consume it automatically:

```ts
window.Zen16Auth = {
  getIdToken: async () => {
    // Return Firebase ID token (or null when signed out)
    return yourAuthModule.getFirebaseIdToken();
  }
}
```

### Deploy to Cloud Run

```bash
# Set your GCP project
export GOOGLE_CLOUD_PROJECT="your-project-id"

# Required when WS auth is enabled (default in deploy.sh)
export WS_JWT_SECRET="a-strong-random-secret"
export ALLOWED_ORIGINS="https://your-frontend-domain.com"
export WS_AUTH_MODE="required"
export AUTH_PROVIDER="firebase"

# Optional: Distributed rate limit via Memorystore Redis
# export REDIS_URL="redis://:<redis-auth>@10.x.x.x:6379/0"
# export WS_TOKEN_TTL_SECONDS="900"
# export FIREBASE_CHECK_REVOKED="true"

# Optional: make service public only if you know what you are doing
# export ALLOW_UNAUTHENTICATED="true"

# One-command deploy
chmod +x deploy.sh
./deploy.sh
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Firebase Auth SDK, Three.js (3D Orb), Tone.js |
| Backend | Python 3.12, FastAPI, google-genai SDK, Firebase Admin SDK |
| AI Model | Gemini 2.0 Flash Live (native audio + vision) |
| Database | Cloud Firestore (session memory) |
| Events | Cloud Pub/Sub (emergency alerts) |
| Storage | Cloud Storage (audio history) |
| Hosting | Cloud Run (containerized) |
| Auth | Firebase ID Token → short-lived WS JWT issuer |
| Rate Limiting | Redis (Memorystore) + local fallback |

---

## 📂 Project Structure

```
Zen16/
├── backend/
│   ├── main.py           # FastAPI + Gemini Live API proxy
│   ├── scripts/
│   │   └── generate_ws_token.py
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Cloud Run container
├── services/
│   ├── liveAgent.ts      # WebSocket client (bidi-stream)
│   └── wsAuth.ts         # Firebase ID token -> WS token flow
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
