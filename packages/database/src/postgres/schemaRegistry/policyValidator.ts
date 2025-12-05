import type { TableSchemaDefinition, ColumnDefinition } from './types.js';

export interface PolicyViolation {
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export interface PolicyValidationResult {
  valid: boolean;
  violations: PolicyViolation[];
}

/**
 * Validates a table schema against safety and best practice policies
 */
export class SchemaPolicy {
  /**
   * Validate a table schema definition
   */
  static validate(schema: TableSchemaDefinition): PolicyValidationResult {
    const violations: PolicyViolation[] = [];

    // Check for dangerous operations (should not be in creation schema)
    this.checkDangerousOperations(schema, violations);

    // Enforce best practices
    this.checkPrimaryKey(schema, violations);
    this.checkTimestamps(schema, violations);
    this.checkColumnTypes(schema, violations);
    this.checkNamingConventions(schema, violations);
    this.checkIndexes(schema, violations);

    return {
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations
    };
  }

  private static checkDangerousOperations(
    schema: TableSchemaDefinition,
    violations: PolicyViolation[]
  ): void {
    // Schema creation should not include DROP operations
    // This is a safety check to prevent accidental destructive changes
    if (schema.tableName.toLowerCase().includes('drop')) {
      violations.push({
        severity: 'error',
        message: 'Table name contains "drop" which may indicate a destructive operation',
        suggestion: 'Use a descriptive table name without SQL keywords'
      });
    }
  }

  private static checkPrimaryKey(
    schema: TableSchemaDefinition,
    violations: PolicyViolation[]
  ): void {
    const primaryKeys = schema.columns.filter(col => col.primaryKey);

    if (primaryKeys.length === 0) {
      violations.push({
        severity: 'error',
        message: 'Table must have a primary key',
        suggestion: 'Add a primary key column (prefer UUID with default gen_random_uuid())'
      });
    } else if (primaryKeys.length > 1) {
      violations.push({
        severity: 'error',
        message: 'Table has multiple primary key columns defined',
        suggestion: 'Use a composite primary key constraint or designate a single primary key'
      });
    } else {
      const pk = primaryKeys[0];
      // Recommend UUID for new tables
      if (pk.type !== 'UUID' && pk.type !== 'BIGSERIAL' && pk.type !== 'SERIAL') {
        violations.push({
          severity: 'warning',
          message: `Primary key uses type ${pk.type} instead of UUID`,
          suggestion: 'Prefer UUID primary keys with gen_random_uuid() for new domain tables'
        });
      }

      // Ensure primary key has a default value for UUID
      if (pk.type === 'UUID' && !pk.defaultValue) {
        violations.push({
          severity: 'warning',
          message: 'UUID primary key should have default value gen_random_uuid()',
          suggestion: 'Add defaultValue: "gen_random_uuid()" to the primary key column'
        });
      }
    }
  }

  private static checkTimestamps(
    schema: TableSchemaDefinition,
    violations: PolicyViolation[]
  ): void {
    const hasCreatedAt = schema.columns.some(
      col => col.name === 'created_at' && this.isTimestampType(col.type)
    );
    const hasUpdatedAt = schema.columns.some(
      col => col.name === 'updated_at' && this.isTimestampType(col.type)
    );

    if (!hasCreatedAt) {
      violations.push({
        severity: 'warning',
        message: 'Table is missing created_at timestamp column',
        suggestion: 'Add created_at TIMESTAMPTZ with default value for auditability'
      });
    }

    if (!hasUpdatedAt) {
      violations.push({
        severity: 'warning',
        message: 'Table is missing updated_at timestamp column',
        suggestion: 'Add updated_at TIMESTAMPTZ with default value for tracking changes'
      });
    }

    // Check that timestamp columns use TIMESTAMPTZ
    schema.columns
      .filter(col => this.looksLikeTimestamp(col.name))
      .forEach(col => {
        if (col.type !== 'TIMESTAMPTZ') {
          violations.push({
            severity: 'warning',
            message: `Column ${col.name} appears to be a timestamp but uses type ${col.type}`,
            suggestion: 'Use TIMESTAMPTZ for all timestamp columns to preserve timezone information'
          });
        }
      });
  }

  private static checkColumnTypes(
    schema: TableSchemaDefinition,
    violations: PolicyViolation[]
  ): void {
    schema.columns.forEach(col => {
      // Check for JavaScript safety with BIGINT
      if (col.type === 'BIGINT') {
        violations.push({
          severity: 'warning',
          message: `Column ${col.name} uses BIGINT which may lose precision in JavaScript`,
          suggestion: 'Consider using TEXT for external IDs (e.g., Discord IDs) or ensure proper BigInt handling'
        });
      }

      // Recommend TEXT over VARCHAR for flexibility
      if (col.type === 'VARCHAR') {
        violations.push({
          severity: 'warning',
          message: `Column ${col.name} uses VARCHAR`,
          suggestion: 'Consider using TEXT instead for more flexibility (PostgreSQL optimizes both similarly)'
        });
      }

      // Check for proper JSONB indexing recommendations
      if (col.type === 'JSONB') {
        const hasGinIndex = schema.indexes?.some(
          idx => idx.columns.includes(col.name) && idx.type === 'GIN'
        );

        if (!hasGinIndex) {
          violations.push({
            severity: 'warning',
            message: `JSONB column ${col.name} does not have a GIN index`,
            suggestion: 'Add a GIN index for better JSONB query performance if querying this field'
          });
        }
      }
    });
  }

  private static checkNamingConventions(
    schema: TableSchemaDefinition,
    violations: PolicyViolation[]
  ): void {
    // Table name should be plural and snake_case
    if (!schema.tableName.match(/^[a-z_][a-z0-9_]*$/)) {
      violations.push({
        severity: 'error',
        message: 'Table name must be lowercase snake_case',
        suggestion: 'Use lowercase letters, numbers, and underscores only'
      });
    }

    // Check column naming
    schema.columns.forEach(col => {
      if (!col.name.match(/^[a-z_][a-z0-9_]*$/)) {
        violations.push({
          severity: 'error',
          message: `Column ${col.name} must be lowercase snake_case`,
          suggestion: 'Use lowercase letters, numbers, and underscores only'
        });
      }
    });
  }

  private static checkIndexes(
    schema: TableSchemaDefinition,
    violations: PolicyViolation[]
  ): void {
    // Check for common columns that should be indexed
    const commonIndexableColumns = ['user_id', 'created_at', 'updated_at'];
    const indexedColumns = new Set(
      schema.indexes?.flatMap(idx => idx.columns) || []
    );

    schema.columns.forEach(col => {
      if (commonIndexableColumns.includes(col.name) && !indexedColumns.has(col.name)) {
        violations.push({
          severity: 'warning',
          message: `Common column ${col.name} is not indexed`,
          suggestion: `Add an index on ${col.name} for better query performance`
        });
      }
    });
  }

  private static isTimestampType(type: string): boolean {
    return type === 'TIMESTAMPTZ' || type === 'TIMESTAMP';
  }

  private static looksLikeTimestamp(columnName: string): boolean {
    const timestampPatterns = [
      '_at',
      '_time',
      'timestamp',
      'date'
    ];
    return timestampPatterns.some(pattern => columnName.toLowerCase().includes(pattern));
  }
}
