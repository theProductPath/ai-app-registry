# App Registry — GitHub Copilot Extension

This extension allows you to register AI-built applications with your organization's App Registry directly from Copilot Chat.

## Installation

This extension is installed as a GitHub App by your organization's GitHub admin. Once installed, all org members can access it in Copilot Chat.

## Usage

In Copilot Chat (VS Code or github.com):

- `@app-registry register this app` — Register the current project
- `@app-registry check if this app is registered` — Look up existing registration
- `@app-registry update my app` — Update an existing registration

## How It Works

The extension uses the AI App Registry's OpenAPI spec to make API calls on your behalf. Authentication is handled by the GitHub App configuration — no local API key needed.

## Configuration

Your GitHub admin needs to:

1. Install the App Registry GitHub App on the organization
2. Set the registry API URL and API key in the GitHub App settings
3. Grant access to the relevant teams or the entire org

The `manifest.json` in this package defines the Copilot Skillset — it points to the registry's OpenAPI endpoint and maps the available operations.
