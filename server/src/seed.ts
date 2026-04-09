import crypto from 'crypto';
import { pool, query } from './db';
import fs from 'fs';
import path from 'path';

async function seed() {
  console.log('Running migrations first...');
  const migrationSql = fs.readFileSync(
    path.join(__dirname, 'migrations', '001_initial.sql'),
    'utf-8'
  );
  await query(migrationSql);

  console.log('Seeding database...');

  // Create admin API key
  const adminKey = `sk-ar-${crypto.randomBytes(32).toString('hex')}`;
  const adminHash = crypto.createHash('sha256').update(adminKey).digest('hex');
  await query(
    `INSERT INTO api_keys (key_hash, key_prefix, owner_email, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key_hash) DO NOTHING`,
    [adminHash, adminKey.substring(0, 8), 'admin@acme.com', 'admin']
  );

  // Create builder API key
  const builderKey = `sk-ar-${crypto.randomBytes(32).toString('hex')}`;
  const builderHash = crypto.createHash('sha256').update(builderKey).digest('hex');
  await query(
    `INSERT INTO api_keys (key_hash, key_prefix, owner_email, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key_hash) DO NOTHING`,
    [builderHash, builderKey.substring(0, 8), 'maria.chen@acme.com', 'builder']
  );

  // Seed sample apps
  const apps = [
    {
      app_name: 'Quarterly Close Reconciler',
      app_description: 'Automates GL-to-subledger reconciliation during quarterly close. Reads export CSVs, flags discrepancies, generates summary report.',
      builder_name: 'Maria Chen',
      builder_email: 'maria.chen@acme.com',
      department: 'Accounting',
      build_tool: 'claude-code',
      app_type: 'script',
      tech_stack: ['python', 'pandas'],
      status: 'active',
      user_count: 3,
    },
    {
      app_name: 'Invoice Parser',
      app_description: 'Extracts line items from PDF invoices and loads them into the AP system.',
      builder_name: 'Maria Chen',
      builder_email: 'maria.chen@acme.com',
      department: 'Accounting',
      build_tool: 'cursor',
      app_type: 'automation',
      tech_stack: ['python', 'pdfplumber', 'sqlite'],
      status: 'active',
      user_count: 5,
    },
    {
      app_name: 'Sprint Standup Bot',
      app_description: 'Collects async standup updates from Slack and posts a daily summary to the team channel.',
      builder_name: 'James Park',
      builder_email: 'james.park@acme.com',
      department: 'Engineering',
      build_tool: 'claude-code',
      app_type: 'automation',
      tech_stack: ['node', 'slack-sdk'],
      status: 'active',
      user_count: 12,
    },
    {
      app_name: 'Candidate Screening Helper',
      app_description: 'Summarizes resumes against job requirements and generates interview question suggestions.',
      builder_name: 'Sarah Kim',
      builder_email: 'sarah.kim@acme.com',
      department: 'HR',
      build_tool: 'copilot',
      app_type: 'html-app',
      tech_stack: ['react', 'openai-api'],
      status: 'active',
      user_count: 4,
    },
    {
      app_name: 'Campaign ROI Dashboard',
      app_description: 'Pulls data from Google Ads and HubSpot to calculate campaign ROI with a visual dashboard.',
      builder_name: 'Alex Rivera',
      builder_email: 'alex.rivera@acme.com',
      department: 'Marketing',
      build_tool: 'cursor',
      app_type: 'html-app',
      tech_stack: ['react', 'chart.js', 'express'],
      status: 'active',
      user_count: 8,
    },
    {
      app_name: 'PO Approval Tracker',
      app_description: 'Tracks purchase order approvals and sends reminder emails when POs are pending too long.',
      builder_name: 'Tom Reed',
      builder_email: 'tom.reed@acme.com',
      department: 'Operations',
      build_tool: 'codex',
      app_type: 'automation',
      tech_stack: ['python', 'sendgrid'],
      status: 'experimental',
      user_count: 2,
    },
    {
      app_name: 'Meeting Notes Summarizer',
      app_description: 'Takes meeting transcripts and generates structured summaries with action items.',
      builder_name: 'James Park',
      builder_email: 'james.park@acme.com',
      department: 'Engineering',
      build_tool: 'claude-code',
      app_type: 'cli-tool',
      tech_stack: ['python', 'anthropic-sdk'],
      status: 'active',
      user_count: 20,
    },
    {
      app_name: 'Old Expense Reporter',
      app_description: 'Legacy expense report generator, no longer maintained.',
      builder_name: 'Tom Reed',
      builder_email: 'tom.reed@acme.com',
      department: 'Accounting',
      build_tool: 'copilot',
      app_type: 'script',
      tech_stack: ['python'],
      status: 'deprecated',
      user_count: 0,
    },
  ];

  for (const app of apps) {
    await query(
      `INSERT INTO apps (app_name, app_description, builder_name, builder_email, department, build_tool, app_type, tech_stack, status, user_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (app_name, builder_email) DO NOTHING`,
      [app.app_name, app.app_description, app.builder_name, app.builder_email, app.department, app.build_tool, app.app_type, app.tech_stack, app.status, app.user_count]
    );
  }

  // Make the old expense reporter stale (last checkin 120 days ago)
  await query(
    `UPDATE apps SET last_checkin = NOW() - INTERVAL '120 days' WHERE app_name = 'Old Expense Reporter'`
  );

  // Seed skill packages
  const skillPackages = [
    { tool: 'claude-code', version: '1.0.0', format: 'agent-skill', package_path: 'skills/claude-code', checksum: 'sha256:placeholder', install_instructions: 'Download and extract to ~/.claude/skills/app-registry/' },
    { tool: 'cursor', version: '1.0.0', format: 'agent-skill', package_path: 'skills/cursor', checksum: 'sha256:placeholder', install_instructions: 'Download and extract to ~/.cursor/skills/app-registry/' },
    { tool: 'codex', version: '1.0.0', format: 'agent-skill', package_path: 'skills/codex', checksum: 'sha256:placeholder', install_instructions: 'Download and extract to ~/.codex/skills/app-registry/' },
    { tool: 'copilot', version: '1.0.0', format: 'copilot-extension', package_path: 'skills/copilot', checksum: 'sha256:placeholder', install_instructions: 'Install via GitHub App: github.com/apps/acme-app-registry' },
  ];

  for (const pkg of skillPackages) {
    await query(
      `INSERT INTO skill_packages (tool, version, format, package_path, checksum, install_instructions, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT DO NOTHING`,
      [pkg.tool, pkg.version, pkg.format, pkg.package_path, pkg.checksum, pkg.install_instructions]
    );
  }

  console.log('\n=== Seed Complete ===');
  console.log(`Admin API Key:   ${adminKey}`);
  console.log(`Builder API Key: ${builderKey}`);
  console.log('Save these keys — they cannot be retrieved later.\n');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
