#!/bin/bash
# AI Chat Hub — Git Setup Script

set -e

echo "🚀 AI Chat Hub — Git Setup"
echo "=========================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git not installed. Install it first."
    exit 1
fi

cd "$(dirname "$0")"

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
fi

# Add all files
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Creating initial commit..."
git commit -m "feat: AI Chat Hub — multi-provider LLM interface with MCP support" || echo "Nothing to commit"

# Add remote
echo "🔗 Adding remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/podshoevbunyod16-sketch/Khirad.git

# Push
echo "⬆️  Pushing to GitHub..."
git branch -M main
git push -u origin main --force

echo ""
echo "✅ Done! Code pushed to GitHub."
echo ""
echo "📋 Next steps:"
echo "   1. Deploy backend on Render.com — see DEPLOY.md"
echo "   2. Add VITE_API_URL secret in GitHub Settings → Secrets"
echo "   3. Enable GitHub Pages in Settings → Pages → Source: GitHub Actions"
echo "   4. Wait for GitHub Action to complete"
echo "   5. Open https://podshoevbunyod16-sketch.github.io/Khirad/"
echo ""
