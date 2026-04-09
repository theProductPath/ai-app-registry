-- AI App Registry — Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name VARCHAR(255) NOT NULL,
  app_description TEXT NOT NULL,
  builder_name VARCHAR(255) NOT NULL,
  builder_email VARCHAR(255) NOT NULL,
  department VARCHAR(128) NOT NULL,
  build_tool VARCHAR(64) NOT NULL CHECK (build_tool IN ('claude-code', 'cursor', 'copilot', 'codex', 'cowork', 'other')),
  app_type VARCHAR(64) CHECK (app_type IN ('html-app', 'script', 'cli-tool', 'api-service', 'automation', 'other')),
  tech_stack TEXT[],
  repo_url VARCHAR(512),
  deployment_url VARCHAR(512),
  user_count INTEGER,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'experimental', 'deprecated', 'retired')),
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_checkin TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(app_name, builder_email)
);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  active_users INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS skill_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool VARCHAR(64) NOT NULL CHECK (tool IN ('claude-code', 'cursor', 'copilot', 'codex')),
  version VARCHAR(32) NOT NULL,
  format VARCHAR(64) NOT NULL,
  package_path VARCHAR(512) NOT NULL,
  checksum VARCHAR(128) NOT NULL,
  install_instructions TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_current BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR(128) NOT NULL UNIQUE,
  key_prefix VARCHAR(8) NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('builder', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  revoked BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apps_department ON apps(department);
CREATE INDEX IF NOT EXISTS idx_apps_builder_email ON apps(builder_email);
CREATE INDEX IF NOT EXISTS idx_apps_build_tool ON apps(build_tool);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_registered_at ON apps(registered_at);
CREATE INDEX IF NOT EXISTS idx_apps_last_checkin ON apps(last_checkin);
CREATE INDEX IF NOT EXISTS idx_checkins_app_id ON checkins(app_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_skill_packages_tool ON skill_packages(tool);
