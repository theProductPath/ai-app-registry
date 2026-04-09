import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { query } from '../db';
import { config } from '../config';

const router = Router();

const VALID_TOOLS = ['claude-code', 'cursor', 'copilot', 'codex'];

const INSTALL_PATHS: Record<string, string> = {
  'claude-code': '${HOME}/.claude/skills/app-registry',
  'cursor': '${HOME}/.cursor/skills/app-registry',
  'codex': '${HOME}/.codex/skills/app-registry',
};

// GET /skills — List all available skill packages
router.get('/', async (_req: Request, res: Response) => {
  const { rows } = await query(
    'SELECT tool, version, format, checksum, install_instructions, published_at FROM skill_packages WHERE is_current = true ORDER BY tool'
  );

  const skills = rows.map((r: Record<string, unknown>) => ({
    ...r,
    download_url: `/api/v1/skills/${r.tool}/download`,
  }));

  res.json({ skills });
});

// GET /skills/:tool — Single tool metadata
router.get('/:tool', async (req: Request, res: Response) => {
  const tool = req.params.tool as string;
  if (!VALID_TOOLS.includes(tool)) {
    res.status(400).json({ error: `Invalid tool. Must be one of: ${VALID_TOOLS.join(', ')}` });
    return;
  }

  const { rows } = await query(
    'SELECT tool, version, format, checksum, install_instructions, published_at FROM skill_packages WHERE tool = $1 AND is_current = true',
    [tool]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: `No skill package found for ${tool}` });
    return;
  }

  res.json({
    ...rows[0],
    download_url: `/api/v1/skills/${tool}/download`,
  });
});

// GET /skills/:tool/download — Download skill package as ZIP
router.get('/:tool/download', async (req: Request, res: Response) => {
  const tool = req.params.tool as string;
  if (!VALID_TOOLS.includes(tool)) {
    res.status(400).json({ error: `Invalid tool. Must be one of: ${VALID_TOOLS.join(', ')}` });
    return;
  }

  const skillDir = path.resolve(config.skillStoragePath, tool);
  if (!fs.existsSync(skillDir)) {
    res.status(404).json({ error: `Skill package not found for ${tool}` });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="app-registry-${tool}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(skillDir, 'app-registry');
  archive.finalize();
});

// GET /skills/:tool/install-script — Shell install script
router.get('/:tool/install-script', (req: Request, res: Response) => {
  const tool = req.params.tool as string;
  if (!VALID_TOOLS.includes(tool)) {
    res.status(400).json({ error: `Invalid tool. Must be one of: ${VALID_TOOLS.join(', ')}` });
    return;
  }

  if (tool === 'copilot') {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`# GitHub Copilot — App Registry Extension
# Install via your organization's GitHub App.
# See the Copilot card on the Skills page for details.
echo "Copilot extension is installed via GitHub App — no local install needed."
`);
    return;
  }

  const installPath = INSTALL_PATHS[tool];
  const registryUrl = '${REGISTRY_URL:-https://registry.example.com}';

  res.setHeader('Content-Type', 'text/plain');
  res.send(`#!/bin/bash
# App Registry Skill Installer — ${tool}
set -e

SKILL_DIR="${installPath}"
REGISTRY_URL="${registryUrl}"

mkdir -p "$SKILL_DIR"
echo "Downloading app-registry skill for ${tool}..."
curl -sL "$REGISTRY_URL/api/v1/skills/${tool}/download" -o /tmp/app-registry.zip
unzip -o /tmp/app-registry.zip -d "$SKILL_DIR"
rm /tmp/app-registry.zip
echo "App Registry skill installed to $SKILL_DIR"
`);
});

export default router;
