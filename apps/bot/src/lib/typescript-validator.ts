/**
 * TypeScript Validation Module
 * Provides basic syntax and structure validation for TypeScript code before execution
 *
 * Note: This performs basic validation checks. Full linting and type checking
 * would require a complete TypeScript compiler environment, which is not
 * practical in a sandboxed execution context.
 */

export interface ValidationOptions {
  skipChecks?: boolean;
}

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  skipped: boolean;
  skipReason?: string;
}

/**
 * Validates TypeScript code by performing basic syntax and structure checks
 */
export async function validateTypeScript(
  code: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  // Check if validation should be skipped
  if (options.skipChecks) {
    return {
      success: true,
      errors: [],
      warnings: [],
      skipped: true,
      skipReason: 'Validation bypassed by user request',
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic syntax validation checks

    // Check for common TypeScript syntax errors
    checkBasicSyntax(code, errors, warnings);

    // Check for potentially problematic patterns
    checkCodeQuality(code, warnings);

    // Check for type-related issues
    checkTypeUsage(code, warnings);

    return {
      success: errors.length === 0,
      errors,
      warnings,
      skipped: false,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      skipped: false,
    };
  }
}

/**
 * Check for basic syntax errors
 */
function checkBasicSyntax(code: string, errors: string[], warnings: string[]): void {
  // Check for balanced brackets
  const brackets = { '(': ')', '[': ']', '{': '}' };
  const stack: string[] = [];
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let lineNum = 1;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];

    // Track line numbers
    if (char === '\n') {
      lineNum++;
      inComment = false; // Single-line comment ends
    }

    // Handle comments
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inComment = true;
        i++; // Skip next char
        continue;
      }
      if (char === '/' && nextChar === '*') {
        // Block comment start
        const commentEnd = code.indexOf('*/', i + 2);
        if (commentEnd === -1) {
          errors.push(`Unclosed block comment starting at line ${lineNum}`);
        } else {
          i = commentEnd + 1; // Skip to end of comment
        }
        continue;
      }
    }

    if (inComment) continue;

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && (i === 0 || code[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (inString) continue;

    // Check brackets
    if (char in brackets) {
      stack.push(char);
    } else if (Object.values(brackets).includes(char)) {
      if (stack.length === 0) {
        errors.push(`Unexpected closing bracket '${char}' at line ${lineNum}`);
      } else {
        const last = stack.pop()!;
        if (brackets[last as keyof typeof brackets] !== char) {
          errors.push(`Mismatched brackets: expected '${brackets[last as keyof typeof brackets]}' but found '${char}' at line ${lineNum}`);
        }
      }
    }
  }

  // Check for unclosed brackets
  if (stack.length > 0) {
    errors.push(`Unclosed brackets: ${stack.join(', ')}`);
  }

  // Check for unclosed strings
  if (inString) {
    errors.push(`Unclosed string (started with ${stringChar})`);
  }

  // Check for incomplete statements
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

    // Check for statements that should end with semicolon
    if (
      trimmed.match(/^(const|let|var|return|throw|break|continue)\s+/) &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith('{') &&
      !trimmed.endsWith(',') &&
      !trimmed.endsWith('=>')
    ) {
      warnings.push(`Line ${idx + 1}: Statement may be missing semicolon`);
    }
  });
}

/**
 * Check for code quality issues
 */
function checkCodeQuality(code: string, warnings: string[]): void {
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check for console.log in production code (warning only)
    if (trimmed.includes('console.log(') && !trimmed.startsWith('//')) {
      warnings.push(`Line ${idx + 1}: Consider removing console.log statements`);
    }

    // Check for var usage (should use let/const)
    if (trimmed.match(/^var\s+/)) {
      warnings.push(`Line ${idx + 1}: Consider using 'let' or 'const' instead of 'var'`);
    }

    // Check for == instead of ===
    if (trimmed.includes('==') && !trimmed.includes('===') && !trimmed.includes('!==')) {
      warnings.push(`Line ${idx + 1}: Consider using '===' instead of '=='`);
    }
  });

  // Check for any usage (TypeScript-specific)
  const anyUsage = code.match(/:\s*any\b/g);
  if (anyUsage && anyUsage.length > 3) {
    warnings.push(`Excessive use of 'any' type (${anyUsage.length} occurrences) - consider using specific types`);
  }
}

/**
 * Check for type-related issues
 */
function checkTypeUsage(code: string, warnings: string[]): void {
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check for untyped function parameters
    if (trimmed.match(/function\s+\w+\s*\([^)]*\)\s*{/) || trimmed.match(/\w+\s*\([^)]*\)\s*{/)) {
      const paramMatch = trimmed.match(/\(([^)]*)\)/);
      if (paramMatch && paramMatch[1]) {
        const params = paramMatch[1].split(',');
        params.forEach(param => {
          if (param.trim() && !param.includes(':') && param.trim() !== '...args') {
            warnings.push(`Line ${idx + 1}: Parameter '${param.trim()}' is missing type annotation`);
          }
        });
      }
    }

    // Check for untyped variables
    if (trimmed.match(/^(const|let)\s+\w+\s*=/) && !trimmed.includes(':')) {
      // Only warn if it's not obviously typed by inference
      if (!trimmed.match(/=\s*(\d+|true|false|"[^"]*"|'[^']*'|`[^`]*`)/)) {
        warnings.push(`Line ${idx + 1}: Variable declaration may benefit from explicit type annotation`);
      }
    }
  });
}

/**
 * Check if a message contains bypass keywords
 */
export function shouldBypassValidation(message?: string): boolean {
  if (!message) return false;

  const bypassKeywords = [
    'skip checks',
    'skip validation',
    'bypass checks',
    'bypass validation',
    'no checks',
    'no validation',
    'skip linting',
    'skip lint',
    '--skip-checks',
    '--no-checks',
    'ignore checks',
    'without checks',
    'without validation',
  ];

  const lowerMessage = message.toLowerCase();
  return bypassKeywords.some(keyword => lowerMessage.includes(keyword));
}
