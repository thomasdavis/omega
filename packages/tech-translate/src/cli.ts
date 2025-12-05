#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { runTechTranslate, toolManifest } from './index.js';
import type { TechTranslateInput } from './schema.js';
import { renderMarkdown } from './renderers/markdown.js';
import { renderJson } from './renderers/json.js';

const program = new Command();

program
  .name('tech-translate')
  .description(toolManifest.description)
  .version(toolManifest.version)
  .option('-r, --request <text>', 'User request to translate')
  .option('-m, --mode <mode>', 'Output mode: markdown or json', 'markdown')
  .option('-a, --assumption <text>', 'Add a charitable assumption (repeatable)', collect, [])
  .option('--audience <type>', 'Target audience', 'mixed')
  .option('-c, --constraint <text>', 'Add a constraint (repeatable)', collect, [])
  .option('-o, --out <file>', 'Output file (optional, defaults to stdout)')
  .option('--stdin', 'Read input JSON from stdin')
  .action(async (options) => {
    try {
      let input: TechTranslateInput;

      if (options.stdin) {
        // Read JSON input from stdin
        const stdinData = readFileSync(0, 'utf-8');
        input = JSON.parse(stdinData) as TechTranslateInput;
      } else if (options.request) {
        // Build input from CLI flags
        input = {
          request: options.request,
          outputMode: options.mode,
          audience: options.audience,
          assumptions: options.assumption,
          constraints: options.constraint,
        };
      } else {
        console.error('Error: Must provide either --request or --stdin');
        process.exit(1);
      }

      // Run translation
      const output = await runTechTranslate(input);

      // Render output
      const mode = input.outputMode || options.mode || 'markdown';
      let rendered: string;

      if (mode === 'json') {
        rendered = renderJson(output);
      } else {
        rendered = renderMarkdown(output);
      }

      // Write output
      if (options.out) {
        writeFileSync(options.out, rendered, 'utf-8');
        console.error(`Output written to ${options.out}`);
      } else {
        console.log(rendered);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse();

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
