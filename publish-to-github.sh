#!/bin/bash
# Publish add-on to GitHub using gh CLI

set -e

USERNAME="roman-pinchuk"
REPO_NAME="conf-edit-ha"

echo "🔨 Building frontend..."
cd frontend && npm run build && cd ..

echo "✅ Frontend built"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "   Install: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 Not authenticated with GitHub"
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Update repository.yaml
cat > repository.yaml << EOL
name: Configuration Editor Repository
url: https://github.com/${USERNAME}/${REPO_NAME}
maintainer: Roman Pinchuk
EOL

echo "✅ Updated repository.yaml"
echo ""

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📝 Initializing git..."
    git init
    git branch -M main
fi

# Add and commit
echo "📦 Committing files..."
git add .
git commit -m "Add Configuration Editor add-on" || echo "Nothing new to commit"

# Create GitHub repository
echo "🚀 Creating GitHub repository..."
if gh repo view ${USERNAME}/${REPO_NAME} &> /dev/null; then
    echo "✅ Repository already exists"
else
    gh repo create ${USERNAME}/${REPO_NAME} \
        --public \
        --description "Lightweight YAML configuration editor for Home Assistant" \
        --source=. \
        --push
    echo "✅ Repository created and pushed"
fi

# Push if repository already existed
if gh repo view ${USERNAME}/${REPO_NAME} &> /dev/null; then
    if ! git remote | grep -q origin; then
        git remote add origin https://github.com/${USERNAME}/${REPO_NAME}.git
    fi
    echo "📤 Pushing to GitHub..."
    git push -u origin main
fi

echo ""
echo "✅ Done! Repository published to:"
echo "   https://github.com/${USERNAME}/${REPO_NAME}"
echo ""
echo "📋 Next steps in Home Assistant:"
echo "1. Go to Settings > Add-ons"
echo "2. Click Add-on Store (bottom right)"
echo "3. Click ⋮ menu (top right)"
echo "4. Select Repositories"
echo "5. Add: https://github.com/${USERNAME}/${REPO_NAME}"
echo "6. Find 'Configuration Editor' in the store"
echo "7. Install and start!"
