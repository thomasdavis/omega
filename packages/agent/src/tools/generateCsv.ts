/**
 * Generate CSV Tool - Generate CSV files with proper formatting and escaping
 */

import { tool } from 'ai';
import { z } from 'zod';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getDataDir } from '@repo/shared';

// Artifacts directory - use centralized storage utility
const ARTIFACTS_DIR = getDataDir('artifacts');

interface CsvMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  filename: string;
  rowCount: number;
  columnCount: number;
}

/**
 * Escape a CSV field value
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any quotes inside the value
 */
function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Check if field needs quoting
  const needsQuoting = stringValue.includes(',') ||
                       stringValue.includes('"') ||
                       stringValue.includes('\n') ||
                       stringValue.includes('\r');

  if (needsQuoting) {
    // Escape quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return stringValue;
}

/**
 * Convert array of arrays to CSV string
 */
function arrayToCsv(data: any[][], headers?: string[]): string {
  const rows: string[] = [];

  // Add headers if provided
  if (headers && headers.length > 0) {
    rows.push(headers.map(escapeCsvField).join(','));
  }

  // Add data rows
  for (const row of data) {
    rows.push(row.map(escapeCsvField).join(','));
  }

  return rows.join('\n');
}

/**
 * Convert array of objects to CSV string
 */
function objectsToCsv(data: Record<string, any>[], headers?: string[]): string {
  if (data.length === 0) {
    return headers ? headers.join(',') : '';
  }

  // Use provided headers or infer from first object
  const columnHeaders = headers || Object.keys(data[0]);
  const rows: string[] = [];

  // Add header row
  rows.push(columnHeaders.map(escapeCsvField).join(','));

  // Add data rows
  for (const obj of data) {
    const row = columnHeaders.map(header => escapeCsvField(obj[header]));
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Save CSV to filesystem
 */
function saveCsv(
  content: string,
  title: string,
  description: string,
  rowCount: number,
  columnCount: number
): CsvMetadata {
  const id = randomUUID();
  const filename = `${id}.csv`;
  const filepath = join(ARTIFACTS_DIR, filename);

  // Save the CSV file
  writeFileSync(filepath, content, 'utf-8');

  // Save metadata
  const metadata: CsvMetadata = {
    id,
    title,
    description,
    createdAt: new Date().toISOString(),
    filename,
    rowCount,
    columnCount,
  };

  const metadataPath = join(ARTIFACTS_DIR, `${id}.json`);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

export const generateCsvTool = tool({
  description: `Generate CSV (Comma-Separated Values) files with proper formatting and escaping.
  Supports two input formats:
  1. Array of arrays - Each inner array is a row of data
  2. Array of objects - Each object is a row, keys become columns

  Features:
  - Automatic escaping of special characters (commas, quotes, newlines)
  - Optional custom headers
  - Proper quote handling (doubles quotes inside quoted fields)
  - Downloadable file with shareable link`,
  inputSchema: z.object({
    title: z.string().describe('Title/name for the CSV file'),
    description: z.string().describe('Brief description of what the CSV contains'),
    data: z.union([
      z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe('Array of arrays - each inner array is a row'),
      z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe('Array of objects - each object is a row'),
    ]).describe('Data to convert to CSV. Can be array of arrays or array of objects.'),
    headers: z.array(z.string()).optional().describe('Optional column headers. If not provided, headers will be inferred from data.'),
  }),
  execute: async ({ title, description, data, headers }) => {
    try {
      let csvContent: string;
      let rowCount: number;
      let columnCount: number;

      // Check if data is array of arrays or array of objects
      if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0])) {
          // Array of arrays
          csvContent = arrayToCsv(data as any[][], headers);
          rowCount = data.length;
          columnCount = data[0].length;
        } else if (typeof data[0] === 'object' && data[0] !== null) {
          // Array of objects
          csvContent = objectsToCsv(data as Record<string, any>[], headers);
          rowCount = data.length;
          columnCount = headers ? headers.length : Object.keys(data[0]).length;
        } else {
          throw new Error('Data must be either array of arrays or array of objects');
        }
      } else {
        // Empty data
        csvContent = headers ? headers.join(',') : '';
        rowCount = 0;
        columnCount = headers ? headers.length : 0;
      }

      const metadata = saveCsv(csvContent, title, description, rowCount, columnCount);

      // Get server URL from environment or use default
      const serverUrl = process.env.ARTIFACT_SERVER_URL
        || (process.env.NODE_ENV === 'production' ? 'https://omegaai.dev' : 'http://localhost:3001');
      const downloadUrl = `${serverUrl}/artifacts/${metadata.id}.csv`;

      return {
        success: true,
        csvId: metadata.id,
        title: metadata.title,
        description: metadata.description,
        downloadUrl,
        filename: metadata.filename,
        rowCount: metadata.rowCount,
        columnCount: metadata.columnCount,
        message: `CSV file created with ${metadata.rowCount} rows and ${metadata.columnCount} columns! Download at: ${downloadUrl}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate CSV',
      };
    }
  },
});
