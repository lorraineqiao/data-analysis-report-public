#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

# 加载环境变量
export $(cat "${COZE_WORKSPACE_PATH}/.env.local" | grep -v '^#' | xargs) 2>/dev/null || true

start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    PORT=${DEPLOY_RUN_PORT} LARK_APP_ID="${LARK_APP_ID}" LARK_APP_SECRET="${LARK_APP_SECRET}" LARK_TABLE_TOKEN="${LARK_TABLE_TOKEN}" node dist/server.js
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service
