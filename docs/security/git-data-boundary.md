# Git and Data Boundary

This project is safe to publish only when code, local secrets, and personal data stay separated.

## Commit Allowed
- Application source code under `src/`
- Prisma schema and migrations under `prisma/`
- `docker-compose.yml`
- `.env.example`
- Tests
- Docs, specs, and implementation plans
- Package manifests and lockfiles

## Never Commit
- `.env` or local environment override files
- `~/.codex/auth.json` or any copied Codex auth cache
- OpenAI, Codex, GitHub, database, or deployment tokens
- Real resumes, cover letters, or private portfolio drafts
- Real job application notes, company-specific interview notes, or personal schedule exports
- PostgreSQL dumps, SQLite files, uploaded files, local backups, or generated logs
- Private keys, certificates, cookies, or browser session exports

## Local-Only Paths
These paths are ignored and should be used only for private data:

```text
data/
local-data/
backups/
uploads/
private/
secrets/
```

## Codex Authentication Boundary
Codex login state must stay outside the repository.

Allowed:

```text
Node backend -> codex exec -> local Codex CLI login
```

Not allowed:

```text
Copy ~/.codex/auth.json into this repository
Expose Codex tokens to the browser
Commit access tokens or API keys
Log tokens in request/response output
```

## Pre-Push Check
Run these before making the repository public:

```bash
git status --short
git check-ignore .env
git ls-files | rg '(^|/)(\\.env|auth\\.json|secrets?|private|uploads|backups|data|local-data)|\\.(pem|key|p12|pfx|dump|sqlite|sqlite3|db|sql)$' | rg -v '^(\\.env\\.example|prisma/migrations/.+/migration\\.sql)$'
git diff --cached | rg -i 'api[_-]?key|secret|token|password|auth\\.json|sk-'
```

If any real secret was committed, revoke or rotate it before doing anything else.

## Public Repo Rule
The repository may be public only if it can be cloned, installed, and run with sample or empty data. Real personal data belongs in local ignored paths or the local PostgreSQL volume, never in Git.
