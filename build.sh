#!/usr/bin/env bash
set -e

echo "Building Configuration Editor Add-on..."

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete!"
echo "Frontend output: static/"
echo ""
echo "To test locally:"
echo "  1. cd frontend && npm run dev (for frontend development)"
echo "  2. python3 app.py (for backend testing)"
echo ""
echo "To build Docker image:"
echo "  docker build -t conf-edit-ha ."
