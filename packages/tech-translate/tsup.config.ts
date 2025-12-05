import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  // Ensure CLI has executable shebang
  banner: {
    js: (ctx) => {
      if (ctx.format === 'esm' && ctx.path.includes('cli')) {
        return '#!/usr/bin/env node';
      }
      return '';
    },
  },
});
