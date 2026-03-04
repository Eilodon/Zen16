#!/bin/bash
# ─── Zen16 Guardian — Automated Cloud Deployment ──────────────
# Infrastructure-as-Code: Cloud Run deploy with Dockerfile
# Bonus points: +0.2 for automated deployment

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-zen16-guardian}"
REGION="${GOOGLE_CLOUD_LOCATION:-asia-southeast1}"
SERVICE_NAME="zen16-guardian"
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-false}"
WS_AUTH_MODE="${WS_AUTH_MODE:-required}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
WS_JWT_AUDIENCE="${WS_JWT_AUDIENCE:-zen16-live}"
WS_JWT_SECRET="${WS_JWT_SECRET:-}"
WS_TOKEN_TTL_SECONDS="${WS_TOKEN_TTL_SECONDS:-900}"
AUTH_PROVIDER="${AUTH_PROVIDER:-firebase}"
REDIS_URL="${REDIS_URL:-}"
FIREBASE_CHECK_REVOKED="${FIREBASE_CHECK_REVOKED:-false}"
FIREBASE_SERVICE_ACCOUNT_FILE="${FIREBASE_SERVICE_ACCOUNT_FILE:-}"

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

echo "🚀 Deploying Zen16 Guardian Backend to Cloud Run..."
echo "   Project: $PROJECT_ID"
echo "   Region:  $REGION"
echo ""

# Step 1: Build & Deploy via Cloud Build + Cloud Run (source deploy)
gcloud run deploy "$SERVICE_NAME" \
  --source ./backend \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  "$AUTH_FLAG" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,WS_AUTH_MODE=$WS_AUTH_MODE,ALLOWED_ORIGINS=$ALLOWED_ORIGINS,WS_JWT_AUDIENCE=$WS_JWT_AUDIENCE,WS_JWT_SECRET=$WS_JWT_SECRET,WS_TOKEN_TTL_SECONDS=$WS_TOKEN_TTL_SECONDS,AUTH_PROVIDER=$AUTH_PROVIDER,FIREBASE_CHECK_REVOKED=$FIREBASE_CHECK_REVOKED,FIREBASE_SERVICE_ACCOUNT_FILE=$FIREBASE_SERVICE_ACCOUNT_FILE,REDIS_URL=$REDIS_URL"

echo ""
echo "✅ Deployment complete!"
echo ""

# Step 2: Get URL
URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format 'value(status.url)')

echo "🌐 Backend URL: $URL"
echo "🔌 WebSocket:   ${URL/https/wss}/live"
echo ""
echo "📝 Update VITE_BACKEND_URL in your .env:"
echo "   VITE_BACKEND_URL=$URL"
