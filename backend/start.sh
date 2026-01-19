#!/bin/bash
set -e

PB_VERSION="0.25.9"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Map architecture
case "$ARCH" in
    x86_64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
esac

PB_FILE="pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_FILE}"

cd "$(dirname "$0")"

# Download PocketBase if not present
if [ ! -f "./pocketbase" ]; then
    echo "Downloading PocketBase v${PB_VERSION}..."
    curl -fsSL "$PB_URL" -o pocketbase.zip
    unzip -o pocketbase.zip pocketbase
    rm pocketbase.zip
    chmod +x pocketbase
    echo "PocketBase downloaded."
fi

# Load .env if present
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "Starting PocketBase..."
echo "Admin UI: http://localhost:8090/_/"
echo "API: http://localhost:8090/api/"

# Create superadmin on first run if credentials provided
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ] && [ ! -d "./pb_data" ]; then
    ./pocketbase superuser create "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" 2>/dev/null || true
fi

./pocketbase serve --http=0.0.0.0:8090
