#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

PORT="${DEPLOY_RUN_PORT:-5000}"

# 加载环境变量（如果存在）
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs) 2>/dev/null || true
fi

echo "Starting HTTP service on port ${PORT} for deploy..."
exec pnpm run start --port "${PORT}"
