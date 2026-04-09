import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../db';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        keyId: string;
        email: string;
        role: 'builder' | 'admin';
      };
    }
  }
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const apiKey = authHeader.slice(7);
  const keyHash = hashKey(apiKey);

  const { rows } = await query(
    'SELECT id, owner_email, role, revoked FROM api_keys WHERE key_hash = $1',
    [keyHash]
  );

  if (rows.length === 0) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const keyRecord = rows[0];
  if (keyRecord.revoked) {
    res.status(401).json({ error: 'API key has been revoked' });
    return;
  }

  // Update last_used_at
  query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyRecord.id]).catch(() => {});

  req.auth = {
    keyId: keyRecord.id,
    email: keyRecord.owner_email,
    role: keyRecord.role,
  };

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export { hashKey };
