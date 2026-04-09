import { Router, Request, Response } from 'express';

const router = Router();

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AI App Registry API',
    description: 'Central registry for AI-built applications within an organization.',
    version: '1.0.0',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/apps': {
      post: {
        summary: 'Register a new application',
        operationId: 'registerApp',
        tags: ['Apps'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AppRegistration' },
            },
          },
        },
        responses: {
          '201': { description: 'App registered successfully' },
          '400': { description: 'Validation error' },
          '409': { description: 'Duplicate registration' },
        },
      },
      get: {
        summary: 'List registered apps',
        operationId: 'listApps',
        tags: ['Apps'],
        parameters: [
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'builder_email', in: 'query', schema: { type: 'string' } },
          { name: 'build_tool', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: {
          '200': { description: 'Paginated list of apps' },
        },
      },
    },
    '/apps/{id}': {
      get: {
        summary: 'Get a single app',
        operationId: 'getApp',
        tags: ['Apps'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'App details' }, '404': { description: 'Not found' } },
      },
      patch: {
        summary: 'Update an app registration',
        operationId: 'updateApp',
        tags: ['Apps'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AppUpdate' } } },
        },
        responses: { '200': { description: 'Updated app' }, '404': { description: 'Not found' } },
      },
    },
    '/apps/{id}/checkin': {
      post: {
        summary: 'Check in / heartbeat for an app',
        operationId: 'checkinApp',
        tags: ['Apps'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Checkin recorded' } },
      },
    },
    '/skills': {
      get: {
        summary: 'List available skill packages',
        operationId: 'listSkills',
        tags: ['Skills'],
        responses: { '200': { description: 'List of skill packages' } },
      },
    },
    '/skills/{tool}': {
      get: {
        summary: 'Get skill package for a specific tool',
        operationId: 'getSkill',
        tags: ['Skills'],
        parameters: [{ name: 'tool', in: 'path', required: true, schema: { type: 'string', enum: ['claude-code', 'cursor', 'copilot', 'codex'] } }],
        responses: { '200': { description: 'Skill metadata' } },
      },
    },
    '/skills/{tool}/download': {
      get: {
        summary: 'Download skill package ZIP',
        operationId: 'downloadSkill',
        tags: ['Skills'],
        parameters: [{ name: 'tool', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'ZIP file' } },
      },
    },
    '/dashboard/summary': {
      get: { summary: 'Dashboard summary metrics', operationId: 'getSummary', tags: ['Dashboard'], responses: { '200': { description: 'Summary' } } },
    },
    '/dashboard/leaderboard': {
      get: { summary: 'Builder leaderboard', operationId: 'getLeaderboard', tags: ['Dashboard'], responses: { '200': { description: 'Leaderboard' } } },
    },
    '/dashboard/builder/{email}': {
      get: {
        summary: 'Builder profile',
        operationId: 'getBuilderProfile',
        tags: ['Dashboard'],
        parameters: [{ name: 'email', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Builder report' } },
      },
    },
    '/dashboard/staleness': {
      get: { summary: 'Stale apps report', operationId: 'getStaleness', tags: ['Dashboard'], responses: { '200': { description: 'Stale apps' } } },
    },
    '/dashboard/export': {
      get: { summary: 'Export registry data', operationId: 'exportData', tags: ['Dashboard'], responses: { '200': { description: 'CSV or JSON export' } } },
    },
    '/admin/api-keys': {
      post: { summary: 'Create API key', operationId: 'createApiKey', tags: ['Admin'], responses: { '201': { description: 'Key created' } } },
      get: { summary: 'List API keys', operationId: 'listApiKeys', tags: ['Admin'], responses: { '200': { description: 'Key list' } } },
    },
    '/admin/api-keys/{id}': {
      delete: {
        summary: 'Revoke API key',
        operationId: 'revokeApiKey',
        tags: ['Admin'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Key revoked' } },
      },
    },
  },
  components: {
    schemas: {
      AppRegistration: {
        type: 'object',
        required: ['app_name', 'app_description', 'builder_name', 'builder_email', 'department', 'build_tool'],
        properties: {
          app_name: { type: 'string' },
          app_description: { type: 'string' },
          builder_name: { type: 'string' },
          builder_email: { type: 'string', format: 'email' },
          department: { type: 'string' },
          build_tool: { type: 'string', enum: ['claude-code', 'cursor', 'copilot', 'codex', 'cowork', 'other'] },
          app_type: { type: 'string', enum: ['html-app', 'script', 'cli-tool', 'api-service', 'automation', 'other'] },
          tech_stack: { type: 'array', items: { type: 'string' } },
          repo_url: { type: 'string' },
          deployment_url: { type: 'string' },
          user_count: { type: 'integer' },
          status: { type: 'string', enum: ['active', 'experimental', 'deprecated', 'retired'] },
          metadata: { type: 'object' },
        },
      },
      AppUpdate: {
        type: 'object',
        properties: {
          app_name: { type: 'string' },
          app_description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'experimental', 'deprecated', 'retired'] },
          user_count: { type: 'integer' },
          metadata: { type: 'object' },
        },
      },
    },
    securitySchemes: {
      ApiKeyAuth: { type: 'http', scheme: 'bearer' },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};

router.get('/', (_req: Request, res: Response) => {
  res.json(openapiSpec);
});

export default router;
