#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "Creating clean checkout in $TEMP_DIR"
git -C "$ROOT_DIR" archive HEAD | tar -x -C "$TEMP_DIR"
cd "$TEMP_DIR"

echo "Installing dependencies from lockfile"
pnpm install --frozen-lockfile

echo "Bootstrapping database and environment"
pnpm run setup

echo "Running tests with coverage"
pnpm test:coverage
echo "Building production bundle"
pnpm build

echo "Fresh-clone verification passed."
