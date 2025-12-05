import { defineConfig } from 'tsup';

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
  },
  // CLI build with shebang
  {
    entry: ['src/cli.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    shims: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
