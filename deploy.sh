#!/bin/bash
# ─── Zen16 Guardian — Cloud Run Source Deploy (Backend only) ───

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-zen16-guardian}"
REGION="${GOOGLE_CLOUD_LOCATION:-asia-southeast1}"
SERVICE_NAME="${SERVICE_NAME:-zen16-guardian}"
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-false}"

WS_AUTH_MODE="${WS_AUTH_MODE:-required}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5000,http://127.0.0.1:5000,http://localhost:5173,http://127.0.0.1:5173}"
WS_JWT_AUDIENCE="${WS_JWT_AUDIENCE:-zen16-live}"
WS_JWT_SECRET="${WS_JWT_SECRET:-}"
WS_TOKEN_TTL_SECONDS="${WS_TOKEN_TTL_SECONDS:-900}"
AUTH_PROVIDER="${AUTH_PROVIDER:-firebase}"

LIVE_MODEL="${LIVE_MODEL:-gemini-2.5-flash-native-audio-preview-09-2025}"
REDIS_URL="${REDIS_URL:-}"
REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-zen16}"
FIREBASE_CHECK_REVOKED="${FIREBASE_CHECK_REVOKED:-false}"
FIREBASE_SERVICE_ACCOUNT_FILE="${FIREBASE_SERVICE_ACCOUNT_FILE:-}"
FIREBASE_SERVICE_ACCOUNT_JSON="${FIREBASE_SERVICE_ACCOUNT_JSON:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

MAX_MESSAGES_PER_MINUTE="${MAX_MESSAGES_PER_MINUTE:-240}"
MAX_AUDIO_FRAMES_PER_MINUTE="${MAX_AUDIO_FRAMES_PER_MINUTE:-2400}"
MAX_BYTES_PER_MINUTE="${MAX_BYTES_PER_MINUTE:-5242880}"
MAX_CONNECTIONS_PER_IP="${MAX_CONNECTIONS_PER_IP:-3}"
MAX_SESSION_SECONDS="${MAX_SESSION_SECONDS:-1800}"
MAX_AUTH_REQUESTS_PER_MINUTE="${MAX_AUTH_REQUESTS_PER_MINUTE:-30}"

ALLOW_UNAUTH_LOWER="$(echo "$ALLOW_UNAUTHENTICATED" | tr '[:upper:]' '[:lower:]')"
AUTH_FLAG="--no-allow-unauthenticated"
if [[ "$ALLOW_UNAUTH_LOWER" == "true" || "$ALLOW_UNAUTH_LOWER" == "1" || "$ALLOW_UNAUTH_LOWER" == "yes" ]]; then
  AUTH_FLAG="--allow-unauthenticated"
fi

WS_AUTH_MODE_LOWER="$(echo "$WS_AUTH_MODE" | tr '[:upper:]' '[:lower:]')"
if [[ "$WS_AUTH_MODE_LOWER" != "off" && "$WS_AUTH_MODE_LOWER" != "false" && "$WS_AUTH_MODE_LOWER" != "0" ]]; then
  if [[ -z "$WS_JWT_SECRET" ]]; then
    echo "❌ WS_JWT_SECRET is required when WS_AUTH_MODE is enabled."
    echo "   Example: export WS_JWT_SECRET='a-strong-random-secret'"
    exit 1
  fi
fi

declare -a ENV_VARS=()

add_env() {
  local key="$1"
  local value="$2"
  ENV_VARS+=("${key}=${value}")
}

add_env "GOOGLE_CLOUD_PROJECT" "$PROJECT_ID"
add_env "GOOGLE_CLOUD_LOCATION" "$REGION"
add_env "WS_AUTH_MODE" "$WS_AUTH_MODE"
add_env "ALLOWED_ORIGINS" "$ALLOWED_ORIGINS"
add_env "WS_JWT_AUDIENCE" "$WS_JWT_AUDIENCE"
add_env "WS_TOKEN_TTL_SECONDS" "$WS_TOKEN_TTL_SECONDS"
add_env "AUTH_PROVIDER" "$AUTH_PROVIDER"
add_env "LIVE_MODEL" "$LIVE_MODEL"
add_env "REDIS_KEY_PREFIX" "$REDIS_KEY_PREFIX"
add_env "FIREBASE_CHECK_REVOKED" "$FIREBASE_CHECK_REVOKED"
add_env "FIREBASE_SERVICE_ACCOUNT_FILE" "$FIREBASE_SERVICE_ACCOUNT_FILE"
add_env "FIREBASE_SERVICE_ACCOUNT_JSON" "$FIREBASE_SERVICE_ACCOUNT_JSON"
add_env "MAX_MESSAGES_PER_MINUTE" "$MAX_MESSAGES_PER_MINUTE"
add_env "MAX_AUDIO_FRAMES_PER_MINUTE" "$MAX_AUDIO_FRAMES_PER_MINUTE"
add_env "MAX_BYTES_PER_MINUTE" "$MAX_BYTES_PER_MINUTE"
add_env "MAX_CONNECTIONS_PER_IP" "$MAX_CONNECTIONS_PER_IP"
add_env "MAX_SESSION_SECONDS" "$MAX_SESSION_SECONDS"
add_env "MAX_AUTH_REQUESTS_PER_MINUTE" "$MAX_AUTH_REQUESTS_PER_MINUTE"

if [[ -n "$REDIS_URL" ]]; then
  add_env "REDIS_URL" "$REDIS_URL"
fi
if [[ -n "$WS_JWT_SECRET" ]]; then
  add_env "WS_JWT_SECRET" "$WS_JWT_SECRET"
fi
if [[ -n "$GEMINI_API_KEY" ]]; then
  add_env "GEMINI_API_KEY" "$GEMINI_API_KEY"
fi

ENV_VARS_JOINED="$(IFS='|'; echo "${ENV_VARS[*]}")"

echo "🚀 Deploying Zen16 Guardian backend to Cloud Run..."
echo "   Project: $PROJECT_ID"
echo "   Region:  $REGION"
echo "   Service: $SERVICE_NAME"
echo ""

gcloud run deploy "$SERVICE_NAME" \
  --source ./backend \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  "$AUTH_FLAG" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "^|^${ENV_VARS_JOINED}"

echo ""
echo "✅ Deployment complete"
echo ""

URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format 'value(status.url)')

echo "🌐 Backend URL: $URL"
echo "🔌 WebSocket:   ${URL/https/wss}/live"
echo ""
echo "📝 Frontend env example:"
echo "   VITE_BACKEND_URL=$URL"
