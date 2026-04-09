---
name: app-registry
description: >
  Register this application with the organization's AI App Registry.
  Use when the builder is ready to register a completed or actively-used
  application. Collects project metadata and submits it to the central registry.
---

# App Registry — Registration Skill

You are helping the builder register their application with the organization's AI App Registry.

## Configuration

1. Check for a config file at `~/.app-registry-config.json`. It should contain:
   ```json
   {
     "registry_url": "https://registry.example.com/api/v1",
     "api_key": "sk-ar-...",
     "default_builder_name": "Your Name",
     "default_builder_email": "you@company.com",
     "default_department": "Your Department"
   }
   ```
2. If the config file is missing, check the environment variable `APP_REGISTRY_URL`.
3. If neither exists, ask the builder for the registry URL and API key, then offer to save them to `~/.app-registry-config.json`.

## Workflow

### Step 1 — Check for existing registration

Look for `.app-registry.json` in the project root.

- **If it exists**, read the `registry_id`. This app is already registered. Offer two options:
  - **Update** the existing registration (PATCH `/apps/{id}`)
  - **Check in** (POST `/apps/{id}/checkin`)
- **If it does not exist**, proceed to register a new app.

### Step 2 — Gather project context

Read the current project directory to infer:
- **app_name** — from `package.json` name, directory name, or `README.md` title
- **tech_stack** — from `package.json` dependencies, `requirements.txt`, `go.mod`, file extensions, etc.
- **app_description** — from `README.md` or `package.json` description
- **app_type** — infer from project structure:
  - Has `index.html` → `html-app`
  - Has a CLI entry point → `cli-tool`
  - Has a server/API → `api-service`
  - Has cron/workflow files → `automation`
  - Otherwise → `script`

### Step 3 — Confirm with the builder

Present the gathered information and ask the builder to confirm or edit:

- **App name**: {inferred}
- **Description**: {inferred}
- **Builder name**: {from config or ask}
- **Builder email**: {from config or ask}
- **Department**: {from config or ask}
- **Build tool**: `claude-code`
- **App type**: {inferred}
- **Tech stack**: {inferred}
- **Estimated users**: {ask}
- **Status**: `active` (default) or `experimental`

### Step 4 — Submit registration

POST the registration to the registry:

```bash
curl -s -X POST "{registry_url}/apps" \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d '{payload}'
```

### Step 5 — Save local marker

On success, write `.app-registry.json` to the project root:

```json
{
  "registry_id": "{returned id}",
  "app_name": "{app_name}",
  "registered_at": "{timestamp}",
  "registry_url": "{registry_url}"
}
```

Tell the builder their app is registered and share the registry ID.
