#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting backend (http://localhost:3000) and frontend (http://localhost:5173)..."
npx concurrently \
  "npm run dev --workspace=server" \
  "npm run dev --workspace=client"
