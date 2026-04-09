import { Router, Request, Response } from 'express';
import { query } from '../db';
import { config } from '../config';
import { registrationLimiter } from '../middleware/rateLimit';

const router = Router();

const VALID_BUILD_TOOLS = ['claude-code', 'cursor', 'copilot', 'codex', 'cowork', 'other'];
const VALID_APP_TYPES = ['html-app', 'script', 'cli-tool', 'api-service', 'automation', 'other'];
const VALID_STATUSES = ['active', 'experimental', 'deprecated', 'retired'];

// POST /apps — Register a new app
router.post('/', registrationLimiter, async (req: Request, res: Response) => {
  try {
    const {
      app_name, app_description, builder_name, builder_email,
      department, build_tool, app_type, tech_stack,
      repo_url, deployment_url, user_count, status, metadata
    } = req.body;

    // Required fields
    if (!app_name || !app_description || !builder_name || !builder_email || !department || !build_tool) {
      res.status(400).json({ error: 'Missing required fields: app_name, app_description, builder_name, builder_email, department, build_tool' });
      return;
    }

    // Validate build_tool enum
    if (!VALID_BUILD_TOOLS.includes(build_tool)) {
      res.status(400).json({ error: `Invalid build_tool. Must be one of: ${VALID_BUILD_TOOLS.join(', ')}` });
      return;
    }

    // Validate app_type if provided
    if (app_type && !VALID_APP_TYPES.includes(app_type)) {
      res.status(400).json({ error: `Invalid app_type. Must be one of: ${VALID_APP_TYPES.join(', ')}` });
      return;
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }

    // Email domain check
    const emailDomain = builder_email.split('@')[1];
    if (!config.allowedEmailDomains.includes(emailDomain)) {
      res.status(400).json({ error: `Email domain "${emailDomain}" is not in the allowed list` });
      return;
    }

    const result = await query(
      `INSERT INTO apps (app_name, app_description, builder_name, builder_email, department, build_tool, app_type, tech_stack, repo_url, deployment_url, user_count, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, app_name, registered_at, last_checkin, status`,
      [app_name, app_description, builder_name, builder_email, department, build_tool,
       app_type || null, tech_stack || null, repo_url || null, deployment_url || null,
       user_count || null, status || 'active', metadata ? JSON.stringify(metadata) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as Record<string, unknown>).code === '23505') {
      res.status(409).json({ error: 'An app with this name is already registered by this builder' });
      return;
    }
    throw err;
  }
});

// GET /apps — List with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  const {
    department, builder_email, build_tool, status,
    registered_after, registered_before, stale_days,
    sort = 'registered_at', order = 'desc',
    page = '1', per_page = '25'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(per_page as string, 10) || 25));
  const offset = (pageNum - 1) * perPage;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (department) { conditions.push(`department = $${paramIdx++}`); params.push(department); }
  if (builder_email) { conditions.push(`builder_email = $${paramIdx++}`); params.push(builder_email); }
  if (build_tool) { conditions.push(`build_tool = $${paramIdx++}`); params.push(build_tool); }
  if (status) { conditions.push(`status = $${paramIdx++}`); params.push(status); }
  if (registered_after) { conditions.push(`registered_at >= $${paramIdx++}`); params.push(registered_after); }
  if (registered_before) { conditions.push(`registered_at <= $${paramIdx++}`); params.push(registered_before); }
  if (stale_days) {
    conditions.push(`last_checkin < NOW() - INTERVAL '1 day' * $${paramIdx++}`);
    params.push(parseInt(stale_days as string, 10));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSorts = ['registered_at', 'last_checkin', 'app_name', 'department', 'builder_name'];
  const sortField = allowedSorts.includes(sort as string) ? sort : 'registered_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const countResult = await query(`SELECT COUNT(*) FROM apps ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT * FROM apps ${where} ORDER BY ${sortField} ${sortOrder} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, perPage, offset]
  );

  res.json({
    data: dataResult.rows,
    pagination: {
      page: pageNum,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  });
});

// GET /apps/:id — Single app
router.get('/:id', async (req: Request, res: Response) => {
  const { rows } = await query('SELECT * FROM apps WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'App not found' });
    return;
  }
  res.json(rows[0]);
});

// PATCH /apps/:id — Update
router.patch('/:id', async (req: Request, res: Response) => {
  const allowedFields = [
    'app_name', 'app_description', 'builder_name', 'department',
    'build_tool', 'app_type', 'tech_stack', 'repo_url', 'deployment_url',
    'user_count', 'status', 'metadata'
  ];

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if (field === 'metadata') {
        updates.push(`${field} = $${paramIdx++}`);
        params.push(JSON.stringify(req.body[field]));
      } else {
        updates.push(`${field} = $${paramIdx++}`);
        params.push(req.body[field]);
      }
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  // Always refresh last_checkin on update
  updates.push(`last_checkin = NOW()`);
  params.push(req.params.id);

  const result = await query(
    `UPDATE apps SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  res.json(result.rows[0]);
});

// POST /apps/:id/checkin — Heartbeat
router.post('/:id/checkin', async (req: Request, res: Response) => {
  const { active_users, notes } = req.body || {};

  const result = await query(
    'UPDATE apps SET last_checkin = NOW() WHERE id = $1 RETURNING id, last_checkin',
    [req.params.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'App not found' });
    return;
  }

  // Log to checkins table
  if (active_users !== undefined || notes) {
    await query(
      'INSERT INTO checkins (app_id, active_users, notes) VALUES ($1, $2, $3)',
      [req.params.id, active_users || null, notes || null]
    );
  }

  res.json({
    app_id: result.rows[0].id,
    last_checkin: result.rows[0].last_checkin,
  });
});

export default router;
