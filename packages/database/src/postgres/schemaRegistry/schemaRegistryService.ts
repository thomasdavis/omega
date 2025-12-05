import { prisma } from '../prismaClient.js';
import type { SchemaRequest, TableSchemaDefinition } from './types.js';
import { SchemaRequestSchema } from './types.js';
import { SchemaPolicy } from './policyValidator.js';
import { MigrationGenerator } from './migrationGenerator.js';

export interface CreateSchemaRequestResult {
  success: boolean;
  registryId?: string;
  violations?: Array<{ severity: string; message: string; suggestion?: string }>;
  error?: string;
}

export interface GetSchemaRequestResult {
  id: string;
  tableName: string;
  owner: string | null;
  schemaJson: TableSchemaDefinition;
  status: string;
  requestMetadata: any;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface MigrationPreviewResult {
  upSql: string;
  downSql: string;
  fileName: string;
}

/**
 * Service for managing schema registry requests
 */
export class SchemaRegistryService {
  /**
   * Create a new schema request
   */
  static async createSchemaRequest(
    request: SchemaRequest
  ): Promise<CreateSchemaRequestResult> {
    try {
      // Validate request schema
      const validatedRequest = SchemaRequestSchema.parse(request);

      // Run policy validation
      const policyResult = SchemaPolicy.validate(validatedRequest.schemaJson);

      // If there are error-level violations, reject the request
      const errors = policyResult.violations.filter(v => v.severity === 'error');
      if (errors.length > 0) {
        return {
          success: false,
          violations: policyResult.violations,
          error: 'Schema request contains policy violations'
        };
      }

      // Check if table already exists in registry
      const existing = await prisma.schemaRegistry.findUnique({
        where: { tableName: validatedRequest.tableName }
      });

      if (existing) {
        return {
          success: false,
          error: `Table ${validatedRequest.tableName} already exists in schema registry`
        };
      }

      // Create registry entry
      const registry = await prisma.schemaRegistry.create({
        data: {
          tableName: validatedRequest.tableName,
          owner: validatedRequest.owner,
          schemaJson: validatedRequest.schemaJson as any,
          status: 'requested',
          requestMetadata: validatedRequest.requestMetadata as any,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        }
      });

      // Create audit entry
      await prisma.schemaAudit.create({
        data: {
          tableName: validatedRequest.tableName,
          action: 'CREATE_REQUEST',
          schemaJson: validatedRequest.schemaJson as any,
          status: 'pending',
          performedBy: validatedRequest.requestMetadata.requestedBy,
          requestMetadata: validatedRequest.requestMetadata as any,
          executedAt: BigInt(Math.floor(Date.now() / 1000)),
          createdAt: BigInt(Math.floor(Date.now() / 1000))
        }
      });

      return {
        success: true,
        registryId: registry.id,
        violations: policyResult.violations.length > 0 ? policyResult.violations : undefined
      };
    } catch (error) {
      console.error('Error creating schema request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a schema request by ID
   */
  static async getSchemaRequest(id: string): Promise<GetSchemaRequestResult | null> {
    const registry = await prisma.schemaRegistry.findUnique({
      where: { id }
    });

    if (!registry) {
      return null;
    }

    return {
      id: registry.id,
      tableName: registry.tableName,
      owner: registry.owner,
      schemaJson: registry.schemaJson as TableSchemaDefinition,
      status: registry.status,
      requestMetadata: registry.requestMetadata,
      createdAt: registry.createdAt,
      updatedAt: registry.updatedAt
    };
  }

  /**
   * Get a schema request by table name
   */
  static async getSchemaRequestByTableName(
    tableName: string
  ): Promise<GetSchemaRequestResult | null> {
    const registry = await prisma.schemaRegistry.findUnique({
      where: { tableName }
    });

    if (!registry) {
      return null;
    }

    return {
      id: registry.id,
      tableName: registry.tableName,
      owner: registry.owner,
      schemaJson: registry.schemaJson as TableSchemaDefinition,
      status: registry.status,
      requestMetadata: registry.requestMetadata,
      createdAt: registry.createdAt,
      updatedAt: registry.updatedAt
    };
  }

  /**
   * List all schema requests with optional filtering
   */
  static async listSchemaRequests(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where = options?.status ? { status: options.status } : undefined;

    const [requests, total] = await Promise.all([
      prisma.schemaRegistry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0
      }),
      prisma.schemaRegistry.count({ where })
    ]);

    return {
      requests: requests.map(r => ({
        id: r.id,
        tableName: r.tableName,
        owner: r.owner,
        schemaJson: r.schemaJson as TableSchemaDefinition,
        status: r.status,
        requestMetadata: r.requestMetadata,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })),
      total
    };
  }

  /**
   * Update schema request status
   */
  static async updateSchemaRequestStatus(
    id: string,
    status: string,
    performedBy?: string
  ): Promise<boolean> {
    try {
      const registry = await prisma.schemaRegistry.update({
        where: { id },
        data: {
          status,
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        }
      });

      // Create audit entry for status change
      await prisma.schemaAudit.create({
        data: {
          tableName: registry.tableName,
          action: `STATUS_CHANGE_${status.toUpperCase()}`,
          status: 'completed',
          performedBy,
          executedAt: BigInt(Math.floor(Date.now() / 1000)),
          createdAt: BigInt(Math.floor(Date.now() / 1000))
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating schema request status:', error);
      return false;
    }
  }

  /**
   * Generate migration preview for a schema request
   */
  static async generateMigrationPreview(id: string): Promise<MigrationPreviewResult | null> {
    const request = await this.getSchemaRequest(id);

    if (!request) {
      return null;
    }

    const migration = MigrationGenerator.generateCreateTableMigration(request.schemaJson);
    const fileName = MigrationGenerator.generateMigrationFileName(request.tableName);

    const metadata = {
      tableName: request.tableName,
      requestedBy: request.requestMetadata?.requestedBy,
      relatedIssue: request.requestMetadata?.relatedIssue
    };

    return {
      upSql: MigrationGenerator.formatMigrationFile('up', migration.up, metadata),
      downSql: MigrationGenerator.formatMigrationFile('down', migration.down, metadata),
      fileName
    };
  }

  /**
   * Get audit history for a table
   */
  static async getAuditHistory(tableName: string) {
    return prisma.schemaAudit.findMany({
      where: { tableName },
      orderBy: { executedAt: 'desc' }
    });
  }
}
