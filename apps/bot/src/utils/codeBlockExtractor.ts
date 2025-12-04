/**
 * Code Block Extractor
 *
 * Extracts large code blocks from messages and prepares them as file attachments.
 * This prevents code from being split across multiple Discord messages.
 */

export interface ExtractedCodeBlock {
  language: string;
  content: string;
  filename: string;
  lineCount: number;
  charCount: number;
}

export interface ExtractionResult {
  message: string;
  codeBlocks: ExtractedCodeBlock[];
}

// Thresholds for determining when to extract code as a file
const CHAR_THRESHOLD = 1500; // Extract code blocks larger than 1500 characters
const LINE_THRESHOLD = 50; // Extract code blocks with more than 50 lines

// Language to file extension mapping
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  php: 'php',
  swift: 'swift',
  kotlin: 'kt',
  scala: 'scala',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yml',
  markdown: 'md',
  sql: 'sql',
  shell: 'sh',
  bash: 'sh',
  sh: 'sh',
  powershell: 'ps1',
  r: 'r',
  matlab: 'm',
  lua: 'lua',
  perl: 'pl',
  haskell: 'hs',
  elixir: 'ex',
  erlang: 'erl',
  clojure: 'clj',
  dart: 'dart',
  solidity: 'sol',
};

/**
 * Get appropriate file extension for a given language
 */
function getFileExtension(language: string): string {
  const normalizedLang = language.toLowerCase().trim();
  return LANGUAGE_EXTENSIONS[normalizedLang] || 'txt';
}

/**
 * Generate a safe filename for a code block
 */
function generateFilename(language: string, index: number): string {
  const extension = getFileExtension(language);
  const baseName = language || 'code';
  return `${baseName}_${index}.${extension}`;
}

/**
 * Check if a code block should be extracted based on size thresholds
 */
function shouldExtractCodeBlock(content: string): boolean {
  const charCount = content.length;
  const lineCount = content.split('\n').length;

  return charCount > CHAR_THRESHOLD || lineCount > LINE_THRESHOLD;
}

/**
 * Extract large code blocks from a message and prepare them as file attachments
 *
 * @param message - The message containing code blocks
 * @returns Object with modified message and array of extracted code blocks
 */
export function extractLargeCodeBlocks(message: string): ExtractionResult {
  const codeBlocks: ExtractedCodeBlock[] = [];
  let modifiedMessage = message;
  let blockIndex = 0;

  // Regex to match code blocks with optional language specifier
  // Matches ```language\ncontent\n```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  const replacements: Array<{ original: string; replacement: string; block: ExtractedCodeBlock }> = [];

  // Find all code blocks and determine which should be extracted
  while ((match = codeBlockRegex.exec(message)) !== null) {
    const [fullMatch, language, content] = match;

    if (shouldExtractCodeBlock(content)) {
      blockIndex++;
      const filename = generateFilename(language, blockIndex);
      const lineCount = content.split('\n').length;
      const charCount = content.length;

      const extractedBlock: ExtractedCodeBlock = {
        language: language || 'text',
        content: content,
        filename,
        lineCount,
        charCount,
      };

      // Create replacement text with attachment reference
      const replacement = `📎 **Code file attached: \`${filename}\`** (${lineCount} lines, ${charCount} characters)`;

      replacements.push({
        original: fullMatch,
        replacement,
        block: extractedBlock,
      });
    }
  }

  // Apply all replacements (do this in reverse to maintain string indices)
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { original, replacement, block } = replacements[i];
    modifiedMessage = modifiedMessage.replace(original, replacement);
    codeBlocks.unshift(block); // Add to beginning to maintain order
  }

  return {
    message: modifiedMessage,
    codeBlocks,
  };
}
