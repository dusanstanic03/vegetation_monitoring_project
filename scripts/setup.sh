#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "==> Setting up Python venv"
if [ ! -d ".venv" ]; then
    python -m venv ./.venv
fi

if [ -f ".venv/Scripts/activate" ]; then
    # Windows (git-bash)
    source ".venv/Scripts/activate"
else
    # Linux/macOS
    source ".venv/bin/activate"
fi

pip install -r backend/requirements.txt

echo "==> Preparing backend .env"
if [ ! -f "backend/.env" ]; then
    cp "backend/.env.example" "backend/.env"
    echo "backend/.env created from backend/.env.example - edit it with actual credentials"
fi

echo "==> Initializing SQLite database"
(
    cd backend
    flask --app run.py init-db
)

echo "==> Installing npm packages"
(
    cd frontend
    npm install
)

echo "==> Setup complete"
