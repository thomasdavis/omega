/**
 * Code Query Tool - Search and analyze Omega's own codebase
 * Enables transparent introspection of the bot's implementation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security: Files and directories to exclude from search
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /\.env/,
  /\.pnp/,
  /dist\//,
  /build\//,
  /coverage\//,
  /\.next\//,
  /\.turbo\//,
  /\.vercel\//,
  /\.pem$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

// File extensions to search
const SEARCHABLE_EXTENSIONS = [
  '.ts',
  '.js',
  '.tsx',
  '.jsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.txt',
];

interface SearchResult {
  file: string;
  line: number;
  content: string;
  context?: string[];
}

/**
 * Check if a path should be excluded from search
 */
function shouldExclude(filePath: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Check if a file extension is searchable
 */
function isSearchableFile(filePath: string): boolean {
  return SEARCHABLE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

/**
 * Recursively find all searchable files in a directory
 */
async function findFiles(dir: string, baseDir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(baseDir, fullPath);

      // Skip excluded paths
      if (shouldExclude(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile() && isSearchableFile(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.warn(`Skipping directory ${dir}:`, error);
  }

  return files;
}

/**
 * Search file content for a pattern
 */
async function searchFile(
  filePath: string,
  pattern: string,
  options: { caseSensitive?: boolean; regex?: boolean; contextLines?: number }
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let searchRegex: RegExp;
    if (options.regex) {
      searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
    } else {
      // Escape special regex characters for literal search
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(escapedPattern, options.caseSensitive ? 'g' : 'gi');
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (searchRegex.test(line)) {
        const result: SearchResult = {
          file: filePath,
          line: i + 1,
          content: line.trim(),
        };

        // Add context lines if requested
        if (options.contextLines && options.contextLines > 0) {
          const contextBefore = Math.max(0, i - options.contextLines);
          const contextAfter = Math.min(lines.length - 1, i + options.contextLines);
          result.context = lines.slice(contextBefore, contextAfter + 1).map(l => l.trim());
        }

        results.push(result);
      }
    }
  } catch (error) {
    // Skip files we can't read
    console.warn(`Error reading file ${filePath}:`, error);
  }

  return results;
}

export const codeQueryTool = tool({
  description: 'Search and analyze Omega\'s own codebase. Use this to find specific code, understand implementation details, or explore the bot\'s architecture. Supports keyword search, regex patterns, and file filtering. Perfect for debugging, feature exploration, and transparency.',
  inputSchema: z.object({
    query: z.string().describe('Search query - keyword, phrase, or regex pattern to find in the code'),
    mode: z.enum(['keyword', 'regex']).default('keyword').describe('Search mode: "keyword" for literal text search, "regex" for pattern matching'),
    caseSensitive: z.boolean().default(false).describe('Whether the search should be case-sensitive'),
    filePattern: z.string().optional().describe('Optional: Filter results to files matching this pattern (e.g., "*.ts", "tools/*.ts")'),
    contextLines: z.number().int().min(0).max(5).default(2).describe('Number of context lines to show before/after each match (0-5, default 2)'),
    maxResults: z.number().int().min(1).max(50).default(20).describe('Maximum number of results to return (1-50, default 20)'),
  }),
  execute: async ({ query, mode, caseSensitive, filePattern, contextLines, maxResults }) => {
    console.log(`🔍 Code Query: "${query}" (mode: ${mode}, case-sensitive: ${caseSensitive})`);

    try {
      // Get the project root (3 levels up from this file: tools -> agent -> src -> apps -> bot -> root)
      const projectRoot = join(__dirname, '..', '..', '..', '..', '..');

      // Find all searchable files
      console.log(`📂 Scanning project root: ${projectRoot}`);
      const allFiles = await findFiles(projectRoot, projectRoot);

      // Filter by file pattern if provided
      let filesToSearch = allFiles;
      if (filePattern) {
        const patternRegex = new RegExp(
          filePattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
          'i'
        );
        filesToSearch = allFiles.filter(file => {
          const relativePath = relative(projectRoot, file);
          return patternRegex.test(relativePath);
        });
      }

      console.log(`📄 Searching ${filesToSearch.length} files...`);

      // Search all files
      const allResults: SearchResult[] = [];
      for (const file of filesToSearch) {
        const fileResults = await searchFile(file, query, {
          caseSensitive,
          regex: mode === 'regex',
          contextLines,
        });

        // Convert absolute paths to relative paths for cleaner output
        const relativeResults = fileResults.map(result => ({
          ...result,
          file: relative(projectRoot, result.file),
        }));

        allResults.push(...relativeResults);

        // Stop if we've found enough results
        if (allResults.length >= maxResults) {
          break;
        }
      }

      // Limit results
      const limitedResults = allResults.slice(0, maxResults);

      console.log(`✅ Found ${limitedResults.length} results`);

      return {
        success: true,
        query,
        mode,
        totalResults: limitedResults.length,
        hasMore: allResults.length > maxResults,
        results: limitedResults.map(result => ({
          file: result.file,
          line: result.line,
          match: result.content,
          context: result.context,
        })),
      };
    } catch (error) {
      console.error('Code query error:', error);
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
});
