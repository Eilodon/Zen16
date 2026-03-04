# Gemini Live Agent Challenge Playbook

## 1) Submission Guardrails
- Build in contest period only. Keep commit history clean and attributable.
- Include a public GitHub repository.
- Provide a complete setup guide and deployed URL.
- Submit a video up to 3 minutes demonstrating the live flow end-to-end.

## 2) 3-Minute Demo Script
1. Problem and user context (15s): youth stress, stigma, need culturally grounded support.
2. Live interaction (60s): natural voice turn-taking, interruption/barge-in, real-time visual response.
3. Crisis handling (35s): emergency protocol + hotline path with safety disclaimer.
4. Technical proof (45s): Gemini Live session, Cloud Run, Redis limiter, auth flow, Pub/Sub alert.
5. Measured quality (25s): show TTFB, reconnect success, auth failure rate, vision frame delivery.

## 3) Judge-Facing Evidence Checklist
- Live API usage proof:
  - Gemini Live config and bidi stream in backend.
- Cloud hosting proof:
  - Cloud Run deployed endpoint and health output.
- Security proof:
  - JWT issuer endpoint and auth-required websocket flow.
- Scale/abuse resilience proof:
  - Distributed Redis limiter and auth endpoint rate limit.
- UX quality proof:
  - In-app realtime metrics panel with objective values.

## 4) Bonus Point Strategy
- Open-source contribution: extract and publish one reusable module from the project.
- Multi-agent design: use a sidecar text agent for emotion/safety summarization from transcripts.
- External integration: hotline and crisis routing provider by locale.

## 5) Final Dry-Run Checklist
- `npm run build` and backend compile pass.
- Language switch checked across onboarding, emergency, and settings.
- Camera permission granted and visual frames are sent in live session.
- Voice interruption and reconnect tested on unstable network.
- Video recorded with architecture + metrics overlays visible.
