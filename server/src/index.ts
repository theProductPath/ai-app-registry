import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { authenticate, requireAdmin } from './middleware/auth';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import appsRouter from './routes/apps';
import skillsRouter from './routes/skills';
import adminRouter from './routes/admin';
import dashboardRouter from './routes/dashboard';
import openapiRouter from './routes/openapi';

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());
app.use(generalLimiter);

// Health check (no auth)
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAPI spec (no auth for Copilot integration)
app.use('/api/v1/openapi.json', openapiRouter);

// Skill download endpoints (no auth — public distribution)
app.use('/api/v1/skills', skillsRouter);

// Authenticated routes
app.use('/api/v1/apps', authenticate, appsRouter);
app.use('/api/v1/dashboard', authenticate, dashboardRouter);
app.use('/api/v1/admin', authenticate, requireAdmin, adminRouter);

// Serve web UI (static files from built React app)
const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
app.use(express.static(webDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`AI App Registry running on port ${config.port}`);
});

export default app;
