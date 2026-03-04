# Release Checklist (Deploy-Ready)

Last updated: March 4, 2026

## 1) Backend runtime blockers

- [ ] `backend/main.py` imports run in both modes:
  - package mode: `backend.main`
  - source mode: `main`
- [ ] Tool execution is non-blocking (`execute_tool_async`) and does not freeze Live stream loop.
- [ ] Firestore and Pub/Sub failures are handled gracefully (no process crash).
- [ ] `/` health endpoint returns `security` + `gcp_services` diagnostics.

## 2) Auth and abuse protection

- [ ] `/auth/ws-token` is enabled and returns short-lived WS JWT.
- [ ] WS gate enforces token when `WS_AUTH_MODE` is `required/on/auto(on Cloud Run)`.
- [ ] CORS/Origin allowlist is set with production domain in `ALLOWED_ORIGINS`.
- [ ] Rate limits are configured:
  - connection limits (`MAX_CONNECTIONS_PER_IP`)
  - control/audio/byte quotas (`MAX_*` envs)
  - issuer quota (`MAX_AUTH_REQUESTS_PER_MINUTE`)
- [ ] Distributed limiter enabled in production (`REDIS_URL` to Memorystore).

## 3) Import/package consistency

- [ ] Python package markers exist: `backend/__init__.py`, `backend/agents/__init__.py`.
- [ ] `LIVE_MODEL` is single-source from env and reused across orchestrator/agent config.
- [ ] No stale nested backend package paths (e.g. accidental `backend/backend/*`).

## 4) Deploy path unification

- [ ] Canonical deploy path is `gcloud run deploy --source ./backend`.
- [ ] `deploy.sh` and `cloudbuild.yaml` use the same source deploy path.
- [ ] Env var passing supports comma values safely (custom delimiter in `--set-env-vars`).
- [ ] Required production vars are set:
  - `WS_JWT_SECRET`
  - `ALLOWED_ORIGINS`
  - `WS_AUTH_MODE=required`
  - `AUTH_PROVIDER=firebase`

## 5) Frontend + QA gate

- [ ] `npm run build` passes.
- [ ] Permission/voice resilience checklist passes (`docs/QA_MANUAL_12_CASES.md`).
- [ ] WebSocket auth flow uses issuer endpoint (no manual `VITE_WS_TOKEN`).
- [ ] Reconnect/offline/background flows are stable on mobile.

## 6) Final release operations

- [ ] Deploy backend via `./deploy.sh` (or Cloud Build trigger).
- [ ] Update frontend env: `VITE_BACKEND_URL=https://<cloud-run-url>`.
- [ ] Publish frontend to hosting/CDN with HTTPS.
- [ ] Run production smoke tests:
  - auth login -> issue WS token
  - `/live` voice turn with transcript + audio return
  - camera scan on supported browser
  - emergency tool call path (Pub/Sub) from controlled test prompt
- [ ] Save release evidence (logs/screenshots/URLs) for judges/community.

