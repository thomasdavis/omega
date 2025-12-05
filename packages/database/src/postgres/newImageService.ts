/**
 * New Image Service - Comprehensive image management with taxonomy and request logging
 *
 * This service provides functions for:
 * - Managing image requests and generated images
 * - Working with taxonomy (types, categories, styles, subjects, tags)
 * - Schema registry integration for metadata extensibility
 * - Backward compatibility with legacy generated_images table
 */

import { Pool } from 'pg';

// Connection pool - will be initialized on first use
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable not set');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

// ============================================
// TYPES
// ============================================

export interface ImageRequest {
  id: number;
  request_uuid: string;
  user_id: string;
  username?: string;
  source?: string;
  tool_name: string;
  provider_id?: number;
  prompt: string;
  negative_prompt?: string;
  requested_type_id?: number;
  requested_category_id?: number;
  requested_style_id?: number;
  subject?: string;
  tags?: string[];
  model?: string;
  size?: string;
  quality?: string;
  n: number;
  status: 'pending' | 'processing' | 'success' | 'error' | 'partial';
  error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Image {
  id: number;
  request_id: number;
  user_id: string;
  username?: string;
  storage_url: string;
  storage_provider: string;
  variant_label?: string;
  width?: number;
  height?: number;
  mime_type?: string;
  bytes?: number;
  sha256?: string;
  type_id?: number;
  category_id?: number;
  style_id?: number;
  subject?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  status: 'active' | 'archived' | 'deleted' | 'error';
  error?: string;
  message_id?: string;
  created_at: Date;
}

export interface CreateImageRequestInput {
  user_id: string;
  username?: string;
  source?: string;
  tool_name: string;
  prompt: string;
  negative_prompt?: string;
  type_key?: string;
  category_key?: string;
  style_key?: string;
  subject?: string;
  tags?: string[];
  model?: string;
  size?: string;
  quality?: string;
  n?: number;
}

export interface CreateImageInput {
  request_id: number;
  user_id: string;
  username?: string;
  storage_url: string;
  storage_provider?: string;
  variant_label?: string;
  width?: number;
  height?: number;
  mime_type?: string;
  bytes?: number;
  sha256?: string;
  type_key?: string;
  category_key?: string;
  style_key?: string;
  subject?: string;
  subjects?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  message_id?: string;
}

// ============================================
// TAXONOMY FUNCTIONS
// ============================================

/**
 * Upsert image type by key
 */
export async function upsertImageType(key: string, label: string, description?: string): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO image_types (key, label, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET label = $2, description = $3
     RETURNING id`,
    [key, label, description]
  );
  return result.rows[0].id;
}

/**
 * Upsert image category by key
 */
export async function upsertImageCategory(
  key: string,
  label: string,
  parentKey?: string,
  description?: string
): Promise<number> {
  const db = getPool();

  let parentId: number | null = null;
  if (parentKey) {
    const parentResult = await db.query('SELECT id FROM image_categories WHERE key = $1', [parentKey]);
    if (parentResult.rows.length > 0) {
      parentId = parentResult.rows[0].id;
    }
  }

  const result = await db.query(
    `INSERT INTO image_categories (key, label, parent_id, description)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET label = $2, parent_id = $3, description = $4
     RETURNING id`,
    [key, label, parentId, description]
  );
  return result.rows[0].id;
}

/**
 * Upsert image style by key
 */
export async function upsertImageStyle(
  key: string,
  label: string,
  description?: string,
  styleParams?: Record<string, any>
): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO image_styles (key, label, description, style_params)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET label = $2, description = $3, style_params = $4
     RETURNING id`,
    [key, label, description, styleParams ? JSON.stringify(styleParams) : null]
  );
  return result.rows[0].id;
}

/**
 * Upsert image subject by name
 */
export async function upsertImageSubject(name: string, synonyms?: string[], description?: string): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO image_subjects (name, synonyms, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET synonyms = $2, description = $3
     RETURNING id`,
    [name, synonyms, description]
  );
  return result.rows[0].id;
}

/**
 * Upsert image tag
 */
export async function upsertImageTag(tag: string): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO image_tags (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET tag = $1 RETURNING id`,
    [tag]
  );
  return result.rows[0].id;
}

/**
 * Upsert image provider
 */
export async function upsertImageProvider(name: string, model?: string, notes?: string): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO image_providers (name, model, notes)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET model = $2, notes = $3
     RETURNING id`,
    [name, model, notes]
  );
  return result.rows[0].id;
}

/**
 * Get taxonomy ID by key
 */
export async function getTypeIdByKey(key: string): Promise<number | null> {
  const db = getPool();
  const result = await db.query('SELECT id FROM image_types WHERE key = $1', [key]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

export async function getCategoryIdByKey(key: string): Promise<number | null> {
  const db = getPool();
  const result = await db.query('SELECT id FROM image_categories WHERE key = $1', [key]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

export async function getStyleIdByKey(key: string): Promise<number | null> {
  const db = getPool();
  const result = await db.query('SELECT id FROM image_styles WHERE key = $1', [key]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

export async function getProviderIdByName(name: string): Promise<number | null> {
  const db = getPool();
  const result = await db.query('SELECT id FROM image_providers WHERE name = $1', [name]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ============================================
// REQUEST FUNCTIONS
// ============================================

/**
 * Create an image request
 */
export async function createImageRequest(input: CreateImageRequestInput): Promise<ImageRequest> {
  const db = getPool();

  // Get taxonomy IDs
  let typeId: number | null = null;
  let categoryId: number | null = null;
  let styleId: number | null = null;

  if (input.type_key) {
    typeId = await getTypeIdByKey(input.type_key);
  }
  if (input.category_key) {
    categoryId = await getCategoryIdByKey(input.category_key);
  }
  if (input.style_key) {
    styleId = await getStyleIdByKey(input.style_key);
  }

  const result = await db.query(
    `INSERT INTO image_requests (
      user_id, username, source, tool_name, prompt, negative_prompt,
      requested_type_id, requested_category_id, requested_style_id,
      subject, tags, model, size, quality, n, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      input.user_id,
      input.username,
      input.source,
      input.tool_name,
      input.prompt,
      input.negative_prompt,
      typeId,
      categoryId,
      styleId,
      input.subject,
      input.tags,
      input.model,
      input.size,
      input.quality,
      input.n || 1,
      'processing'
    ]
  );

  return result.rows[0];
}

/**
 * Update image request status
 */
export async function updateImageRequestStatus(
  requestId: number,
  status: 'pending' | 'processing' | 'success' | 'error' | 'partial',
  error?: string
): Promise<void> {
  const db = getPool();
  await db.query(
    'UPDATE image_requests SET status = $1, error = $2 WHERE id = $3',
    [status, error, requestId]
  );
}

/**
 * Get image request by ID
 */
export async function getImageRequest(requestId: number): Promise<ImageRequest | null> {
  const db = getPool();
  const result = await db.query('SELECT * FROM image_requests WHERE id = $1', [requestId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================
// IMAGE FUNCTIONS
// ============================================

/**
 * Create an image record
 */
export async function createImage(input: CreateImageInput): Promise<Image> {
  const db = getPool();

  // Get taxonomy IDs
  let typeId: number | null = null;
  let categoryId: number | null = null;
  let styleId: number | null = null;

  if (input.type_key) {
    typeId = await getTypeIdByKey(input.type_key);
  }
  if (input.category_key) {
    categoryId = await getCategoryIdByKey(input.category_key);
  }
  if (input.style_key) {
    styleId = await getStyleIdByKey(input.style_key);
  }

  const result = await db.query(
    `INSERT INTO images (
      request_id, user_id, username, storage_url, storage_provider,
      variant_label, width, height, mime_type, bytes, sha256,
      type_id, category_id, style_id, subject, tags, metadata,
      message_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *`,
    [
      input.request_id,
      input.user_id,
      input.username,
      input.storage_url,
      input.storage_provider || 'omega',
      input.variant_label,
      input.width,
      input.height,
      input.mime_type,
      input.bytes,
      input.sha256,
      typeId,
      categoryId,
      styleId,
      input.subject,
      input.tags,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.message_id,
      'active'
    ]
  );

  const image = result.rows[0];

  // Add subject mappings if provided
  if (input.subjects && input.subjects.length > 0) {
    for (const subjectName of input.subjects) {
      const subjectId = await upsertImageSubject(subjectName);
      await db.query(
        'INSERT INTO image_subject_map (image_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [image.id, subjectId]
      );
    }
  }

  // Add tag mappings if provided
  if (input.tags && input.tags.length > 0) {
    for (const tagName of input.tags) {
      const tagId = await upsertImageTag(tagName);
      await db.query(
        'INSERT INTO image_tag_map (image_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [image.id, tagId]
      );
    }
  }

  return image;
}

/**
 * Get images by request ID
 */
export async function getImagesByRequest(requestId: number): Promise<Image[]> {
  const db = getPool();
  const result = await db.query('SELECT * FROM images WHERE request_id = $1 ORDER BY created_at', [requestId]);
  return result.rows;
}

/**
 * Get images by user
 */
export async function getImagesByUser(userId: string, limit = 50, offset = 0): Promise<Image[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM images WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  return result.rows;
}

/**
 * Get enriched images (with taxonomy labels)
 */
export async function getEnrichedImages(limit = 50, offset = 0): Promise<any[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM v_images_enriched ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}

/**
 * Get enriched images by user
 */
export async function getEnrichedImagesByUser(userId: string, limit = 50, offset = 0): Promise<any[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM v_images_enriched WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  return result.rows;
}

// ============================================
// SCHEMA REGISTRY INTEGRATION
// ============================================

/**
 * Log unknown metadata keys to schema registry
 * This function captures new JSONB keys for visibility
 */
export async function logMetadataKeysToRegistry(
  imageId: number,
  metadata: Record<string, any>
): Promise<void> {
  if (!metadata || Object.keys(metadata).length === 0) {
    return;
  }

  const db = getPool();

  // Check if schema_registry entry exists for images
  let schemaId: number | null = null;
  const schemaResult = await db.query(
    'SELECT id FROM schema_registry WHERE table_name = $1',
    ['images']
  );

  if (schemaResult.rows.length === 0) {
    // Create schema_registry entry for images table
    const createResult = await db.query(
      `INSERT INTO schema_registry (table_name, owner, schema_json, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['images', 'system', JSON.stringify({}), 'active']
    );
    schemaId = createResult.rows[0].id;
  } else {
    schemaId = schemaResult.rows[0].id;
  }

  // For each metadata key, check if it's already in schema_fields
  for (const [key, value] of Object.entries(metadata)) {
    const fieldResult = await db.query(
      'SELECT id FROM schema_fields WHERE schema_id = $1 AND field_name = $2',
      [schemaId, key]
    );

    if (fieldResult.rows.length === 0) {
      // Log new field
      const dataType = typeof value;
      await db.query(
        `INSERT INTO schema_fields (schema_id, field_name, field_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [schemaId, key, dataType, JSON.stringify({ first_seen_image_id: imageId })]
      );

      console.log(`📝 Logged new metadata key to schema registry: images.metadata.${key} (${dataType})`);
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Complete image generation workflow
 * Creates request, image, and handles errors
 */
export async function completeImageGeneration(
  requestInput: CreateImageRequestInput,
  imageInput: Omit<CreateImageInput, 'request_id' | 'user_id' | 'username'>,
  error?: string
): Promise<{ request: ImageRequest; image?: Image }> {
  // Create request
  const request = await createImageRequest(requestInput);

  try {
    if (error) {
      // Mark request as error
      await updateImageRequestStatus(request.id, 'error', error);
      return { request };
    }

    // Create image
    const image = await createImage({
      ...imageInput,
      request_id: request.id,
      user_id: requestInput.user_id,
      username: requestInput.username
    });

    // Log metadata keys to schema registry
    if (imageInput.metadata) {
      await logMetadataKeysToRegistry(image.id, imageInput.metadata);
    }

    // Mark request as success
    await updateImageRequestStatus(request.id, 'success');

    return { request, image };
  } catch (err) {
    // Mark request as error
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await updateImageRequestStatus(request.id, 'error', errorMessage);
    throw err;
  }
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
