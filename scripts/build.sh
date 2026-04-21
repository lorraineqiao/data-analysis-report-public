#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies..."
npm install

echo "Building the Next.js project..."
npm run build

echo "Build completed successfully!"
