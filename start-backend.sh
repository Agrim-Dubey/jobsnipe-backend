#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo "Missing .env in $ROOT_DIR"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source ".env"
set +a

if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  VENV_DIR="$ROOT_DIR/.venv"
elif [[ -x "$ROOT_DIR/venv/bin/python" ]]; then
  VENV_DIR="$ROOT_DIR/venv"
else
  VENV_DIR="$ROOT_DIR/.venv"
  echo "Creating virtual environment at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

PYTHON_BIN="$VENV_DIR/bin/python"
REQ_FILE="$ROOT_DIR/fastapi_app/requirements.txt"
STAMP_FILE="$VENV_DIR/.jobsnipe_backend_requirements"

if ! "$PYTHON_BIN" -c "import uvicorn, fastapi, sqlalchemy, alembic" >/dev/null 2>&1 || [[ ! -f "$STAMP_FILE" ]] || [[ "$REQ_FILE" -nt "$STAMP_FILE" ]]; then
  echo "Installing backend dependencies..."
  "$PYTHON_BIN" -m pip install --upgrade pip
  "$PYTHON_BIN" -m pip install -r "$REQ_FILE"
  touch "$STAMP_FILE"
fi

if command -v lsof >/dev/null 2>&1 && lsof -ti tcp:8000 >/dev/null 2>&1; then
  echo "Port 8000 is already in use. Stop the existing process first."
  exit 1
fi

echo "Starting PostgreSQL container..."
docker compose up -d database >/dev/null

echo -n "Waiting for database"
for _ in $(seq 1 45); do
  if docker compose exec -T database pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    echo " ready"
    break
  fi
  echo -n "."
  sleep 1
done

if ! docker compose exec -T database pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
  echo
  echo "Database did not become ready."
  exit 1
fi

echo "Running migrations..."
"$PYTHON_BIN" -m alembic upgrade head

echo "Starting backend at http://localhost:8000"
exec "$PYTHON_BIN" -m uvicorn fastapi_app.main:app --reload --host 0.0.0.0 --port 8000
