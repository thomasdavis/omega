#!/usr/bin/env node

/**
 * CLI for Tech Translation tool
 * Usage: echo "user text" | npx tech-translate --format md|json|both
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { stdin } from 'process';
import { translateTech } from './core/index.js';
import type { TranslateInput, TranslateOptions, ProviderConfig } from './types/index.js';

const program = new Command();

program
  .name('tech-translate')
  .description('Convert informal user requests into detailed technical specifications')
  .version('0.1.0')
  .argument('[input]', 'User request text (or use stdin)')
  .option('-f, --format <format>', 'Output format: md, json, or both', 'both')
  .option('-d, --depth <depth>', 'Detail depth: brief, standard, high, exhaustive', 'standard')
  .option('-s, --style <style>', 'Style preset: startup, enterprise, research, academic', 'enterprise')
  .option('--domain <domain>', 'Domain context: web, mobile, data, ml, infrastructure, embedded, general')
  .option('-o, --out <path>', 'Output directory (default: stdout)')
  .option('-c, --context <text>', 'Additional project context')
  .option('--constraints <items>', 'Comma-separated constraints')
  .option('--provider <provider>', 'LLM provider: openai, anthropic', 'openai')
  .option('--model <model>', 'Model name (provider-specific)')
  .option('--no-color', 'Disable colored output')
  .action(async (inputArg, options) => {
    try {
      // Read input from arg or stdin
      let inputText = inputArg;

      if (!inputText) {
        // Check if stdin has data
        if (stdin.isTTY) {
          console.error('Error: No input provided. Use: tech-translate "your request" or pipe input via stdin');
          process.exit(1);
        }

        // Read from stdin
        const chunks: Buffer[] = [];
        for await (const chunk of stdin) {
          chunks.push(chunk);
        }
        inputText = Buffer.concat(chunks).toString('utf-8').trim();
      }

      if (!inputText) {
        console.error('Error: Empty input');
        process.exit(1);
      }

      // Build input object
      const input: TranslateInput = {
        input: inputText,
        domain: options.domain,
        projectContext: options.context,
        constraints: options.constraints ? options.constraints.split(',').map((s: string) => s.trim()) : undefined,
      };

      // Build options
      const translateOptions: TranslateOptions = {
        depth: options.depth,
        style: options.style,
        format: options.format,
      };

      // Build provider config
      const providerConfig: ProviderConfig = {
        type: options.provider,
        model: options.model,
      };

      // Perform translation
      const result = await translateTech(input, translateOptions, providerConfig);

      // Output results
      if (options.out) {
        // Write to files
        if (options.format === 'markdown' || options.format === 'both') {
          const mdPath = `${options.out}/spec.md`;
          writeFileSync(mdPath, result.markdown);
          console.log(`✅ Markdown written to: ${mdPath}`);
        }

        if (options.format === 'json' || options.format === 'both') {
          const jsonPath = `${options.out}/spec.json`;
          writeFileSync(jsonPath, JSON.stringify(result.spec, null, 2));
          console.log(`✅ JSON written to: ${jsonPath}`);
        }
      } else {
        // Write to stdout
        if (options.format === 'markdown') {
          console.log(result.markdown);
        } else if (options.format === 'json') {
          console.log(JSON.stringify(result.spec, null, 2));
        } else {
          // Both: output markdown with JSON summary
          console.log('=== MARKDOWN ===\n');
          console.log(result.markdown);
          console.log('\n\n=== JSON ===\n');
          console.log(JSON.stringify(result.spec, null, 2));
        }
      }

      // Print metadata
      if (options.out) {
        console.log('\nMetadata:');
        console.log(`  Provider: ${result.metadata.provider}`);
        console.log(`  Model: ${result.metadata.model || 'unknown'}`);
        console.log(`  Tokens: ${result.metadata.tokensUsed || 'unknown'}`);
        console.log(`  Duration: ${result.metadata.duration}ms`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
