#!/usr/bin/env bash
# Railway deployment script with proper status checking
# No arbitrary sleep timers - polls for actual deployment status

set -e

echo "🚀 Starting Railway deployment..."

# Trigger deployment and capture output
DEPLOY_OUTPUT=$(railway up 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract deployment ID from the build logs URL
DEPLOY_ID=$(echo "$DEPLOY_OUTPUT" | grep -o 'id=[^&]*' | head -1 | cut -d'=' -f2)

if [ -z "$DEPLOY_ID" ]; then
    echo "❌ Failed to extract deployment ID from output"
    exit 1
fi

echo "📦 Deployment ID: $DEPLOY_ID"
echo "⏳ Waiting for deployment to complete..."

# Poll for deployment status
MAX_ATTEMPTS=60  # 5 minutes max (60 * 5 seconds)
ATTEMPT=0
DEPLOYMENT_STATUS="unknown"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Get deployment status via Railway CLI
    # This will show the latest deployment status
    STATUS_OUTPUT=$(railway status 2>&1 || true)

    # Check if deployment succeeded (look for "Deployed" or "Active" status)
    if echo "$STATUS_OUTPUT" | grep -qi "deployed\|active\|success"; then
        DEPLOYMENT_STATUS="success"
        break
    fi

    # Check if deployment failed
    if echo "$STATUS_OUTPUT" | grep -qi "failed\|error\|crashed"; then
        DEPLOYMENT_STATUS="failed"
        break
    fi

    # Still building/deploying
    ATTEMPT=$((ATTEMPT + 1))
    echo "   Checking status... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DEPLOYMENT_STATUS" = "success" ]; then
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📋 Recent logs:"
    railway logs 2>&1 | tail -50
    exit 0
elif [ "$DEPLOYMENT_STATUS" = "failed" ]; then
    echo "❌ Deployment failed!"
    echo ""
    echo "📋 Error logs:"
    railway logs 2>&1 | tail -100
    exit 1
else
    echo "⚠️  Deployment status unknown (timeout after 5 minutes)"
    echo ""
    echo "📋 Recent logs:"
    railway logs 2>&1 | tail -50
    exit 1
fi
