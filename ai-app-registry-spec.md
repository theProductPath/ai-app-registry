# AI App Registry — Technical Specification

**Version:** 0.1 (Draft)
**Date:** 2026-04-06

---

## 1. System Overview

The AI App Registry is a two-part system that gives organizations visibility into the applications their employees are building with AI coding tools.

**Part 1 — The Registry** is a centralized API service that stores app registrations, distributes tool-specific registration skills, and exposes dashboard data for reporting and recognition.

**Part 2 — The App Registration Skill** is a lightweight package, distributed in tool-native formats, that allows any AI-built application to self-register with the organization's registry. The skill is packaged for Claude Code, Cursor, GitHub Copilot, and OpenAI Codex.

A web interface sits on top of the registry, serving as both a human-readable dashboard and a download portal for skill packages.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Interface                         │
│  (Dashboard · Leaderboard · Skill Download Portal)      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  Registry API                            │
│                                                          │
│  ┌──────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │ Registration  │ │ Skill           │ │ Dashboard &  │  │
│  │ Endpoints     │ │ Distribution    │ │ Reporting    │  │
│  │ (CRUD)        │ │ Endpoints       │ │ Endpoints    │  │
│  └──────────────┘ └─────────────────┘ └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Data Store (PostgreSQL)              │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                       ▲
         ┌─────────┬───┴───┬─────────┐
         │         │       │         │
    ┌────┴────┐ ┌──┴───┐ ┌─┴──────┐ ┌┴────────┐
    │ Claude  │ │Cursor│ │Copilot │ │  Codex  │
    │ Code    │ │Skill │ │  Ext.  │ │  Skill  │
    │ Skill   │ │      │ │        │ │         │
    └─────────┘ └──────┘ └────────┘ └─────────┘
```

---

## 2. Data Model

### 2.1 `apps` Table

The core registration record. One row per registered application.

| Column | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | auto | Primary key, generated server-side |
| `app_name` | VARCHAR(255) | yes | Human-readable name of the application |
| `app_description` | TEXT | yes | What the app does, in plain language |
| `builder_name` | VARCHAR(255) | yes | Full name of the person who built it |
| `builder_email` | VARCHAR(255) | yes | Builder's organizational email |
| `department` | VARCHAR(128) | yes | Department or team (e.g., "Accounting", "HR", "Engineering") |
| `build_tool` | VARCHAR(64) | yes | Tool used to build it. Enum: `claude-code`, `cursor`, `copilot`, `codex`, `cowork`, `other` |
| `app_type` | VARCHAR(64) | no | Category. Enum: `html-app`, `script`, `cli-tool`, `api-service`, `automation`, `other` |
| `tech_stack` | TEXT[] | no | Array of technologies (e.g., `["python", "flask", "sqlite"]`) |
| `repo_url` | VARCHAR(512) | no | Link to source repository, if any |
| `deployment_url` | VARCHAR(512) | no | Where the app is running, if applicable |
| `user_count` | INTEGER | no | Estimated number of users |
| `status` | VARCHAR(32) | yes | Enum: `active`, `experimental`, `deprecated`, `retired` |
| `registered_at` | TIMESTAMP | auto | When the app was first registered |
| `last_checkin` | TIMESTAMP | auto | Last heartbeat or update (initially same as `registered_at`) |
| `metadata` | JSONB | no | Extensible field for org-specific data |

### 2.2 `checkins` Table (V2)

For future ongoing registration. Tracks periodic heartbeats from registered apps.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `app_id` | UUID | FK → `apps.id` |
| `checked_in_at` | TIMESTAMP | When this checkin occurred |
| `active_users` | INTEGER | Users at time of checkin |
| `notes` | TEXT | Optional status note |

### 2.3 `skill_packages` Table

Stores metadata about available skill packages for each tool.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `tool` | VARCHAR(64) | Target tool: `claude-code`, `cursor`, `copilot`, `codex` |
| `version` | VARCHAR(32) | Semver version string |
| `format` | VARCHAR(64) | Package format: `agent-skill`, `copilot-extension` |
| `package_path` | VARCHAR(512) | Path to the package file in object storage (not exposed via API) |
| `checksum` | VARCHAR(128) | SHA-256 hash of the package |
| `install_instructions` | TEXT | Human-readable install instructions for this tool |
| `published_at` | TIMESTAMP | When this version was published |
| `is_current` | BOOLEAN | Whether this is the latest version for this tool |

### 2.4 `api_keys` Table

Stores API keys for authentication. Keys are scoped by role.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `key_hash` | VARCHAR(128) | SHA-256 hash of the API key (plaintext never stored) |
| `key_prefix` | VARCHAR(8) | First 8 characters of the key, for identification in admin UI |
| `owner_email` | VARCHAR(255) | Email of the person or service this key belongs to |
| `role` | VARCHAR(32) | Enum: `builder` (own apps only), `admin` (all endpoints) |
| `created_at` | TIMESTAMP | When the key was issued |
| `last_used_at` | TIMESTAMP | Last time this key was used |
| `revoked` | BOOLEAN | Whether this key has been revoked |

---

## 3. Registry API

Base URL: `https://{org-domain}/api/v1`

All endpoints accept and return JSON. Authentication is via API key in the `Authorization` header: `Bearer {api-key}`. API keys are provisioned per-user or per-tool-instance by the organization's admin.

### 3.1 Group 1 — App Registration

These endpoints handle the core CRUD lifecycle of registered applications.

---

#### `POST /apps`

Register a new application.

**Request body:**

```json
{
  "app_name": "Quarterly Close Reconciler",
  "app_description": "Automates GL-to-subledger reconciliation during quarterly close. Reads export CSVs, flags discrepancies, generates summary report.",
  "builder_name": "Maria Chen",
  "builder_email": "maria.chen@acme.com",
  "department": "Accounting",
  "build_tool": "claude-code",
  "app_type": "script",
  "tech_stack": ["python", "pandas"],
  "repo_url": "https://github.acme.com/mchen/reconciler",
  "user_count": 3,
  "status": "active",
  "metadata": {
    "cost_center": "FIN-2240"
  }
}
```

**Response** `201 Created`:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "app_name": "Quarterly Close Reconciler",
  "registered_at": "2026-04-06T14:30:00Z",
  "last_checkin": "2026-04-06T14:30:00Z",
  "status": "active"
}
```

**Validation rules:**
- `app_name` + `builder_email` must be unique (prevents duplicate registration of the same app by the same person).
- `builder_email` domain must match an allowlist of organizational domains.
- `build_tool` must be a recognized enum value.

---

#### `GET /apps/{id}`

Retrieve a single registered app by ID.

**Response** `200 OK`: Full `apps` record as JSON.

---

#### `PATCH /apps/{id}`

Update a registration. Used to change status, update user count, or correct metadata. Automatically refreshes `last_checkin`.

**Request body:** Partial — only include fields being updated.

```json
{
  "status": "deprecated",
  "user_count": 0
}
```

**Response** `200 OK`: Updated full record.

---

#### `POST /apps/{id}/checkin`

Lightweight heartbeat. Touches `last_checkin` and optionally logs to the `checkins` table (V2).

**Request body** (optional):

```json
{
  "active_users": 5,
  "notes": "Still in daily use by the GL team"
}
```

**Response** `200 OK`:

```json
{
  "app_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "last_checkin": "2026-04-06T15:00:00Z"
}
```

---

#### `GET /apps`

List registered apps with filtering and pagination.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `department` | string | Filter by department |
| `builder_email` | string | Filter by builder |
| `build_tool` | string | Filter by tool |
| `status` | string | Filter by status |
| `registered_after` | ISO date | Apps registered after this date |
| `registered_before` | ISO date | Apps registered before this date |
| `stale_days` | integer | Apps with no checkin in N days |
| `sort` | string | Field to sort by (default: `registered_at`) |
| `order` | string | `asc` or `desc` (default: `desc`) |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Results per page (default: 25, max: 100) |

**Response** `200 OK`:

```json
{
  "data": [ /* array of app records */ ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total": 142,
    "total_pages": 6
  }
}
```

---

### 3.2 Group 2 — Skill Distribution

These endpoints let tools and users discover and download the correct registration skill for their environment.

---

#### `GET /skills`

List all available skill packages.

**Response** `200 OK`:

```json
{
  "skills": [
    {
      "tool": "claude-code",
      "version": "1.0.0",
      "format": "agent-skill",
      "download_url": "/skills/claude-code/download",
      "checksum": "sha256:abc123...",
      "published_at": "2026-04-01T00:00:00Z",
      "install_instructions": "Download and extract to ~/.claude/skills/app-registry/"
    },
    {
      "tool": "cursor",
      "version": "1.0.0",
      "format": "agent-skill",
      "download_url": "/skills/cursor/download",
      "checksum": "sha256:def456...",
      "published_at": "2026-04-01T00:00:00Z",
      "install_instructions": "Download and extract to .cursor/skills/app-registry/"
    },
    {
      "tool": "copilot",
      "version": "1.0.0",
      "format": "copilot-extension",
      "download_url": "/skills/copilot/download",
      "checksum": "sha256:ghi789...",
      "published_at": "2026-04-01T00:00:00Z",
      "install_instructions": "Install via GitHub App: github.com/apps/acme-app-registry"
    },
    {
      "tool": "codex",
      "version": "1.0.0",
      "format": "agent-skill",
      "download_url": "/skills/codex/download",
      "checksum": "sha256:jkl012...",
      "published_at": "2026-04-01T00:00:00Z",
      "install_instructions": "Download and extract to ~/.codex/skills/app-registry/"
    }
  ]
}
```

---

#### `GET /skills/{tool}`

Get the latest skill package metadata for a specific tool.

**Path parameter:** `tool` — one of `claude-code`, `cursor`, `copilot`, `codex`

**Response** `200 OK`: Single skill object from the list above.

---

#### `GET /skills/{tool}/download`

Download the actual skill package as a ZIP archive.

**Response** `200 OK`: Binary ZIP file with `Content-Type: application/zip`.

**Package contents by tool:**

For `claude-code`:
```
app-registry/
  SKILL.md
  templates/
    registration-prompt.md
```

For `cursor`:
```
app-registry/
  SKILL.md
  templates/
    registration-prompt.md
```

For `codex`:
```
app-registry/
  SKILL.md
  templates/
    registration-prompt.md
```

For `copilot`:
```
app-registry/
  manifest.json
  README.md
```

---

#### `GET /skills/{tool}/install-script`

Returns a shell script or set of commands that automates installation for the given tool. Intended to be piped into a shell or copy-pasted from the web UI.

**Response** `200 OK`: `Content-Type: text/plain`

Example for `claude-code`:
```bash
#!/bin/bash
SKILL_DIR="${HOME}/.claude/skills/app-registry"
mkdir -p "$SKILL_DIR"
curl -sL "https://registry.acme.com/api/v1/skills/claude-code/download" -o /tmp/app-registry.zip
unzip -o /tmp/app-registry.zip -d "$SKILL_DIR"
rm /tmp/app-registry.zip
echo "App Registry skill installed to $SKILL_DIR"
```

---

### 3.3 Group 3 — Admin & Configuration

These endpoints are restricted to `admin`-scoped API keys.

---

#### `POST /admin/api-keys`

Provision a new API key for a builder or service.

**Request body:**

```json
{
  "owner_email": "maria.chen@acme.com",
  "role": "builder"
}
```

**Response** `201 Created`:

```json
{
  "api_key": "sk-ar-a1b2c3d4e5f6...",
  "key_prefix": "sk-ar-a1",
  "owner_email": "maria.chen@acme.com",
  "role": "builder",
  "created_at": "2026-04-06T14:00:00Z"
}
```

Note: The full `api_key` is returned only once at creation time. It is never stored in plaintext and cannot be retrieved later.

---

#### `GET /admin/api-keys`

List all API keys (showing prefix, owner, role, and status — never the full key).

---

#### `DELETE /admin/api-keys/{id}`

Revoke an API key. Sets `revoked = true`; the key immediately stops working.

---

#### `GET /openapi.json`

Serves the OpenAPI 3.0 schema for the registry API. This is required for GitHub Copilot's Skillset integration, which references this URL in its manifest. Also useful for generating client libraries or documentation.

**Response** `200 OK`: `Content-Type: application/json` — standard OpenAPI 3.0 document.

---

### 3.4 Group 4 — Dashboard & Reporting

These endpoints power the web dashboard, leaderboards, and data exports for personnel reviews.

---

#### `GET /dashboard/summary`

High-level metrics for the entire registry.

**Response** `200 OK`:

```json
{
  "total_apps": 142,
  "active_apps": 118,
  "total_builders": 87,
  "departments_represented": 14,
  "apps_registered_this_month": 23,
  "apps_by_status": {
    "active": 118,
    "experimental": 12,
    "deprecated": 8,
    "retired": 4
  },
  "apps_by_tool": {
    "claude-code": 54,
    "cursor": 41,
    "copilot": 32,
    "codex": 19,
    "cowork": 11,
    "other": 4
  },
  "apps_by_department": {
    "Engineering": 38,
    "Accounting": 22,
    "HR": 18,
    "Marketing": 15,
    "Operations": 12,
    "...": "..."
  }
}
```

---

#### `GET /dashboard/leaderboard`

Ranked list of builders by number of registered apps. Supports the "badge of accomplishment" recognition model.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `period` | string | `all-time`, `quarter`, `month` (default: `all-time`) |
| `department` | string | Filter to a specific department |
| `limit` | integer | Number of entries (default: 20) |

**Response** `200 OK`:

```json
{
  "period": "quarter",
  "period_start": "2026-01-01T00:00:00Z",
  "period_end": "2026-03-31T23:59:59Z",
  "leaderboard": [
    {
      "rank": 1,
      "builder_name": "Maria Chen",
      "builder_email": "maria.chen@acme.com",
      "department": "Accounting",
      "app_count": 7,
      "active_app_count": 6
    },
    {
      "rank": 2,
      "builder_name": "James Park",
      "builder_email": "james.park@acme.com",
      "department": "Engineering",
      "app_count": 5,
      "active_app_count": 5
    }
  ]
}
```

---

#### `GET /dashboard/builder/{email}`

Full report for a single builder. Designed for personnel review integration — returns everything that person has built and registered.

**Response** `200 OK`:

```json
{
  "builder_name": "Maria Chen",
  "builder_email": "maria.chen@acme.com",
  "department": "Accounting",
  "total_apps": 7,
  "active_apps": 6,
  "first_registration": "2025-11-15T09:00:00Z",
  "latest_registration": "2026-03-28T14:22:00Z",
  "apps": [
    {
      "id": "a1b2c3d4-...",
      "app_name": "Quarterly Close Reconciler",
      "app_description": "Automates GL-to-subledger reconciliation...",
      "build_tool": "claude-code",
      "status": "active",
      "user_count": 3,
      "registered_at": "2026-01-10T10:00:00Z",
      "last_checkin": "2026-04-01T08:00:00Z"
    }
  ],
  "tools_used": {
    "claude-code": 4,
    "cursor": 3
  }
}
```

---

#### `GET /dashboard/staleness`

Apps that haven't checked in recently. Helps identify tools that may have been abandoned.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `stale_days` | integer | Threshold in days (default: 90) |
| `department` | string | Filter by department |

**Response** `200 OK`:

```json
{
  "stale_threshold_days": 90,
  "stale_apps": [
    {
      "id": "...",
      "app_name": "Old Invoice Parser",
      "builder_name": "Tom Reed",
      "department": "Accounting",
      "last_checkin": "2025-12-01T00:00:00Z",
      "days_since_checkin": 127,
      "status": "active"
    }
  ],
  "total_stale": 8
}
```

---

#### `GET /dashboard/export`

CSV export of the full registry or a filtered subset. For use in quarterly reviews, compliance reporting, or integration with HR systems.

**Query parameters:** Same filters as `GET /apps`, plus:

| Param | Type | Description |
|---|---|---|
| `format` | string | `csv` or `json` (default: `csv`) |

**Response** `200 OK`: File download with appropriate content type.

---

## 4. App Registration Skill — Packaging by Tool

The registration skill does one job: collect information about the current project and POST it to the registry. The workflow is the same regardless of tool:

1. Gather project context (name, description, builder info, tech stack).
2. Prompt the builder to confirm or edit the details.
3. POST to `{registry_url}/api/v1/apps`.
4. Return the registration confirmation, including the app's registry ID.

What differs is the packaging format and how outbound HTTP calls are made.

### 4.1 Claude Code

**Format:** Agent Skills standard (SKILL.md)

**Installation path:** `~/.claude/skills/app-registry/SKILL.md`

**Invocation:** User types `/app-registry` in Claude Code, or Claude auto-invokes when it detects the user is deploying or sharing an app.

**How HTTP calls work:** The skill instructs Claude to use `curl` or `fetch` via bash to POST to the registry API. No MCP server required for V1 — the skill uses Claude's built-in shell access.

**SKILL.md structure:**

```yaml
---
name: app-registry
description: >
  Register this application with the organization's AI App Registry.
  Use when the builder is ready to register a completed or actively-used
  application. Collects project metadata and submits it to the central registry.
---
```

The markdown body of the skill instructs Claude to:

1. Read the current project directory to infer `app_name`, `tech_stack`, and `app_description`.
2. Check for a `.app-registry.json` file in the project root (indicates the app is already registered — offer to update instead).
3. Ask the builder to confirm: app name, description, their name, email, department, app type, and estimated user count.
4. POST to the registry API endpoint (URL configured via environment variable `APP_REGISTRY_URL` or read from `~/.app-registry-config.json`).
5. On success, write a `.app-registry.json` file to the project root containing the returned `id` and `registered_at`, so future invocations know this app is already registered and can offer check-in or update instead.

**Configuration file** (`~/.app-registry-config.json`):

```json
{
  "registry_url": "https://registry.acme.com/api/v1",
  "api_key": "sk-...",
  "default_builder_name": "Maria Chen",
  "default_builder_email": "maria.chen@acme.com",
  "default_department": "Accounting"
}
```

**Local marker file** (`.app-registry.json`, written to project root after registration):

```json
{
  "registry_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "app_name": "Quarterly Close Reconciler",
  "registered_at": "2026-04-06T14:30:00Z",
  "registry_url": "https://registry.acme.com/api/v1"
}
```

---

### 4.2 Cursor

**Format:** Agent Skills standard (SKILL.md) — identical structure to Claude Code.

**Installation path:** `~/.cursor/skills/app-registry/SKILL.md`

**Invocation:** User types `/app-registry` in Cursor's agent chat.

**How HTTP calls work:** Same as Claude Code — the skill instructs the agent to use shell commands (`curl`) to POST to the registry. Cursor's agent has terminal access.

**Differences from Claude Code packaging:**
- The SKILL.md content is nearly identical. The only differences are tool-detection logic (the skill checks for `.cursor/` directory presence to confirm it's running in Cursor) and any Cursor-specific environment variable conventions.
- The configuration file path is the same (`~/.app-registry-config.json`) so a user with both tools installed only configures once.
- The `.app-registry.json` project marker file is the same format, so an app registered from Claude Code is recognized if later opened in Cursor, and vice versa.

Claude Code, Cursor, and Codex all share the Agent Skills standard, so the `SKILL.md` file is functionally the same across all three. The ZIP package distributed by the registry is identical — only the install path differs, which the install script handles. (Codex adds an offline fallback for sandboxed environments; see Section 4.3.)

---

### 4.3 OpenAI Codex

**Format:** Agent Skills standard (SKILL.md) — same standard as Claude Code and Cursor.

**Installation path:** `~/.codex/skills/app-registry/SKILL.md` (global) or `.agents/skills/app-registry/SKILL.md` (project-scoped)

**Invocation:** User types `/app-registry` in Codex, or Codex auto-invokes when the skill description matches the user's intent.

**How HTTP calls work:** Codex runs tasks in cloud sandboxes with **network access disabled by default**. The skill must account for this:

- **If `network_access = true`** is set in the user's `~/.codex/config.toml` (under `[sandbox_workspace_write]`), the skill uses `curl` to POST to the registry, same as Claude Code and Cursor.
- **If network access is disabled** (the default), the skill cannot make outbound HTTP calls from the sandbox. In this case, the skill generates the registration payload as a JSON file (`.app-registry-pending.json`) and instructs the builder to submit it manually — either by running a provided `curl` command outside the sandbox, or by pasting the payload into the registry's web interface (which should accept a JSON upload on the `/apps` page).

This two-path approach means the skill works regardless of sandbox configuration, though the experience is smoother with network access enabled.

**SKILL.md structure:**

```yaml
---
name: app-registry
description: >
  Register this application with the organization's AI App Registry.
  Use when the builder is ready to register a completed or actively-used
  application. Collects project metadata and submits it to the central registry.
---
```

The markdown body is functionally identical to the Claude Code skill, with these additions:

1. **Network detection step:** Before attempting the HTTP POST, check whether outbound network access is available by attempting a lightweight call (e.g., `curl -s --max-time 5 -o /dev/null -w "%{http_code}" {registry_url}/health`). If the call fails or times out, fall back to the offline registration path.
2. **Offline fallback:** Write the registration payload to `.app-registry-pending.json` in the project root. Output a ready-to-run `curl` command that the builder can execute in their own terminal. Also provide the web UI URL where they can paste the JSON.
3. **AGENTS.md hint:** The skill's instructions note that builders can add a line to their project's `AGENTS.md` referencing the app-registry skill, so Codex is reminded to offer registration when work reaches a mature state.

**Configuration:** Same `~/.app-registry-config.json` file as Claude Code and Cursor. Codex reads this from the user's home directory. For Codex's cloud sandbox, the config file must be available in the sandbox's mounted home directory — this depends on the organization's Codex deployment configuration.

**Differences from Claude Code / Cursor:**
- Network access is not guaranteed — the skill must handle the offline case gracefully.
- Codex uses `AGENTS.md` (not `CLAUDE.md`) for project-level instructions, so any cross-references in documentation should mention both.
- Skill discovery path differs: `~/.codex/skills/` rather than `~/.claude/skills/` or `~/.cursor/skills/`.
- The install script from the registry handles the path difference, same as it does for Claude Code vs. Cursor.

---

### 4.4 GitHub Copilot

**Format:** Copilot Extension (GitHub App + Skillset manifest)

**Architecture:** The Copilot integration uses the Skillset approach (declarative, no server required beyond the existing registry). The registry API itself serves as the backend — Copilot calls the registry endpoints directly.

**Manifest** (`manifest.json`):

```json
{
  "name": "app-registry",
  "description": "Register this application with the organization's AI App Registry",
  "skillset": {
    "api": {
      "type": "openapi",
      "url": "https://registry.acme.com/api/v1/openapi.json"
    },
    "skills": [
      {
        "name": "register_app",
        "description": "Register a new AI-built application with the central registry",
        "path": "/apps",
        "method": "POST"
      },
      {
        "name": "check_registration",
        "description": "Check if an app is already registered by searching by name and builder email",
        "path": "/apps",
        "method": "GET"
      },
      {
        "name": "update_app",
        "description": "Update an existing app registration or check in",
        "path": "/apps/{id}",
        "method": "PATCH"
      }
    ]
  }
}
```

**Installation:** The organization's GitHub admin installs the App Registry GitHub App onto the org. Individual users then have access to `@app-registry` in Copilot Chat.

**Invocation:** User types `@app-registry register this app` in Copilot Chat within VS Code or GitHub.com.

**How HTTP calls work:** Copilot's runtime makes the API calls to the registry on behalf of the user. Authentication is handled by the GitHub App's configured secrets — the registry API key is stored in the GitHub App settings, not on the user's machine.

**Differences from Claude Code / Cursor:**
- No local configuration file needed — auth is managed at the GitHub App level.
- No local `.app-registry.json` marker file — Copilot checks the registry via GET `/apps?builder_email={email}&app_name={name}` before registering.
- The skill cannot directly read the local filesystem to infer project context. Instead, it relies on Copilot's built-in code context (the currently open workspace) and prompts the user to confirm details.

---

## 5. Web Interface

The registry hosts a web interface at its root URL (`https://registry.acme.com/`). This serves three functions: dashboard, skill download portal, and admin console.

### 5.1 Pages

**Home / Dashboard** (`/`)
- Summary metrics from `GET /dashboard/summary`
- Recent registrations feed
- Link to leaderboard and skill downloads

**App Directory** (`/apps`)
- Searchable, filterable table of all registered apps
- Powered by `GET /apps` with query parameters
- Click-through to individual app detail pages

**Leaderboard** (`/leaderboard`)
- Ranked builder list from `GET /dashboard/leaderboard`
- Toggle by period (month, quarter, all-time) and department
- Visual emphasis on top builders — intended to make registration feel like recognition

**Builder Profile** (`/builder/{email}`)
- Individual builder report from `GET /dashboard/builder/{email}`
- Designed for self-service ("here's everything I've built") and for managers during reviews

**Staleness Report** (`/staleness`)
- List of apps past their checkin threshold from `GET /dashboard/staleness`
- Sortable by days since last checkin

**Skill Downloads** (`/skills`)
- Cards for each supported tool (Claude Code, Cursor, Codex, Copilot)
- Each card shows: tool name, current skill version, install instructions, and a download button
- Download button triggers `GET /skills/{tool}/download`
- Copy-pasteable install command from `GET /skills/{tool}/install-script`
- Auto-detects nothing — the user picks their tool. This is intentional; keep it simple.

**Admin Console** (`/admin`) — requires admin API key
- API key management: provision new keys, view active keys, revoke keys
- Powered by `POST /admin/api-keys`, `GET /admin/api-keys`, `DELETE /admin/api-keys/{id}`
- Configuration overview: allowed email domains, skill package versions

### 5.2 Tech Stack (Suggested)

The web interface is a static SPA (React or plain HTML) that calls the registry API. It ships in the same Docker container as the API.

---

## 6. Deployment

### Docker Container

The registry ships as a single Docker image containing:

- The API server (Node.js/Express or Python/FastAPI — implementer's choice)
- The web interface (static files served by the API server)
- Database migrations (run on startup or via a separate command)

**External dependency:** PostgreSQL database (provided by the organization's infrastructure, or bundled as a Docker Compose service for evaluation).

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `API_KEY_SECRET` | Secret for signing/validating API keys |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated list of allowed email domains for registration |
| `CORS_ORIGINS` | Allowed CORS origins for the web interface |
| `PORT` | Port to listen on (default: 8080) |
| `SKILL_STORAGE_PATH` | Local path or S3 URL for skill package storage |

### Docker Compose (Evaluation)

```yaml
version: "3.8"
services:
  registry:
    image: ai-app-registry:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://registry:registry@db:5432/app_registry
      ALLOWED_EMAIL_DOMAINS: acme.com
      API_KEY_SECRET: change-me-in-production
      CORS_ORIGINS: http://localhost:8080
      PORT: "8080"
      SKILL_STORAGE_PATH: /data/skills
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: registry
      POSTGRES_PASSWORD: registry
      POSTGRES_DB: app_registry
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### URL Discovery

The registry must be reachable at a well-known, easy-to-remember URL within the organization. Recommended patterns:

- `https://app-registry.{company}.com`
- `https://registry.internal.{company}.com`
- `https://ai-apps.{company}.com`

This URL is configured once in each builder's `~/.app-registry-config.json` (for Claude Code / Cursor) or in the GitHub App settings (for Copilot).

---

## 7. Security Considerations

**Authentication:** All API calls require a valid API key. Keys are scoped: builder keys can register and update their own apps; admin keys can access all endpoints including dashboard and export.

**Email domain validation:** The registry rejects registrations from email addresses outside the allowed domain list. This prevents external users from registering apps.

**No secrets in skill packages:** The distributed skill packages contain no API keys or secrets. Configuration is done locally by each builder after download.

**HTTPS only:** The registry must be served over TLS. Skill download URLs must also be HTTPS to prevent tampering.

**Rate limiting:** Standard rate limits on all endpoints to prevent abuse. Registration endpoints should be limited to ~10 requests per minute per API key.

---

## 8. Future Considerations (V2+)

These are out of scope for V1 but inform the data model and API design:

- **Automated checkins:** A cron-style heartbeat that registered apps send periodically, populating the `checkins` table and enabling staleness detection.
- **SSO integration:** Replace API keys with the organization's SSO provider for authentication.
- **App dependency mapping:** Track which registered apps depend on other registered apps or shared services.
- **Risk scoring:** Auto-flag apps that handle sensitive data, lack a repo URL, or have high user counts but no recent checkins.
- **Slack/Teams notifications:** Alert a channel when new apps are registered, or when apps go stale.
- **MCP server distribution:** In addition to skill packages, distribute an MCP server configuration that tools can connect to directly for tighter integration.
