#!/bin/bash
set -e

if [ -z "$E2E_DATABASE_URL" ]; then
  echo "Refusing to run e2e against DATABASE_URL." >&2
  echo "Set E2E_DATABASE_URL to an isolated test database before running Playwright." >&2
  echo "Example: E2E_DATABASE_URL=\"postgresql://jobprep:jobprep@127.0.0.1:5432/jobprep?schema=e2e\" npm run test:e2e" >&2
  exit 1
fi

export DATABASE_URL="$E2E_DATABASE_URL"
export ALLOW_DEMO_SEED=1
export PORT="${E2E_API_PORT:-3002}"
export VITE_PORT="${E2E_WEB_PORT:-5175}"
export VITE_API_PROXY_TARGET="http://127.0.0.1:${PORT}"
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:${VITE_PORT}"

npx prisma db push --skip-generate
npm run db:seed
playwright test
