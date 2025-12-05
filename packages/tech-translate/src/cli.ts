import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { TechTranslator } from './translator.js';
import type { TechTranslationSpec, OutputFormat } from './types.js';

const program = new Command();

program
  .name('tech-translate')
  .description('CLI tool for technical content translation')
  .version('0.0.0');

program
  .command('translate')
  .description('Translate technical content')
  .argument('<input>', 'Input content or path to file (use @filename to read from file)')
  .option('-l, --language <language>', 'Target language', 'en')
  .option('-t, --technical-level <level>', 'Technical level (beginner|intermediate|advanced|expert)')
  .option('-a, --audience <audience>', 'Target audience description')
  .option('-f, --format <format>', 'Output format (markdown|json)', 'markdown')
  .option('-s, --source-language <language>', 'Source language (auto-detect if not provided)')
  .action(async (input: string, options) => {
    try {
      let content = input;

      // Check if input is a file reference (starts with @)
      if (input.startsWith('@')) {
        const filePath = input.slice(1);
        content = await readFile(filePath, 'utf-8');
      }

      const spec: TechTranslationSpec = {
        input: content,
        sourceLanguage: options.sourceLanguage,
        target: {
          language: options.language,
          technicalLevel: options.technicalLevel,
          audience: options.audience,
        },
        outputFormat: options.format as OutputFormat,
        preserveCodeBlocks: true,
        preserveLinks: true,
        preserveFormatting: true,
      };

      const translator = new TechTranslator();
      const result = await translator.translate(spec);

      console.log(result.translatedContent);

      // Output metadata to stderr so it doesn't interfere with piping
      console.error('\nTranslation metadata:');
      console.error(JSON.stringify(result.metadata, null, 2));
    } catch (error) {
      console.error('Translation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a translation specification')
  .argument('<spec-file>', 'Path to JSON specification file')
  .action(async (specFile: string) => {
    try {
      const content = await readFile(specFile, 'utf-8');
      const spec = JSON.parse(content);

      const translator = new TechTranslator();
      const validation = translator.validateSpec(spec);

      if (validation.valid) {
        console.log('✓ Specification is valid');
        process.exit(0);
      } else {
        console.error('✗ Specification is invalid:');
        validation.errors?.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('Validation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export { program };
