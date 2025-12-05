#!/usr/bin/env node

import { Command } from 'commander';
import { translateTech } from '../lib/translate.js';
import type { OutputFormat, SpecLevel } from '../types/index.js';

const program = new Command();

program
  .name('tech-translate')
  .description('Translate user requests into structured technical specifications')
  .version('0.1.0')
  .argument('[request...]', 'User request to translate')
  .option('-f, --format <format>', 'Output format: md (markdown) or json', 'md')
  .option('-l, --level <level>', 'Specification level: mvp or prod', 'prod')
  .option('--include <sections>', 'Comma-separated list of sections to include: db,devops,security,testing', 'db,devops,security,testing')
  .action(async (requestArgs: string[], options) => {
    try {
      let request: string;

      if (requestArgs.length > 0) {
        request = requestArgs.join(' ');
      } else {
        const stdin = await readStdin();
        if (!stdin.trim()) {
          console.error('Error: No input provided. Provide a request as arguments or via stdin.');
          process.exit(1);
        }
        request = stdin;
      }

      const format = normalizeFormat(options.format);
      const level = normalizeLevel(options.level);
      const include = parseInclude(options.include);

      const result = await translateTech(request, {
        format,
        level,
        include,
      });

      if (typeof result === 'string') {
        console.log(result);
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

function normalizeFormat(format: string): OutputFormat {
  const normalized = format.toLowerCase();
  if (normalized === 'md' || normalized === 'markdown') {
    return 'markdown';
  }
  if (normalized === 'json') {
    return 'json';
  }
  throw new Error(`Invalid format: ${format}. Use 'md' or 'json'.`);
}

function normalizeLevel(level: string): SpecLevel {
  const normalized = level.toLowerCase();
  if (normalized === 'mvp' || normalized === 'prod') {
    return normalized;
  }
  throw new Error(`Invalid level: ${level}. Use 'mvp' or 'prod'.`);
}

function parseInclude(include: string): { db?: boolean; devops?: boolean; security?: boolean; testing?: boolean } {
  const sections = include.toLowerCase().split(',').map(s => s.trim());
  return {
    db: sections.includes('db'),
    devops: sections.includes('devops'),
    security: sections.includes('security'),
    testing: sections.includes('testing'),
  };
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}
