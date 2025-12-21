#!/usr/bin/env node
/**
 * Tech Translate CLI
 *
 * Command-line interface for tech translation tool.
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { stdin } from 'process';
import { translateTech } from '../core/translator.js';
import type { OutputFormat, StylePreset, DepthLevel, Domain } from '../types/index.js';
import {
  DOMAINS,
  OUTPUT_FORMATS,
  STYLE_PRESETS,
  DEPTH_LEVELS,
} from '../types/index.js';

const program = new Command();

/**
 * Read from stdin
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    stdin.on('data', (chunk) => chunks.push(chunk));
    stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

/**
 * Format output for display
 */
function formatOutput(
  result: Awaited<ReturnType<typeof translateTech>>,
  color: boolean
): string {
  if (!result.success) {
    const errorMsg = `Error: ${result.error}`;
    return color ? `\x1b[31m${errorMsg}\x1b[0m` : errorMsg;
  }

  let output = '';

  if (color) {
    output += `\x1b[1m\x1b[32m✓ ${result.title}\x1b[0m\n\n`;
  } else {
    output += `✓ ${result.title}\n\n`;
  }

  if (result.markdown) {
    output += `${result.markdown}\n`;
  }

  if (result.json) {
    output += `\n\n---\n\nJSON Output:\n\n`;
    output += JSON.stringify(result.json, null, 2);
  }

  return output;
}

program
  .name('tech-translate')
  .description('Convert user requests into detailed technical specifications')
  .version('0.1.0')
  .argument('[request]', 'User request to translate (or read from stdin)')
  .option('-f, --format <format>', `Output format: ${OUTPUT_FORMATS.join(', ')}`, 'both')
  .option('-s, --style <style>', `Style preset: ${STYLE_PRESETS.join(', ')}`, 'enterprise')
  .option('-d, --depth <depth>', `Detail depth: ${DEPTH_LEVELS.join(', ')}`, 'medium')
  .option('-D, --domain <domain>', `Domain: ${DOMAINS.join(', ')}`)
  .option('-o, --out <file>', 'Output file (default: stdout)')
  .option('--no-color', 'Disable colored output')
  .option('--no-assumptions', 'Skip assumptions section')
  .option('--no-risks', 'Skip risks section')
  .option('--no-milestones', 'Skip milestones section')
  .option('--provider <provider>', 'LLM provider: openai, anthropic', 'openai')
  .option('--model <model>', 'Model name override')
  .option('--api-key <key>', 'API key override (or use env var)')
  .action(async (request, options) => {
    try {
      // Get input
      let userRequest = request;
      if (!userRequest) {
        if (stdin.isTTY) {
          console.error('Error: No request provided. Provide as argument or via stdin.');
          process.exit(1);
        }
        userRequest = await readStdin();
      }

      if (!userRequest.trim()) {
        console.error('Error: Empty request');
        process.exit(1);
      }

      // Validate options
      const format = options.format as OutputFormat;
      if (!OUTPUT_FORMATS.includes(format)) {
        console.error(`Error: Invalid format. Must be one of: ${OUTPUT_FORMATS.join(', ')}`);
        process.exit(1);
      }

      const style = options.style as StylePreset;
      if (!STYLE_PRESETS.includes(style)) {
        console.error(`Error: Invalid style. Must be one of: ${STYLE_PRESETS.join(', ')}`);
        process.exit(1);
      }

      const depth = options.depth as DepthLevel;
      if (!DEPTH_LEVELS.includes(depth)) {
        console.error(`Error: Invalid depth. Must be one of: ${DEPTH_LEVELS.join(', ')}`);
        process.exit(1);
      }

      let domain: Domain | undefined;
      if (options.domain) {
        domain = options.domain as Domain;
        if (!DOMAINS.includes(domain)) {
          console.error(`Error: Invalid domain. Must be one of: ${DOMAINS.join(', ')}`);
          process.exit(1);
        }
      }

      // Show progress
      if (!options.out && options.color !== false) {
        console.error('\x1b[2mGenerating specification...\x1b[0m');
      }

      // Translate
      const result = await translateTech(
        { userRequest },
        {
          format,
          style,
          depth,
          domain,
          includeAssumptions: options.assumptions !== false,
          includeRisks: options.risks !== false,
          includeMilestones: options.milestones !== false,
          provider: {
            provider: options.provider,
            apiKey: options.apiKey,
            model: options.model,
          },
        }
      );

      // Format output
      const output = formatOutput(result, options.color !== false);

      // Write output
      if (options.out) {
        const outputPath = options.out;

        // If format is 'both', write separate files
        if (format === 'both' && result.success) {
          const basePath = outputPath.replace(/\.(md|json)$/, '');
          if (result.markdown) {
            writeFileSync(`${basePath}.md`, result.markdown);
          }
          if (result.json) {
            writeFileSync(`${basePath}.json`, JSON.stringify(result.json, null, 2));
          }
          console.log(`✓ Output written to ${basePath}.{md,json}`);
        } else {
          writeFileSync(outputPath, output);
          console.log(`✓ Output written to ${outputPath}`);
        }
      } else {
        console.log(output);
      }

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Fatal error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
