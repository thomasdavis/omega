#!/usr/bin/env node

import { Command } from 'commander';
import { translateTech } from './index.js';
import { formatAsJson } from './formatter.js';
import type { TechTranslationSpec } from './types.js';

const program = new Command();

program
  .name('tech-translate')
  .description('Convert user requests into detailed technical specifications')
  .version('0.1.0')
  .argument('[request...]', 'freeform user request (can also be piped via stdin)')
  .option('-f, --format <type>', 'output format: md (markdown) or json', 'md')
  .option('-l, --level <type>', 'specification level: mvp or prod', 'prod')
  .option(
    '-i, --include <sections>',
    'comma-separated sections to include: db,devops,security,testing',
    'db,devops,security,testing'
  )
  .action(async (requestArgs: string[], options) => {
    try {
      let request: string;

      // Check if input is from stdin or arguments
      if (requestArgs.length > 0) {
        request = requestArgs.join(' ');
      } else {
        // Read from stdin
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        request = Buffer.concat(chunks).toString('utf-8').trim();
      }

      if (!request) {
        console.error('Error: No request provided. Please provide a request as an argument or via stdin.');
        process.exit(1);
      }

      // Parse format
      const format = options.format === 'json' ? 'json' : 'markdown';

      // Parse level
      const level = options.level === 'mvp' ? 'mvp' : 'prod';

      // Parse include sections
      const includeParts = options.include.split(',').map((s: string) => s.trim().toLowerCase());
      const include = {
        db: includeParts.includes('db'),
        devops: includeParts.includes('devops'),
        security: includeParts.includes('security'),
        testing: includeParts.includes('testing'),
      };

      // Translate the request
      const result = await translateTech(request, { format, level, include });

      // Output the result
      if (format === 'json') {
        // Result is already a TechTranslationSpec object
        console.log(formatAsJson(result as TechTranslationSpec));
      } else {
        // Result is a markdown string
        console.log(result);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
