#!/usr/bin/env node

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { stdin } from 'node:process';
import { translateTech } from './translator.js';
import type { ConcernArea, Format, Level } from './types.js';

const program = new Command();

program
  .name('tech-translate')
  .description('Translate technical requirements into actionable implementation specs')
  .version('0.1.0')
  .argument('[file]', 'Input file (reads from stdin if omitted)')
  .option('-f, --format <type>', 'Output format: md or json', 'md')
  .option('-l, --level <level>', 'Detail level: mvp or prod', 'prod')
  .option(
    '-i, --include <concerns>',
    'Comma-separated concerns: db,devops,security,testing'
  )
  .action(async (file: string | undefined, options) => {
    try {
      // Read input
      let input: string;
      if (file) {
        input = await readFile(file, 'utf-8');
      } else {
        // Read from stdin
        input = await readStdin();
      }

      if (!input.trim()) {
        console.error('Error: Input is empty');
        process.exit(1);
      }

      // Parse options
      const format = options.format as Format;
      const level = options.level as Level;
      const include = options.include
        ? (options.include.split(',').map((s: string) => s.trim()) as ConcernArea[])
        : undefined;

      // Validate format
      if (format !== 'md' && format !== 'json') {
        console.error('Error: Format must be "md" or "json"');
        process.exit(1);
      }

      // Validate level
      if (level !== 'mvp' && level !== 'prod') {
        console.error('Error: Level must be "mvp" or "prod"');
        process.exit(1);
      }

      // Validate concerns
      if (include) {
        const validConcerns = ['db', 'devops', 'security', 'testing'];
        for (const concern of include) {
          if (!validConcerns.includes(concern)) {
            console.error(
              `Error: Invalid concern "${concern}". Valid: ${validConcerns.join(', ')}`
            );
            process.exit(1);
          }
        }
      }

      // Translate
      const result = await translateTech(input, {
        format,
        level,
        include,
      });

      // Output
      if (format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();

/**
 * Read from stdin
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}
