#!/bin/bash
# Create image generation schema with jobs, assets, taxonomy, and extensibility
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-image-generation-schema.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating image generation schema..."

psql "$DB_URL" << 'EOF'
-- Enable pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) image_jobs — one per generation request
CREATE TABLE IF NOT EXISTS image_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  prompt TEXT NOT NULL,
  params JSONB,
  model VARCHAR(64) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','generating','succeeded','failed')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retries INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_image_jobs_user_id ON image_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_image_jobs_status ON image_jobs(status);
CREATE INDEX IF NOT EXISTS idx_image_jobs_requested_at ON image_jobs(requested_at DESC);

-- 2) images — one per generated asset/variant
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES image_jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT,
  width INTEGER,
  height INTEGER,
  format VARCHAR(16),
  bytes INTEGER,
  checksum_sha256 TEXT,
  variant VARCHAR(32) DEFAULT 'original',
  metadata JSONB,
  -- optional denormalized convenience
  type_name TEXT,
  style_names TEXT[],
  category_names TEXT[],
  subject_names TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_job_id ON images(job_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
CREATE INDEX IF NOT EXISTS idx_images_variant ON images(variant);

-- 3) Taxonomy reference tables
CREATE TABLE IF NOT EXISTS image_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS image_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS image_styles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS image_subjects (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 4) Mapping tables (many-to-many per asset)
CREATE TABLE IF NOT EXISTS image_to_type (
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  type_id INT NOT NULL REFERENCES image_types(id) ON DELETE RESTRICT,
  PRIMARY KEY (image_id, type_id)
);

CREATE TABLE IF NOT EXISTS image_to_category (
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES image_categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (image_id, category_id)
);

CREATE TABLE IF NOT EXISTS image_to_style (
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  style_id INT NOT NULL REFERENCES image_styles(id) ON DELETE RESTRICT,
  PRIMARY KEY (image_id, style_id)
);

CREATE TABLE IF NOT EXISTS image_to_subject (
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  subject_id INT NOT NULL REFERENCES image_subjects(id) ON DELETE RESTRICT,
  PRIMARY KEY (image_id, subject_id)
);

-- 5) Tags (freeform)
CREATE TABLE IF NOT EXISTS image_tags (
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (image_id, tag)
);

-- Seed initial taxonomy data
-- Types
INSERT INTO image_types (name, description) VALUES
  ('illustration', 'Hand-drawn or digital illustration')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_types (name, description) VALUES
  ('concept_art', 'Concept art for games, films, or projects')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_types (name, description) VALUES
  ('photo', 'Photorealistic image')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_types (name, description) VALUES
  ('avatar', 'Profile picture or character avatar')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_types (name, description) VALUES
  ('logo', 'Brand or project logo')
ON CONFLICT (name) DO NOTHING;

-- Styles
INSERT INTO image_styles (name, description) VALUES
  ('watercolor', 'Watercolor painting style')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_styles (name, description) VALUES
  ('oil_painting', 'Oil painting style')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_styles (name, description) VALUES
  ('cyberpunk', 'Cyberpunk aesthetic')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_styles (name, description) VALUES
  ('minimalism', 'Minimalist design')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_styles (name, description) VALUES
  ('wyeth', 'Andrew Wyeth style')
ON CONFLICT (name) DO NOTHING;

INSERT INTO image_styles (name, description) VALUES
  ('ives', 'Currier and Ives style')
ON CONFLICT (name) DO NOTHING;

-- Log in schema_registry for governance
-- First, ensure schema_registry table exists (it should from create-schema-registry-tables.sh)
INSERT INTO schema_registry (name, description, owner, is_active, created_at, updated_at)
VALUES (
  'image_generation',
  'Extensible schema for image generation jobs, assets, taxonomy (types/categories/styles/subjects), and auto-extension',
  'system',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Log schema fields for image_jobs
DO $$
DECLARE
  schema_id_var INTEGER;
BEGIN
  SELECT id INTO schema_id_var FROM schema_registry WHERE name = 'image_generation';

  IF schema_id_var IS NOT NULL THEN
    -- Clear existing fields for this schema to avoid duplicates
    DELETE FROM schema_fields WHERE schema_id = schema_id_var;

    -- Insert image_jobs fields
    INSERT INTO schema_fields (schema_id, field_name, field_type, is_nullable, metadata)
    VALUES
      (schema_id_var, 'image_jobs.id', 'UUID', FALSE, '{"description": "Primary key"}'),
      (schema_id_var, 'image_jobs.user_id', 'VARCHAR(255)', FALSE, '{"description": "Discord user ID"}'),
      (schema_id_var, 'image_jobs.username', 'VARCHAR(255)', TRUE, '{"description": "Discord username"}'),
      (schema_id_var, 'image_jobs.prompt', 'TEXT', FALSE, '{"description": "User prompt"}'),
      (schema_id_var, 'image_jobs.params', 'JSONB', TRUE, '{"description": "Generation parameters"}'),
      (schema_id_var, 'image_jobs.model', 'VARCHAR(64)', FALSE, '{"description": "AI model used"}'),
      (schema_id_var, 'image_jobs.status', 'TEXT', FALSE, '{"description": "Job status: queued, generating, succeeded, failed"}'),
      (schema_id_var, 'image_jobs.requested_at', 'TIMESTAMPTZ', FALSE, '{"description": "Request timestamp"}'),
      (schema_id_var, 'image_jobs.started_at', 'TIMESTAMPTZ', TRUE, '{"description": "Start timestamp"}'),
      (schema_id_var, 'image_jobs.completed_at', 'TIMESTAMPTZ', TRUE, '{"description": "Completion timestamp"}'),
      (schema_id_var, 'image_jobs.error_message', 'TEXT', TRUE, '{"description": "Error message if failed"}'),
      (schema_id_var, 'image_jobs.retries', 'INTEGER', FALSE, '{"description": "Number of retries"}'),

      -- images fields
      (schema_id_var, 'images.id', 'UUID', FALSE, '{"description": "Primary key"}'),
      (schema_id_var, 'images.job_id', 'UUID', FALSE, '{"description": "Foreign key to image_jobs"}'),
      (schema_id_var, 'images.url', 'TEXT', FALSE, '{"description": "Public URL"}'),
      (schema_id_var, 'images.storage_key', 'TEXT', TRUE, '{"description": "Internal storage key"}'),
      (schema_id_var, 'images.width', 'INTEGER', TRUE, '{"description": "Image width"}'),
      (schema_id_var, 'images.height', 'INTEGER', TRUE, '{"description": "Image height"}'),
      (schema_id_var, 'images.format', 'VARCHAR(16)', TRUE, '{"description": "Image format"}'),
      (schema_id_var, 'images.bytes', 'INTEGER', TRUE, '{"description": "File size in bytes"}'),
      (schema_id_var, 'images.checksum_sha256', 'TEXT', TRUE, '{"description": "SHA256 checksum"}'),
      (schema_id_var, 'images.variant', 'VARCHAR(32)', FALSE, '{"description": "Variant type"}'),
      (schema_id_var, 'images.metadata', 'JSONB', TRUE, '{"description": "Additional metadata"}'),
      (schema_id_var, 'images.type_name', 'TEXT', TRUE, '{"description": "Denormalized type name"}'),
      (schema_id_var, 'images.style_names', 'TEXT[]', TRUE, '{"description": "Denormalized style names"}'),
      (schema_id_var, 'images.category_names', 'TEXT[]', TRUE, '{"description": "Denormalized category names"}'),
      (schema_id_var, 'images.subject_names', 'TEXT[]', TRUE, '{"description": "Denormalized subject names"}'),
      (schema_id_var, 'images.created_at', 'TIMESTAMPTZ', FALSE, '{"description": "Creation timestamp"}'),

      -- taxonomy tables
      (schema_id_var, 'image_types.id', 'SERIAL', FALSE, '{"description": "Primary key"}'),
      (schema_id_var, 'image_types.name', 'TEXT', FALSE, '{"description": "Type name (unique)"}'),
      (schema_id_var, 'image_types.description', 'TEXT', TRUE, '{"description": "Type description"}'),

      (schema_id_var, 'image_categories.id', 'SERIAL', FALSE, '{"description": "Primary key"}'),
      (schema_id_var, 'image_categories.name', 'TEXT', FALSE, '{"description": "Category name (unique)"}'),
      (schema_id_var, 'image_categories.description', 'TEXT', TRUE, '{"description": "Category description"}'),

      (schema_id_var, 'image_styles.id', 'SERIAL', FALSE, '{"description": "Primary key"}'),
      (schema_id_var, 'image_styles.name', 'TEXT', FALSE, '{"description": "Style name (unique)"}'),
      (schema_id_var, 'image_styles.description', 'TEXT', TRUE, '{"description": "Style description"}'),

      (schema_id_var, 'image_subjects.id', 'SERIAL', FALSE, '{"description": "Primary key"}'),
      (schema_id_var, 'image_subjects.name', 'TEXT', FALSE, '{"description": "Subject name (unique)"}'),
      (schema_id_var, 'image_subjects.description', 'TEXT', TRUE, '{"description": "Subject description"}');
  END IF;
END $$;

-- Log schema change in schema_changes_audit
DO $$
DECLARE
  schema_id_var INTEGER;
BEGIN
  SELECT id INTO schema_id_var FROM schema_registry WHERE name = 'image_generation';

  IF schema_id_var IS NOT NULL THEN
    INSERT INTO schema_changes_audit (schema_id, change_summary, migration_sql, applied_by, applied_at)
    VALUES (
      schema_id_var,
      'Initial creation of image generation schema with jobs, assets, taxonomy tables, and mappings',
      'CREATE TABLE image_jobs, images, image_types, image_categories, image_styles, image_subjects, mapping tables, image_tags',
      'system',
      NOW()
    );
  END IF;
END $$;

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'image_jobs',
    'images',
    'image_types',
    'image_categories',
    'image_styles',
    'image_subjects',
    'image_to_type',
    'image_to_category',
    'image_to_style',
    'image_to_subject',
    'image_tags'
  )
ORDER BY table_name;

-- Show seed data counts
SELECT
  'image_types' as table_name,
  COUNT(*) as count
FROM image_types
UNION ALL
SELECT
  'image_styles' as table_name,
  COUNT(*) as count
FROM image_styles
ORDER BY table_name;

EOF

echo "✅ Image generation schema created successfully!"
