#!/bin/bash
echo "=== Railway Deployment Script ==="
echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

echo "=== Installing dependencies in websocket-server ==="
cd websocket-server
echo "Changed to websocket-server directory: $(pwd)"
echo "Installing with npm..."
npm install --only=production
echo "Installation complete!"

echo "=== Starting server ==="
npm start 