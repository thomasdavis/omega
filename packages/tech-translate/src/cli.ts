#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TechTranslator } from './translator.js';
import {
  TechTranslationSpecSchema,
  type TechTranslationSpec,
} from './types.js';

const program = new Command();

program
  .name('tech-translate')
  .description('AI-powered technical content translator with tone preservation')
  .version('0.0.0');

program
  .command('translate')
  .description('Translate technical content')
  .option('-i, --input <file>', 'Input file path')
  .option('-t, --text <text>', 'Text to translate (alternative to --input)')
  .option('-s, --source <lang>', 'Source language', 'en')
  .option('-l, --target <lang>', 'Target language (required)')
  .option(
    '--tone <tone>',
    'Translation tone (formal|casual|technical|friendly|professional)',
    'professional',
  )
  .option('--format <format>', 'Output format (markdown|json)', 'markdown')
  .option('--no-preserve-code', 'Do not preserve code blocks')
  .option('--no-preserve-urls', 'Do not preserve URLs')
  .action(async (options) => {
    try {
      let sourceText: string;

      if (options.input) {
        const inputPath = resolve(process.cwd(), options.input);
        sourceText = readFileSync(inputPath, 'utf-8');
      } else if (options.text) {
        sourceText = options.text;
      } else {
        console.error(
          'Error: Either --input or --text must be provided',
        );
        process.exit(1);
      }

      if (!options.target) {
        console.error('Error: --target language is required');
        process.exit(1);
      }

      const spec: TechTranslationSpec = TechTranslationSpecSchema.parse({
        sourceText,
        sourceLanguage: options.source,
        targetLanguage: options.target,
        tone: options.tone,
        preserveCodeBlocks: options.preserveCode !== false,
        preserveUrls: options.preserveUrls !== false,
        outputFormat: options.format,
      });

      const translator = new TechTranslator();
      const result = await translator.translate(spec);

      if (spec.outputFormat === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.translatedText);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse();
