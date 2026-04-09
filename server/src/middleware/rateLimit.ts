import rateLimit from 'express-rate-limit';

export const registrationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => req.auth?.email || req.ip || 'unknown',
  message: { error: 'Too many requests. Limit: 10 per minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.auth?.email || req.ip || 'unknown',
  message: { error: 'Too many requests. Limit: 100 per minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
