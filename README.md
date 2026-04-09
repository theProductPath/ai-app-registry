# AI App Registry

A centralized registry that gives organizations visibility into the applications their employees are building with AI coding tools.

**Two parts:**
1. **The Registry** — an API + web dashboard that stores app registrations, tracks builders, and surfaces metrics
2. **Registration Skills** — lightweight tool-native packages for Claude Code, Cursor, Codex, and GitHub Copilot that let any AI-built app self-register

## Quick Start (Docker Compose)

```bash
docker compose up --build
```

This starts the registry API on `http://localhost:8080` with a PostgreSQL database.

Seed the database with sample data and get your first API keys:

```bash
npm run seed
```

The seed script outputs an **admin key** and a **builder key** — save them, they can't be retrieved later.

## Quick Start (Local Dev)

```bash
# Install dependencies
npm install

# Start PostgreSQL (via Docker, or use your own)
docker compose up db -d

# Run database migrations
npm run migrate

# Seed sample data
npm run seed

# Start the API server (with hot reload)
npm run dev

# In another terminal, start the web UI dev server
cd web && npm run dev
```

The API runs on `http://localhost:8080`, the Vite dev server on `http://localhost:5173` (proxies API calls to 8080).

## Deploy to Railway

1. **Create a new project** from this repo on [Railway](https://railway.app)
2. **Add a PostgreSQL plugin** — Railway sets `DATABASE_URL` automatically
3. **Set environment variables:**

| Variable | Value |
|---|---|
| `ALLOWED_EMAIL_DOMAINS` | Your org's email domain(s), comma-separated |
| `API_KEY_SECRET` | A random secret string |
| `CORS_ORIGINS` | Your Railway app URL |
| `SKILL_STORAGE_PATH` | `/app/skills` |
| `PORT` | `8080` |

4. **Set the Dockerfile path** to `docker/Dockerfile`
5. **Run the seed** once via Railway's shell to bootstrap the database and get your admin API key:
   ```bash
   node server/dist/seed.js
   ```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Web Interface                     │
│  (Dashboard · Leaderboard · Skill Download Portal)  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  Registry API                        │
│                                                      │
│  Registration    Skill            Dashboard &        │
│  Endpoints       Distribution     Reporting          │
│  (CRUD)          Endpoints        Endpoints          │
│                                                      │
│              Data Store (PostgreSQL)                  │
└─────────────────────────────────────────────────────┘
                       ▲
         ┌─────────┬───┴───┬─────────┐
         │         │       │         │
    Claude Code  Cursor  Copilot   Codex
      Skill      Skill    Ext.    Skill
```

## API Overview

All endpoints under `/api/v1`. Authentication via `Authorization: Bearer {api-key}`.

### App Registration
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/apps` | Register a new app |
| `GET` | `/apps` | List apps (filterable, paginated) |
| `GET` | `/apps/:id` | Get a single app |
| `PATCH` | `/apps/:id` | Update a registration |
| `POST` | `/apps/:id/checkin` | Heartbeat / check-in |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/summary` | Aggregate metrics |
| `GET` | `/dashboard/leaderboard` | Ranked builders |
| `GET` | `/dashboard/builder/:email` | Builder profile |
| `GET` | `/dashboard/staleness` | Stale apps report |
| `GET` | `/dashboard/export` | CSV/JSON export |

### Skills (no auth required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/skills` | List skill packages |
| `GET` | `/skills/:tool` | Skill metadata for a tool |
| `GET` | `/skills/:tool/download` | Download skill ZIP |
| `GET` | `/skills/:tool/install-script` | Copy-paste install script |

### Admin (admin key required)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/admin/api-keys` | Create an API key |
| `GET` | `/admin/api-keys` | List all keys |
| `DELETE` | `/admin/api-keys/:id` | Revoke a key |
| `GET` | `/openapi.json` | OpenAPI 3.0 spec |

## Web Pages

| Page | Path | Description |
|---|---|---|
| Dashboard | `/` | Summary metrics, breakdowns by status/tool/department |
| App Directory | `/apps` | Searchable, filterable table of all registered apps |
| App Detail | `/apps/:id` | Full detail view for a single app |
| Leaderboard | `/leaderboard` | Ranked builders by app count (all-time, quarter, month) |
| Builder Profile | `/builder/:email` | Everything a single builder has registered |
| Staleness | `/staleness` | Apps that haven't checked in recently |
| Skill Downloads | `/skills` | Download registration skills for each AI coding tool |
| Admin | `/admin` | API key management |

## Skill Packages

The registry distributes registration skills for four AI coding tools:

| Tool | Format | Install Path |
|---|---|---|
| **Claude Code** | SKILL.md (Agent Skill) | `~/.claude/skills/app-registry/` |
| **Cursor** | SKILL.md (Agent Skill) | `~/.cursor/skills/app-registry/` |
| **Codex** | SKILL.md (Agent Skill) + offline fallback | `~/.codex/skills/app-registry/` |
| **Copilot** | GitHub App + Skillset manifest | Installed via GitHub org admin |

Each skill walks the builder through registering their app: it infers project context, confirms details, POSTs to the registry, and saves a local `.app-registry.json` marker.

## Tech Stack

- **API:** Node.js, Express, TypeScript
- **Database:** PostgreSQL 16
- **Web:** React 18, Vite, Tailwind CSS
- **Auth:** API keys (SHA-256 hashed, scoped as builder/admin)
- **Deployment:** Docker (single container serves API + static SPA)

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://registry:registry@localhost:5432/app_registry` |
| `API_KEY_SECRET` | Secret for key generation | `change-me-in-production` |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed email domains | `acme.com` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:8080` |
| `PORT` | Server port | `8080` |
| `SKILL_STORAGE_PATH` | Path to skill package files | `./skills` |
