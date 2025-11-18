/**
 * Code Query Tool - Search and analyze Omega's own codebase with AI-powered understanding
 * Enables transparent introspection of the bot's implementation with full-file analysis,
 * intelligent summarization, and multi-file contextual understanding
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

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

/**
 * Read and return the full content of a file
 */
async function readFullFile(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.warn(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Use AI to analyze and summarize code files
 */
async function analyzeCodeWithAI(
  files: Array<{ path: string; content: string }>,
  query: string,
  analysisType: 'summarize' | 'explain' | 'architecture' | 'dependencies'
): Promise<string> {
  const model = openai.chat('gpt-4o-mini');

  // Build context from files
  const filesContext = files
    .map(f => `--- File: ${f.path} ---\n${f.content}\n`)
    .join('\n\n');

  // Create analysis prompt based on type
  let systemPrompt = '';
  let userPrompt = '';

  switch (analysisType) {
    case 'summarize':
      systemPrompt = 'You are a code analysis expert. Provide concise, accurate summaries of code files.';
      userPrompt = `Analyze these code files and provide a comprehensive summary addressing: ${query}\n\nFiles:\n${filesContext}\n\nProvide a clear, structured summary with key findings, patterns, and insights.`;
      break;

    case 'explain':
      systemPrompt = 'You are a code educator. Explain code in clear, accessible terms while maintaining technical accuracy.';
      userPrompt = `Explain how this code works, addressing: ${query}\n\nFiles:\n${filesContext}\n\nProvide a detailed explanation with examples and key concepts.`;
      break;

    case 'architecture':
      systemPrompt = 'You are a software architect. Analyze code structure, patterns, and design decisions.';
      userPrompt = `Analyze the architecture of these files, focusing on: ${query}\n\nFiles:\n${filesContext}\n\nDescribe the architectural patterns, component relationships, data flow, and design decisions.`;
      break;

    case 'dependencies':
      systemPrompt = 'You are a dependency analysis expert. Identify relationships between code components.';
      userPrompt = `Map out the dependencies and relationships in this code, focusing on: ${query}\n\nFiles:\n${filesContext}\n\nIdentify imports, function calls, data dependencies, and component interactions.`;
      break;
  }

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.text;
  } catch (error) {
    console.error('AI analysis error:', error);
    return `Error during AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * List files in a directory or matching a pattern
 */
async function listFiles(
  projectRoot: string,
  pattern?: string,
  maxFiles: number = 50
): Promise<Array<{ path: string; size: number; lines: number }>> {
  const allFiles = await findFiles(projectRoot, projectRoot);

  let filesToList = allFiles;
  if (pattern) {
    const patternRegex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
      'i'
    );
    filesToList = allFiles.filter(file => {
      const relativePath = relative(projectRoot, file);
      return patternRegex.test(relativePath);
    });
  }

  // Get file info
  const fileInfos = [];
  for (const file of filesToList.slice(0, maxFiles)) {
    try {
      const stats = await stat(file);
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n').length;

      fileInfos.push({
        path: relative(projectRoot, file),
        size: stats.size,
        lines,
      });
    } catch (error) {
      // Skip files we can't read
      continue;
    }
  }

  return fileInfos;
}

export const codeQueryTool = tool({
  description: 'Advanced code analysis tool for Omega\'s codebase with AI-powered understanding. Supports: 1) Keyword/regex search with context, 2) Full-file reading and display, 3) AI-powered code summarization and explanation, 4) Architecture analysis, 5) Dependency mapping, 6) File listing. Perfect for deep code understanding, debugging, feature exploration, and architectural insights.',
  inputSchema: z.object({
    operation: z.enum(['search', 'read', 'analyze', 'list']).default('search').describe('Operation type: "search" for keyword/regex search, "read" to read full files, "analyze" for AI-powered analysis, "list" to list files'),
    query: z.string().describe('For search: keyword/regex pattern. For read: file path(s) comma-separated. For analyze: question or focus area. For list: file pattern (optional)'),

    // Search mode options
    mode: z.enum(['keyword', 'regex']).optional().describe('Search mode: "keyword" for literal text, "regex" for patterns (search operation only)'),
    caseSensitive: z.boolean().default(false).describe('Case-sensitive search (search operation only)'),
    contextLines: z.number().int().min(0).max(5).default(2).describe('Context lines around matches (search operation only)'),
    maxResults: z.number().int().min(1).max(50).default(20).describe('Max results (search/list operations)'),

    // File filtering
    filePattern: z.string().optional().describe('Filter files by pattern (e.g., "*.ts", "tools/*.ts")'),

    // AI analysis options
    analysisType: z.enum(['summarize', 'explain', 'architecture', 'dependencies']).optional().describe('Type of AI analysis: "summarize" for overview, "explain" for detailed explanation, "architecture" for design patterns, "dependencies" for relationships (analyze operation only)'),
    maxFiles: z.number().int().min(1).max(10).default(3).describe('Maximum files to analyze with AI (analyze operation only, default 3)'),
  }),
  execute: async ({ operation, query, mode, caseSensitive, filePattern, contextLines, maxResults, analysisType, maxFiles }) => {
    console.log(`🔍 Code Query: operation="${operation}", query="${query}"`);

    try {
      // Get the project root (3 levels up from this file: tools -> agent -> src -> apps -> bot -> root)
      const projectRoot = join(__dirname, '..', '..', '..', '..', '..');

      // OPERATION: LIST FILES
      if (operation === 'list') {
        console.log(`📋 Listing files...`);
        const fileList = await listFiles(projectRoot, filePattern || query, maxResults);

        return {
          success: true,
          operation: 'list',
          totalFiles: fileList.length,
          files: fileList,
          summary: `Found ${fileList.length} files${filePattern || query ? ` matching pattern "${filePattern || query}"` : ''}`,
        };
      }

      // OPERATION: READ FULL FILES
      if (operation === 'read') {
        console.log(`📖 Reading files: ${query}`);
        const filePaths = query.split(',').map(p => p.trim());
        const filesContent = [];

        for (const filePath of filePaths) {
          const fullPath = join(projectRoot, filePath);

          // Security check
          if (shouldExclude(filePath)) {
            filesContent.push({
              path: filePath,
              error: 'File excluded for security reasons',
            });
            continue;
          }

          const content = await readFullFile(fullPath);
          if (content === null) {
            filesContent.push({
              path: filePath,
              error: 'File not found or cannot be read',
            });
          } else {
            const lines = content.split('\n').length;
            filesContent.push({
              path: filePath,
              lines,
              content,
            });
          }
        }

        return {
          success: true,
          operation: 'read',
          filesRead: filesContent.length,
          files: filesContent,
        };
      }

      // OPERATION: AI-POWERED ANALYSIS
      if (operation === 'analyze') {
        console.log(`🤖 AI Analysis: type="${analysisType}", query="${query}"`);

        const type = analysisType || 'summarize';

        // Find relevant files based on file pattern or search
        const allFiles = await findFiles(projectRoot, projectRoot);
        let filesToAnalyze = allFiles;

        if (filePattern) {
          const patternRegex = new RegExp(
            filePattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
            'i'
          );
          filesToAnalyze = allFiles.filter(file => {
            const relativePath = relative(projectRoot, file);
            return patternRegex.test(relativePath);
          });
        }

        // Read the files
        const filesWithContent = [];
        for (const file of filesToAnalyze.slice(0, maxFiles)) {
          const content = await readFullFile(file);
          if (content) {
            filesWithContent.push({
              path: relative(projectRoot, file),
              content,
            });
          }
        }

        if (filesWithContent.length === 0) {
          return {
            success: false,
            operation: 'analyze',
            error: 'No files found to analyze',
          };
        }

        // Perform AI analysis
        const analysis = await analyzeCodeWithAI(filesWithContent, query, type);

        return {
          success: true,
          operation: 'analyze',
          analysisType: type,
          filesAnalyzed: filesWithContent.length,
          filesList: filesWithContent.map(f => f.path),
          analysis,
        };
      }

      // OPERATION: SEARCH (default, backward compatible)
      console.log(`🔍 Search: "${query}" (mode: ${mode}, case-sensitive: ${caseSensitive})`);

      // Find all searchable files
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
        operation: 'search',
        query,
        mode: mode || 'keyword',
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
        operation,
        query,
        error: error instanceof Error ? error.message : 'Operation failed',
      };
    }
  },
});
