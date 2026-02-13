import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library bundle
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    outDir: 'dist',
  },
  // CLI bundle
  {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
