export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://registry:registry@localhost:5432/app_registry',
  apiKeySecret: process.env.API_KEY_SECRET || 'change-me-in-production',
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'acme.com').split(',').map(d => d.trim()),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8080').split(',').map(o => o.trim()),
  skillStoragePath: process.env.SKILL_STORAGE_PATH || './skills',
};
