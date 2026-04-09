---
name: app-registry
description: >
  Register this application with the organization's AI App Registry.
  Use when the builder is ready to register a completed or actively-used
  application. Collects project metadata and submits it to the central registry.
---

# App Registry — Registration Skill (Codex)

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
3. If neither exists, ask the builder for the registry URL and API key.

## Network Detection

Before attempting HTTP calls, check if outbound network access is available:

```bash
curl -s --max-time 5 -o /dev/null -w "%{http_code}" {registry_url}/health
```

- If this returns `200`, proceed with online registration.
- If this times out or fails, use the **offline fallback** below.

## Workflow (Online)

Follow the same steps as the standard skill:

1. Check for `.app-registry.json` (existing registration)
2. Gather project context (app name, tech stack, description, type)
3. Confirm details with the builder
4. POST to `{registry_url}/apps`
5. Save `.app-registry.json` marker file

## Workflow (Offline Fallback)

If network access is not available (common in Codex cloud sandboxes):

1. Gather project context and confirm with the builder (same as online)
2. Write the registration payload to `.app-registry-pending.json` in the project root
3. Output a ready-to-run curl command:

```bash
curl -X POST "{registry_url}/apps" \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d @.app-registry-pending.json
```

4. Tell the builder:
   - "Run the curl command above in your terminal to complete registration."
   - "Or paste the JSON at {registry_url} → App Directory → Register via JSON."

## AGENTS.md Integration

Builders can add this to their project's `AGENTS.md` to remind Codex about registration:

```
When this project reaches a deployable state, offer to register it with the App Registry using the /app-registry skill.
```
