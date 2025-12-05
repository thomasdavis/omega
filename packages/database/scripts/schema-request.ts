#!/usr/bin/env tsx
/**
 * Schema Request CLI Tool
 *
 * Usage:
 *   pnpm schema-request create --file examples/caricatures.json
 *   pnpm schema-request list
 *   pnpm schema-request show <id>
 *   pnpm schema-request approve <id>
 *   pnpm schema-request migration <id>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  SchemaRegistryService,
  SchemaRequestSchema,
  connectPrisma,
  disconnectPrisma,
} from '../src/index.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.error('Usage: schema-request <command> [options]');
    console.error('Commands:');
    console.error('  create --file <path>   Create a schema request from JSON file');
    console.error('  list [--status <status>]   List schema requests');
    console.error('  show <id>              Show schema request details');
    console.error('  approve <id>           Approve a schema request');
    console.error('  reject <id>            Reject a schema request');
    console.error('  migration <id>         Generate migration preview');
    process.exit(1);
  }

  try {
    await connectPrisma();

    switch (command) {
      case 'create':
        await handleCreate(args);
        break;
      case 'list':
        await handleList(args);
        break;
      case 'show':
        await handleShow(args);
        break;
      case 'approve':
        await handleApprove(args);
        break;
      case 'reject':
        await handleReject(args);
        break;
      case 'migration':
        await handleMigration(args);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    await disconnectPrisma();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    await disconnectPrisma();
    process.exit(1);
  }
}

async function handleCreate(args: string[]) {
  const fileIndex = args.indexOf('--file');
  if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error('Usage: schema-request create --file <path>');
    process.exit(1);
  }

  const filePath = resolve(args[fileIndex + 1]);
  const fileContent = readFileSync(filePath, 'utf-8');
  const requestData = JSON.parse(fileContent);

  // Validate the request
  const validationResult = SchemaRequestSchema.safeParse(requestData);
  if (!validationResult.success) {
    console.error('Invalid schema request:');
    console.error(JSON.stringify(validationResult.error.errors, null, 2));
    process.exit(1);
  }

  console.log('Creating schema request...');
  const result = await SchemaRegistryService.createSchemaRequest(validationResult.data);

  if (!result.success) {
    console.error('Failed to create schema request:');
    console.error(result.error);
    if (result.violations) {
      console.error('\nPolicy Violations:');
      result.violations.forEach((v) => {
        console.error(`  [${v.severity.toUpperCase()}] ${v.message}`);
        if (v.suggestion) {
          console.error(`    Suggestion: ${v.suggestion}`);
        }
      });
    }
    process.exit(1);
  }

  console.log('\n✓ Schema request created successfully!');
  console.log(`  Registry ID: ${result.registryId}`);

  if (result.violations && result.violations.length > 0) {
    console.log('\n⚠ Warnings:');
    result.violations.forEach((v) => {
      console.log(`  [${v.severity.toUpperCase()}] ${v.message}`);
      if (v.suggestion) {
        console.log(`    Suggestion: ${v.suggestion}`);
      }
    });
  }

  console.log('\nNext steps:');
  console.log(`  1. Review the schema: pnpm schema-request show ${result.registryId}`);
  console.log(`  2. Preview migration: pnpm schema-request migration ${result.registryId}`);
  console.log(`  3. Approve request: pnpm schema-request approve ${result.registryId}`);
}

async function handleList(args: string[]) {
  const statusIndex = args.indexOf('--status');
  const status = statusIndex !== -1 ? args[statusIndex + 1] : undefined;

  const result = await SchemaRegistryService.listSchemaRequests({
    status,
    limit: 50,
  });

  console.log(`\nSchema Requests (${result.total} total):\n`);

  if (result.requests.length === 0) {
    console.log('No schema requests found.');
    return;
  }

  result.requests.forEach((req) => {
    console.log(`ID: ${req.id}`);
    console.log(`  Table: ${req.tableName}`);
    console.log(`  Status: ${req.status}`);
    console.log(`  Owner: ${req.owner || 'N/A'}`);
    console.log(`  Created: ${new Date(Number(req.createdAt) * 1000).toISOString()}`);
    console.log('');
  });
}

async function handleShow(args: string[]) {
  const id = args[1];
  if (!id) {
    console.error('Usage: schema-request show <id>');
    process.exit(1);
  }

  const request = await SchemaRegistryService.getSchemaRequest(id);

  if (!request) {
    console.error('Schema request not found');
    process.exit(1);
  }

  console.log('\nSchema Request Details:\n');
  console.log(`ID: ${request.id}`);
  console.log(`Table: ${request.tableName}`);
  console.log(`Status: ${request.status}`);
  console.log(`Owner: ${request.owner || 'N/A'}`);
  console.log(`Created: ${new Date(Number(request.createdAt) * 1000).toISOString()}`);
  console.log(`Updated: ${new Date(Number(request.updatedAt) * 1000).toISOString()}`);
  console.log('\nSchema Definition:');
  console.log(JSON.stringify(request.schemaJson, null, 2));
  console.log('\nRequest Metadata:');
  console.log(JSON.stringify(request.requestMetadata, null, 2));
}

async function handleApprove(args: string[]) {
  const id = args[1];
  if (!id) {
    console.error('Usage: schema-request approve <id>');
    process.exit(1);
  }

  const success = await SchemaRegistryService.updateSchemaRequestStatus(
    id,
    'approved',
    process.env.USER || 'cli-user'
  );

  if (!success) {
    console.error('Failed to approve schema request');
    process.exit(1);
  }

  console.log('✓ Schema request approved');
  console.log('\nNext steps:');
  console.log(`  1. Generate migration: pnpm schema-request migration ${id}`);
  console.log('  2. Create migration files and open PR for review');
}

async function handleReject(args: string[]) {
  const id = args[1];
  if (!id) {
    console.error('Usage: schema-request reject <id>');
    process.exit(1);
  }

  const success = await SchemaRegistryService.updateSchemaRequestStatus(
    id,
    'rejected',
    process.env.USER || 'cli-user'
  );

  if (!success) {
    console.error('Failed to reject schema request');
    process.exit(1);
  }

  console.log('✓ Schema request rejected');
}

async function handleMigration(args: string[]) {
  const id = args[1];
  if (!id) {
    console.error('Usage: schema-request migration <id>');
    process.exit(1);
  }

  const migration = await SchemaRegistryService.generateMigrationPreview(id);

  if (!migration) {
    console.error('Schema request not found');
    process.exit(1);
  }

  console.log('\nMigration Preview:\n');
  console.log(`File Name: ${migration.fileName}`);
  console.log('\n--- UP MIGRATION ---\n');
  console.log(migration.upSql);
  console.log('\n--- DOWN MIGRATION ---\n');
  console.log(migration.downSql);
  console.log('\n');
}

main();
