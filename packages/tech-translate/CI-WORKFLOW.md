# GitHub Actions CI Workflow

Due to permission restrictions, the CI workflow file could not be committed directly.
Below is the workflow configuration that should be added to `.github/workflows/tech-translate-ci.yml`:

```yaml
name: Tech Translate CI

on:
  push:
    branches: [main]
    paths:
      - 'packages/tech-translate/**'
      - '.github/workflows/tech-translate-ci.yml'
  pull_request:
    paths:
      - 'packages/tech-translate/**'
      - '.github/workflows/tech-translate-ci.yml'

jobs:
  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm --filter @repo/tech-translate build

      - name: Type check
        run: pnpm --filter @repo/tech-translate type-check

      - name: Lint
        run: pnpm --filter @repo/tech-translate lint

      - name: Test
        run: pnpm --filter @repo/tech-translate test

  build:
    name: Build verification
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm build

      - name: Verify tech-translate outputs
        run: |
          ls -la packages/tech-translate/dist
          test -f packages/tech-translate/dist/index.js
          test -f packages/tech-translate/dist/index.cjs
          test -f packages/tech-translate/dist/index.d.ts
          test -f packages/tech-translate/dist/cli.js
          test -f packages/tech-translate/dist/cli.cjs

      - name: Test CLI execution
        run: |
          node packages/tech-translate/dist/cli.js "add live status page" --format md
          node packages/tech-translate/dist/cli.js "add auth" --format json --level mvp
```

## Manual Setup

To add this workflow:

1. Create the file `.github/workflows/tech-translate-ci.yml`
2. Copy the YAML content above into the file
3. Commit and push

The workflow will:
- Run tests on Node.js 18, 20, and 22
- Verify builds produce correct output files
- Run type-checking and linting
- Test CLI execution
