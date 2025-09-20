#!/usr/bin/env bash
set -euo pipefail

# Setup local development: install deps, start mongo, install node deps
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing repository dependencies..."
npm ci

echo "Starting MongoDB in Docker (if not already running)..."
if ! docker ps --format '{{.Names}}' | grep -q '^mongo$'; then
  npm run db:up
else
  echo "MongoDB container already running"
fi

echo "Installing frontend dependencies..."
cd frontend
npm ci

echo "Setup complete. Start backend with 'npm run dev' and frontend with 'cd frontend && npm run dev'"
