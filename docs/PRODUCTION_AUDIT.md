# 🔍 Zen16 Production Audit Report

**Date:** 2026-03-05 | **Branch:** `deploy-ready-pass` | **Commit:** `20934ca`

---

## ✅ Verification Results

| Check | Status | Detail |
|---|---|---|
| Python backend imports | ✅ Pass | `main.py` → `orchestrator.py` → `agents/*` all resolve |
| TypeScript compile (`tsc --noEmit`) | ✅ Pass | Zero type errors |
| Vite production build | ✅ Pass | Built in 9.33s, all chunks emitted |
| Secrets not tracked in git | ✅ Pass | `.env`, `*firebase-adminsdk*.json` excluded by `.gitignore` |
| Firebase SA key not committed | ✅ Pass | `git ls-files` confirms key file not tracked |
| ADK imports (`google.adk`) | ✅ Pass | `LlmAgent`, `InMemoryRunner` resolve correctly |

---

## 🚨 CRITICAL Issues (Must Fix Before Deploy)

### C1. Dockerfile Import Path Mismatch — **Will Crash on Cloud Run**

The root [Dockerfile](file:///media/ybao/DATA1/b1/Zen16-main/Dockerfile) launches uvicorn with `backend.main:app` (line 27), which means Python resolves imports as `backend.orchestrator`, `backend.agents.zen_master`, etc.

But [orchestrator.py](file:///media/ybao/DATA1/b1/Zen16-main/backend/orchestrator.py) and [main.py](file:///media/ybao/DATA1/b1/Zen16-main/backend/main.py) use **relative** imports (`from orchestrator import ...`, `from agents.guardian import ...`).

> [!CAUTION]
> When the root Dockerfile runs `uvicorn backend.main:app`, the imports like `from orchestrator import CognitiveOrchestrator` will **fail** because Python's working dir is `/app`, not `/app/backend`.
>
> The `try/except ImportError` fallback pattern handles this partially, but the `backend/Dockerfile` uses `uvicorn main:app` (correct) while the root Dockerfile uses `uvicorn backend.main:app` (broken path context).
>
> **Fix:** Either use `backend/Dockerfile` exclusively for Cloud Run, OR change root Dockerfile to `WORKDIR /app/backend` + `CMD ["uvicorn", "main:app", ...]`.

### C2. `__pycache__` Committed to Git

```
backend/agents/__pycache__/guardian.cpython-312.pyc
backend/agents/__pycache__/zen_master.cpython-312.pyc
```

These were accidentally committed in commit `6d941da`. They must be removed and `.gitignore` should cover `**/__pycache__/`.

---

## ⚠️ P1 Issues (Should Fix)

### P1-1. Root Dockerfile Uses Python 3.11, Backend Dockerfile Uses 3.12

- [Dockerfile](file:///media/ybao/DATA1/b1/Zen16-main/Dockerfile) → `python:3.11-slim`
- [backend/Dockerfile](file:///media/ybao/DATA1/b1/Zen16-main/backend/Dockerfile) → `python:3.12-slim`

Should be unified to **3.12** (matching the venv used for development).

### P1-2. `vendor-three` Chunk is 841 KB (gzipped 226 KB)

Three.js is the largest dependency. If OrbViz is only used on the main screen, this is likely already lazy-loaded. But verify that `OrbViz.tsx` is dynamically imported via `React.lazy()`.

### P1-3. Health Endpoint Exposes Rate-Limit Configuration

The `GET /` endpoint returns the full rate-limit config (`max_connections_per_ip`, `max_bytes_per_minute`, etc). In production, attackers can use this to calibrate abuse to stay just under limits.

**Fix:** Return a minimal health response in production, or gate the detailed info behind authentication.

### P1-4. `session_deadline` in `main.py` Line 690 Is Unused

After refactoring to `CognitiveOrchestrator`, the `session_deadline` variable at line 690 is no longer used — the Orchestrator manages its own deadline internally. Dead code should be removed.

---

## 📋 P2 Issues (Nice to Fix)

### P2-1. Guardian Agent Creates a New Session Per Evaluation

In [guardian.py](file:///media/ybao/DATA1/b1/Zen16-main/backend/agents/guardian.py) line 53, each `evaluate_telemetry()` call creates a brand-new `InMemoryRunner` session. For high-frequency telemetry (every 10s), this creates accumulating session objects in memory.

**Recommendation:** Reuse a single session per WebSocket connection, or add TTL-based cleanup.

### P2-2. `decodeBase64ToFloat32` Is Dead Code

In [liveAgent.ts](file:///media/ybao/DATA1/b1/Zen16-main/services/liveAgent.ts) line 623, `decodeBase64ToFloat32()` is defined but never called (the binary path uses `decodeInt16ToFloat32`). Can be safely removed.

### P2-3. FaceLandmarker CDN Hardcoded Version

[liveAgent.ts](file:///media/ybao/DATA1/b1/Zen16-main/services/liveAgent.ts) line 369 hardcodes `@mediapipe/tasks-vision@0.10.3`. Consider pinning to `package.json` or at least matching the installed version.

### P2-4. `cloudbuild.yaml` Has Placeholder Origins

[cloudbuild.yaml](file:///media/ybao/DATA1/b1/Zen16-main/cloudbuild.yaml) line 20 has `_ALLOWED_ORIGINS: 'https://your-frontend-domain.com'`. This must be updated to the actual domain before production deploy.

---

## 🛡️ Security Audit Summary

| Category | Status | Notes |
|---|---|---|
| JWT verification (HMAC-SHA256) | ✅ Solid | Timing-safe comparison via `hmac.compare_digest` |
| Token expiration (`exp`, `nbf`) | ✅ Solid | Verified in `_verify_ws_token` |
| Firebase ID token verification | ✅ Solid | Uses `firebase_admin.auth.verify_id_token` |
| CORS | ✅ Configured | Origins from env var, default localhost only |
| Origin check on WebSocket | ✅ Solid | Checked before `accept()` |
| Rate limiting (per-IP) | ✅ Solid | Redis + local fallback, separate Audio/Control/Byte budgets |
| Per-IP connection limit | ✅ Solid | Redis + local fallback with cleanup |
| Frame size limit | ✅ Solid | `MAX_WS_FRAME_BYTES` = 1MB |
| Session timeout | ✅ Solid | `MAX_SESSION_SECONDS` = 30 min |
| Auth request rate limit | ✅ Solid | 30/min per IP |

---

## 🏛️ Architecture Quality

| Aspect | Grade | Notes |
|---|---|---|
| ADK Multi-Agent separation | 🟢 A | Clean Guardian → ZenMaster pipeline with proactive barge-in |
| Tool execution pipeline | 🟢 A | Proper `FunctionResponse` round-trip with Firestore persistence |
| Frontend reconnection logic | 🟢 A | Exponential backoff + jitter, network offline detection, max 5 retries |
| Audio pipeline | 🟢 A | VAD → downsample → PCM binary, scheduled playback with barge-in |
| WebSocket auth flow | 🟢 A | Auto-detect backend requirement + Firebase ID token → WS JWT exchange |
| Error boundaries | 🟡 B | Missing top-level React ErrorBoundary wrapping around the audio pipeline |

---

## 📝 Recommended Actions (Priority Order)

1. **Fix root Dockerfile** import paths (C1) — **blocks Cloud Run deploy**
2. **Remove `__pycache__`** from git history (C2)
3. **Unify Python version** to 3.12 across both Dockerfiles (P1-1)
4. **Strip health endpoint** details in production (P1-3)
5. Remove dead `session_deadline` variable (P1-4)
6. Clean up dead `decodeBase64ToFloat32` code (P2-2)
