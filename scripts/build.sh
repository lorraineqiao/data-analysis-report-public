#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies..."
pnpm install

echo "Building the Next.js project..."
pnpm run build

echo "Build completed successfully!"
