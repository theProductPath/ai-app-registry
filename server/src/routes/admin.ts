import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { hashKey } from '../middleware/auth';

const router = Router();

// POST /admin/api-keys — Provision a new API key
router.post('/api-keys', async (req: Request, res: Response) => {
  const { owner_email, role } = req.body;

  if (!owner_email || !role) {
    res.status(400).json({ error: 'Missing required fields: owner_email, role' });
    return;
  }

  if (!['builder', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role. Must be "builder" or "admin"' });
    return;
  }

  // Generate a new API key
  const rawKey = `sk-ar-${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 8);

  const result = await query(
    `INSERT INTO api_keys (key_hash, key_prefix, owner_email, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, key_prefix, owner_email, role, created_at`,
    [keyHash, keyPrefix, owner_email, role]
  );

  res.status(201).json({
    api_key: rawKey,
    ...result.rows[0],
  });
});

// GET /admin/api-keys — List all keys
router.get('/api-keys', async (_req: Request, res: Response) => {
  const { rows } = await query(
    'SELECT id, key_prefix, owner_email, role, created_at, last_used_at, revoked FROM api_keys ORDER BY created_at DESC'
  );
  res.json({ keys: rows });
});

// DELETE /admin/api-keys/:id — Revoke a key
router.delete('/api-keys/:id', async (req: Request, res: Response) => {
  const result = await query(
    'UPDATE api_keys SET revoked = true WHERE id = $1 RETURNING id, key_prefix, owner_email, revoked',
    [req.params.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  res.json(result.rows[0]);
});

export default router;
