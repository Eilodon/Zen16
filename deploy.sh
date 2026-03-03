#!/bin/bash
# Deployment script for Zen16 Guardian Backend on Cloud Run
echo "Deploying Zen16 Guardian Backend..."
gcloud run deploy zen16-guardian \
  --source ./backend \
  --allow-unauthenticated \
  --region asia-southeast1 \
  --project $GOOGLE_CLOUD_PROJECT

echo "Deployment complete."
