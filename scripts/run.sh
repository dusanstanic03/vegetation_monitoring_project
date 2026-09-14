#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

if [ -f ".venv/Scripts/activate" ]; then
    # Windows (git-bash)
    source ".venv/Scripts/activate"
else
    # Linux/macOS
    source ".venv/bin/activate"
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo "==> Stopping servers"
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

echo "==> Starting backend on http://127.0.0.1:5000"
(cd backend && python run.py) &
BACKEND_PID=$!

echo "==> Starting frontend on http://127.0.0.1:5173"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
