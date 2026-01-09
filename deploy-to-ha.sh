#!/bin/bash
# Deploy to Home Assistant for testing

set -e

# Configuration
HA_HOST="${HA_HOST:-homeassistant.local}"
HA_PATH="/addons/local/conf-edit-ha"

echo "🔨 Building frontend..."
cd frontend && npm run build && cd ..

echo "📦 Preparing files..."
# Create temporary directory
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Copy necessary files
cp -r static app.py requirements.txt config.yaml build.yaml Dockerfile README.md DOCS.md "$TMP_DIR/" 2>/dev/null || true

echo "🚀 Deploying to $HA_HOST..."
ssh root@$HA_HOST "mkdir -p $HA_PATH"
rsync -av --delete "$TMP_DIR/" root@$HA_HOST:$HA_PATH/

echo "✅ Deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Go to Settings > Add-ons in Home Assistant"
echo "2. Click 'Check for updates' (bottom right)"
echo "3. Find 'Configuration Editor' in Local add-ons"
echo "4. Install and start the add-on"
