# GitHub Actions Workflow Setup

Due to GitHub App permissions, the CI/CD workflow file could not be automatically committed. Please manually add the following workflow file to enable automated testing and npm publishing.

## File Location

Create: `.github/workflows/tech-translate-ci.yml`

## Workflow Content

```yaml
name: Tech Translate CI/CD

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
    name: Test & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: |
          cd packages/tech-translate
          pnpm type-check

      - name: Lint
        run: |
          cd packages/tech-translate
          pnpm lint

      - name: Run tests
        run: |
          cd packages/tech-translate
          pnpm test

      - name: Build
        run: |
          cd packages/tech-translate
          pnpm build

      - name: Check build artifacts
        run: |
          cd packages/tech-translate
          ls -la dist/
          test -f dist/index.js
          test -f dist/index.cjs
          test -f dist/index.d.ts
          test -f dist/cli.js

  publish:
    name: Publish to npm
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build package
        run: |
          cd packages/tech-translate
          pnpm build

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm -F @omega/tech-translate publish --access public
          version: pnpm changeset version
          commit: 'chore: version tech-translate'
          title: 'chore: release tech-translate'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Required Secrets

Add the following secret to your GitHub repository:

1. Go to: Settings → Secrets and variables → Actions
2. Add new repository secret:
   - Name: `NPM_TOKEN`
   - Value: Your npm access token (create at https://www.npmjs.com/settings/tokens)

## How Publishing Works

1. **On PR**: Workflow runs tests and builds
2. **On merge to main**: Changesets creates a "Version Packages" PR
3. **When Version PR is merged**: Automatically publishes to npm with provenance

## Manual Publishing (Alternative)

If you prefer manual control:

```bash
cd packages/tech-translate
pnpm build
pnpm changeset publish
```

Note: This requires `NPM_TOKEN` to be set locally or in your environment.
