#!/bin/bash
# ─── Zen16 Guardian — Automated Cloud Deployment ──────────────
# Infrastructure-as-Code: Cloud Run deploy with Dockerfile
# Bonus points: +0.2 for automated deployment

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-zen16-guardian}"
REGION="${GOOGLE_CLOUD_LOCATION:-asia-southeast1}"
SERVICE_NAME="zen16-guardian"

echo "🚀 Deploying Zen16 Guardian Backend to Cloud Run..."
echo "   Project: $PROJECT_ID"
echo "   Region:  $REGION"
echo ""

# Step 1: Build & Deploy via Cloud Build + Cloud Run (source deploy)
gcloud run deploy "$SERVICE_NAME" \
  --source ./backend \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION"

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
