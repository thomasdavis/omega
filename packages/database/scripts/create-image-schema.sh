#!/bin/bash
# Create comprehensive image schema with taxonomy, request logging, and extensibility
# Usage: railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-image-schema.sh'

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Creating comprehensive image schema..."

psql "$DB_URL" << 'EOF'

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- TAXONOMY TABLES
-- ============================================

-- Image Types (e.g., photo, illustration, diagram, etc.)
CREATE TABLE IF NOT EXISTS image_types (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image Categories (hierarchical, e.g., nature > landscape > mountain)
CREATE TABLE IF NOT EXISTS image_categories (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  label TEXT NOT NULL,
  parent_id BIGINT REFERENCES image_categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image Styles (e.g., realistic, cartoon, watercolor, etc.)
CREATE TABLE IF NOT EXISTS image_styles (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  style_params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image Subjects (normalized subject names)
CREATE TABLE IF NOT EXISTS image_subjects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  synonyms TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image Tags (freeform tags for search)
CREATE TABLE IF NOT EXISTS image_tags (
  id BIGSERIAL PRIMARY KEY,
  tag TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Image Providers (e.g., gemini, dall-e, stable-diffusion)
CREATE TABLE IF NOT EXISTS image_providers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  model TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REQUEST AND IMAGE TABLES
-- ============================================

-- Image Requests (one row per user request)
CREATE TABLE IF NOT EXISTS image_requests (
  id BIGSERIAL PRIMARY KEY,
  request_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  username TEXT,
  source TEXT,
  tool_name TEXT NOT NULL,
  provider_id BIGINT REFERENCES image_providers(id),
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  requested_type_id BIGINT REFERENCES image_types(id),
  requested_category_id BIGINT REFERENCES image_categories(id),
  requested_style_id BIGINT REFERENCES image_styles(id),
  subject TEXT,
  tags TEXT[],
  model TEXT,
  size VARCHAR(32),
  quality VARCHAR(32),
  n INTEGER DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','error','partial')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Images (one row per generated asset/variant)
CREATE TABLE IF NOT EXISTS images (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES image_requests(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  username TEXT,
  storage_url TEXT NOT NULL,
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'omega',
  variant_label TEXT,
  width INTEGER,
  height INTEGER,
  mime_type VARCHAR(50),
  bytes INTEGER,
  sha256 CHAR(64),
  type_id BIGINT REFERENCES image_types(id),
  category_id BIGINT REFERENCES image_categories(id),
  style_id BIGINT REFERENCES image_styles(id),
  subject TEXT,
  tags TEXT[],
  metadata JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted','error')),
  error TEXT,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MAPPING TABLES
-- ============================================

-- Image Subject Map (many-to-many)
CREATE TABLE IF NOT EXISTS image_subject_map (
  image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  subject_id BIGINT NOT NULL REFERENCES image_subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, subject_id)
);

-- Image Tag Map (many-to-many)
CREATE TABLE IF NOT EXISTS image_tag_map (
  image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES image_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, tag_id)
);

-- ============================================
-- EMBEDDINGS TABLE (Future-ready)
-- ============================================

-- Image Embeddings (for semantic search, future pgvector migration)
CREATE TABLE IF NOT EXISTS image_embeddings (
  id BIGSERIAL PRIMARY KEY,
  image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  caption TEXT,
  embedding JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Request indexes
CREATE INDEX IF NOT EXISTS idx_image_requests_user_time ON image_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_requests_uuid ON image_requests(request_uuid);
CREATE INDEX IF NOT EXISTS idx_image_requests_status ON image_requests(status);
CREATE INDEX IF NOT EXISTS idx_image_requests_tags_gin ON image_requests USING GIN (tags);

-- Image indexes
CREATE INDEX IF NOT EXISTS idx_images_request_id ON images(request_id);
CREATE INDEX IF NOT EXISTS idx_images_user_time ON images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_storage_url ON images(storage_url);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_metadata_gin ON images USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_images_tags_gin ON images USING GIN (tags);

-- Taxonomy indexes
CREATE INDEX IF NOT EXISTS idx_image_categories_parent ON image_categories(parent_id);

-- ============================================
-- VIEWS
-- ============================================

-- Enriched images view (convenience join with taxonomy)
CREATE OR REPLACE VIEW v_images_enriched AS
SELECT i.id,
       i.request_id,
       r.request_uuid,
       i.user_id,
       i.username,
       i.storage_url,
       i.storage_provider,
       i.variant_label,
       i.width,
       i.height,
       i.mime_type,
       i.bytes,
       i.sha256,
       COALESCE(t.label, '—') AS type_label,
       COALESCE(c.label, '—') AS category_label,
       COALESCE(s.label, '—') AS style_label,
       i.subject,
       i.tags,
       i.metadata,
       i.status,
       i.error,
       i.message_id,
       i.created_at
FROM images i
LEFT JOIN image_requests r ON r.id = i.request_id
LEFT JOIN image_types t ON t.id = i.type_id
LEFT JOIN image_categories c ON c.id = i.category_id
LEFT JOIN image_styles s ON s.id = i.style_id;

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Trigger for image_requests
DROP TRIGGER IF EXISTS trg_image_requests_updated ON image_requests;
CREATE TRIGGER trg_image_requests_updated
BEFORE UPDATE ON image_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- SEED DATA (Initial taxonomy)
-- ============================================

-- Insert default image types
INSERT INTO image_types (key, label, description) VALUES
  ('photo', 'Photo', 'Photorealistic image'),
  ('illustration', 'Illustration', 'Hand-drawn or digital illustration'),
  ('diagram', 'Diagram', 'Technical or informational diagram'),
  ('artwork', 'Artwork', 'Artistic creation'),
  ('portrait', 'Portrait', 'Portrait of a person or character'),
  ('landscape', 'Landscape', 'Landscape or scenery'),
  ('icon', 'Icon', 'Icon or emoji'),
  ('comic', 'Comic', 'Comic panel or page'),
  ('avatar', 'Avatar', 'User avatar or profile picture'),
  ('other', 'Other', 'Other type of image')
ON CONFLICT (key) DO NOTHING;

-- Insert default image styles
INSERT INTO image_styles (key, label, description) VALUES
  ('realistic', 'Realistic', 'Photorealistic style'),
  ('cartoon', 'Cartoon', 'Cartoon or animated style'),
  ('anime', 'Anime', 'Anime or manga style'),
  ('watercolor', 'Watercolor', 'Watercolor painting style'),
  ('oil-painting', 'Oil Painting', 'Oil painting style'),
  ('sketch', 'Sketch', 'Pencil or pen sketch'),
  ('digital-art', 'Digital Art', 'Digital art style'),
  ('pixel-art', 'Pixel Art', 'Pixel art style'),
  ('3d-render', '3D Render', '3D rendered style'),
  ('minimalist', 'Minimalist', 'Minimalist style'),
  ('abstract', 'Abstract', 'Abstract style'),
  ('vintage', 'Vintage', 'Vintage or retro style'),
  ('modern', 'Modern', 'Modern contemporary style')
ON CONFLICT (key) DO NOTHING;

-- Insert default providers
INSERT INTO image_providers (name, model, notes) VALUES
  ('gemini', 'gemini-3-pro-image-preview', 'Google Gemini image generation'),
  ('dall-e', 'dall-e-3', 'OpenAI DALL-E 3'),
  ('stable-diffusion', 'stable-diffusion-xl', 'Stability AI Stable Diffusion')
ON CONFLICT (name) DO NOTHING;

-- Insert default categories (hierarchical)
INSERT INTO image_categories (key, label, parent_id, description) VALUES
  ('nature', 'Nature', NULL, 'Natural scenes and elements'),
  ('people', 'People', NULL, 'Human subjects'),
  ('animals', 'Animals', NULL, 'Animal subjects'),
  ('objects', 'Objects', NULL, 'Inanimate objects'),
  ('abstract', 'Abstract', NULL, 'Abstract concepts'),
  ('architecture', 'Architecture', NULL, 'Buildings and structures'),
  ('food', 'Food', NULL, 'Food and beverages'),
  ('technology', 'Technology', NULL, 'Technology and gadgets'),
  ('art', 'Art', NULL, 'Artistic creations'),
  ('other', 'Other', NULL, 'Other categories')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify all tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'image_types',
    'image_categories',
    'image_styles',
    'image_subjects',
    'image_tags',
    'image_providers',
    'image_requests',
    'images',
    'image_subject_map',
    'image_tag_map',
    'image_embeddings'
  )
ORDER BY table_name;

-- Verify view was created
SELECT COUNT(*) as view_count
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'v_images_enriched';

-- Show sample taxonomy data
SELECT 'Image Types' as category, COUNT(*) as count FROM image_types
UNION ALL
SELECT 'Image Styles', COUNT(*) FROM image_styles
UNION ALL
SELECT 'Image Providers', COUNT(*) FROM image_providers
UNION ALL
SELECT 'Image Categories', COUNT(*) FROM image_categories;

EOF

echo "✅ Image schema migration completed successfully!"
