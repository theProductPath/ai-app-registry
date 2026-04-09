import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// GET /dashboard/summary
router.get('/summary', async (_req: Request, res: Response) => {
  const [totalApps, activeApps, totalBuilders, departments, thisMonth, byStatus, byTool, byDept] = await Promise.all([
    query('SELECT COUNT(*) FROM apps'),
    query("SELECT COUNT(*) FROM apps WHERE status = 'active'"),
    query('SELECT COUNT(DISTINCT builder_email) FROM apps'),
    query('SELECT COUNT(DISTINCT department) FROM apps'),
    query("SELECT COUNT(*) FROM apps WHERE registered_at >= date_trunc('month', NOW())"),
    query("SELECT status, COUNT(*) as count FROM apps GROUP BY status"),
    query("SELECT build_tool, COUNT(*) as count FROM apps GROUP BY build_tool"),
    query("SELECT department, COUNT(*) as count FROM apps GROUP BY department ORDER BY count DESC"),
  ]);

  const statusMap: Record<string, number> = {};
  byStatus.rows.forEach((r: { status: string; count: string }) => { statusMap[r.status] = parseInt(r.count, 10); });

  const toolMap: Record<string, number> = {};
  byTool.rows.forEach((r: { build_tool: string; count: string }) => { toolMap[r.build_tool] = parseInt(r.count, 10); });

  const deptMap: Record<string, number> = {};
  byDept.rows.forEach((r: { department: string; count: string }) => { deptMap[r.department] = parseInt(r.count, 10); });

  res.json({
    total_apps: parseInt(totalApps.rows[0].count, 10),
    active_apps: parseInt(activeApps.rows[0].count, 10),
    total_builders: parseInt(totalBuilders.rows[0].count, 10),
    departments_represented: parseInt(departments.rows[0].count, 10),
    apps_registered_this_month: parseInt(thisMonth.rows[0].count, 10),
    apps_by_status: statusMap,
    apps_by_tool: toolMap,
    apps_by_department: deptMap,
  });
});

// GET /dashboard/leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  const { period = 'all-time', department, limit = '20' } = req.query;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

  let dateFilter = '';
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  const params: unknown[] = [];
  let paramIdx = 1;

  const now = new Date();
  if (period === 'month') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    dateFilter = `AND registered_at >= $${paramIdx++}`;
    params.push(periodStart);
  } else if (period === 'quarter') {
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0, 23, 59, 59);
    periodStart = quarterStart.toISOString();
    periodEnd = quarterEnd.toISOString();
    dateFilter = `AND registered_at >= $${paramIdx++}`;
    params.push(periodStart);
  }

  let deptFilter = '';
  if (department) {
    deptFilter = `AND department = $${paramIdx++}`;
    params.push(department);
  }

  params.push(limitNum);

  const { rows } = await query(
    `SELECT
      builder_name, builder_email, department,
      COUNT(*) as app_count,
      COUNT(*) FILTER (WHERE status = 'active') as active_app_count
    FROM apps
    WHERE 1=1 ${dateFilter} ${deptFilter}
    GROUP BY builder_name, builder_email, department
    ORDER BY app_count DESC
    LIMIT $${paramIdx}`,
    params
  );

  const leaderboard = rows.map((r: Record<string, unknown>, i: number) => ({
    rank: i + 1,
    builder_name: r.builder_name,
    builder_email: r.builder_email,
    department: r.department,
    app_count: parseInt(r.app_count as string, 10),
    active_app_count: parseInt(r.active_app_count as string, 10),
  }));

  res.json({
    period,
    period_start: periodStart,
    period_end: periodEnd,
    leaderboard,
  });
});

// GET /dashboard/builder/:email
router.get('/builder/:email', async (req: Request, res: Response) => {
  const email = req.params.email;

  const { rows: apps } = await query(
    'SELECT * FROM apps WHERE builder_email = $1 ORDER BY registered_at DESC',
    [email]
  );

  if (apps.length === 0) {
    res.status(404).json({ error: 'No apps found for this builder' });
    return;
  }

  const toolCounts: Record<string, number> = {};
  let activeCount = 0;
  apps.forEach((app: Record<string, unknown>) => {
    const tool = app.build_tool as string;
    toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    if (app.status === 'active') activeCount++;
  });

  res.json({
    builder_name: apps[0].builder_name,
    builder_email: email,
    department: apps[0].department,
    total_apps: apps.length,
    active_apps: activeCount,
    first_registration: apps[apps.length - 1].registered_at,
    latest_registration: apps[0].registered_at,
    apps: apps.map((a: Record<string, unknown>) => ({
      id: a.id,
      app_name: a.app_name,
      app_description: a.app_description,
      build_tool: a.build_tool,
      status: a.status,
      user_count: a.user_count,
      registered_at: a.registered_at,
      last_checkin: a.last_checkin,
    })),
    tools_used: toolCounts,
  });
});

// GET /dashboard/staleness
router.get('/staleness', async (req: Request, res: Response) => {
  const { stale_days = '90', department } = req.query;
  const staleDays = parseInt(stale_days as string, 10) || 90;

  const conditions = [`last_checkin < NOW() - INTERVAL '1 day' * $1`];
  const params: unknown[] = [staleDays];
  let paramIdx = 2;

  if (department) {
    conditions.push(`department = $${paramIdx++}`);
    params.push(department);
  }

  const { rows } = await query(
    `SELECT id, app_name, builder_name, department, last_checkin, status,
     EXTRACT(DAY FROM NOW() - last_checkin)::int as days_since_checkin
     FROM apps WHERE ${conditions.join(' AND ')}
     ORDER BY last_checkin ASC`,
    params
  );

  res.json({
    stale_threshold_days: staleDays,
    stale_apps: rows,
    total_stale: rows.length,
  });
});

// GET /dashboard/export
router.get('/export', async (req: Request, res: Response) => {
  const { format = 'csv', department, builder_email, build_tool, status } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (department) { conditions.push(`department = $${paramIdx++}`); params.push(department); }
  if (builder_email) { conditions.push(`builder_email = $${paramIdx++}`); params.push(builder_email); }
  if (build_tool) { conditions.push(`build_tool = $${paramIdx++}`); params.push(build_tool); }
  if (status) { conditions.push(`status = $${paramIdx++}`); params.push(status); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM apps ${where} ORDER BY registered_at DESC`, params);

  if (format === 'json') {
    res.setHeader('Content-Disposition', 'attachment; filename="app-registry-export.json"');
    res.json(rows);
    return;
  }

  // CSV export
  if (rows.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="app-registry-export.csv"');
    res.send('');
    return;
  }

  const headers = ['id', 'app_name', 'app_description', 'builder_name', 'builder_email', 'department', 'build_tool', 'app_type', 'tech_stack', 'repo_url', 'deployment_url', 'user_count', 'status', 'registered_at', 'last_checkin'];

  const csvRows = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return `"${val.join('; ')}"`;
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="app-registry-export.csv"');
  res.send(csvRows.join('\n'));
});

export default router;
