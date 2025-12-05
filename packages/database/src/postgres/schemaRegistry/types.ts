import { z } from 'zod';

export const SchemaRequestStatusEnum = z.enum([
  'draft',
  'requested',
  'approved',
  'migrated',
  'rejected'
]);

export const ColumnTypeEnum = z.enum([
  'UUID',
  'TEXT',
  'VARCHAR',
  'INTEGER',
  'BIGINT',
  'REAL',
  'FLOAT',
  'BOOLEAN',
  'JSONB',
  'TIMESTAMPTZ',
  'TIMESTAMP',
  'BYTEA',
  'SERIAL',
  'BIGSERIAL'
]);

export const ColumnDefinitionSchema = z.object({
  name: z.string().min(1).regex(/^[a-z_][a-z0-9_]*$/, 'Column name must be lowercase snake_case'),
  type: ColumnTypeEnum,
  nullable: z.boolean().default(true),
  primaryKey: z.boolean().default(false),
  unique: z.boolean().default(false),
  defaultValue: z.string().optional(),
  references: z.object({
    table: z.string(),
    column: z.string(),
    onDelete: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).optional(),
    onUpdate: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).optional()
  }).optional(),
  comment: z.string().optional()
});

export const IndexDefinitionSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()).min(1),
  unique: z.boolean().default(false),
  type: z.enum(['BTREE', 'GIN', 'GIST', 'HASH']).default('BTREE')
});

export const TableSchemaDefinitionSchema = z.object({
  tableName: z.string().min(1).regex(/^[a-z_][a-z0-9_]*$/, 'Table name must be lowercase snake_case'),
  columns: z.array(ColumnDefinitionSchema).min(1),
  indexes: z.array(IndexDefinitionSchema).optional(),
  comment: z.string().optional()
});

export const SchemaRequestMetadataSchema = z.object({
  requestedBy: z.string(),
  requestedByUsername: z.string().optional(),
  justification: z.string(),
  relatedIssue: z.string().optional(),
  featureId: z.string().optional(),
  requestedAt: z.number()
});

export const SchemaRequestSchema = z.object({
  tableName: z.string().min(1),
  owner: z.string().optional(),
  schemaJson: TableSchemaDefinitionSchema,
  requestMetadata: SchemaRequestMetadataSchema
});

export type ColumnType = z.infer<typeof ColumnTypeEnum>;
export type ColumnDefinition = z.infer<typeof ColumnDefinitionSchema>;
export type IndexDefinition = z.infer<typeof IndexDefinitionSchema>;
export type TableSchemaDefinition = z.infer<typeof TableSchemaDefinitionSchema>;
export type SchemaRequestMetadata = z.infer<typeof SchemaRequestMetadataSchema>;
export type SchemaRequest = z.infer<typeof SchemaRequestSchema>;
export type SchemaRequestStatus = z.infer<typeof SchemaRequestStatusEnum>;
