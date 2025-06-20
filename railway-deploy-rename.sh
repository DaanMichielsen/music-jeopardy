#!/bin/bash
echo "=== Railway Build Script with File Rename ==="

# Temporarily rename pnpm workspace files
if [ -f "pnpm-workspace.yaml" ]; then
    echo "Renaming pnpm-workspace.yaml to avoid conflicts..."
    mv pnpm-workspace.yaml pnpm-workspace.yaml.backup
fi

if [ -f "pnpm-lock.yaml" ]; then
    echo "Renaming pnpm-lock.yaml to avoid conflicts..."
    mv pnpm-lock.yaml pnpm-lock.yaml.backup
fi

# Install dependencies in websocket-server
echo "Installing dependencies in websocket-server..."
cd websocket-server
npm install --only=production
echo "Build complete!" 