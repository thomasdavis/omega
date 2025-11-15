# Automated TypeScript and Lint Error Fixing

This document describes the automated CI/CD setup for detecting and fixing TypeScript errors and lint issues.

## Overview

The project now includes:

1. **ESLint Configuration** - TypeScript-aware linting for all packages
2. **Automated Scripts** - Commands to check and fix issues locally
3. **GitHub Actions Workflow** - CI pipeline for automated checks and fixes

## Local Development

### Available Commands

From the root directory, you can run:

```bash
# Check for lint errors across all packages
pnpm lint

# Automatically fix lint errors where possible
pnpm lint:fix

# Check for TypeScript type errors
pnpm type-check

# Run the full build
pnpm build
```

### Package-Specific Commands

You can also run these commands within specific packages:

```bash
# In apps/bot or packages/shared
pnpm lint
pnpm lint:fix
pnpm type-check
```

## ESLint Configuration

### Root Configuration (`.eslintrc.json`)

The root ESLint configuration provides:

- TypeScript parsing and type-aware linting
- Recommended ESLint and TypeScript rules
- Warnings for unused variables (except those prefixed with `_`)
- Warnings for explicit `any` types
- Console statements allowed (for server-side code)

### Rules Highlights

```json
{
  "@typescript-eslint/no-unused-vars": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/explicit-function-return-type": "off",
  "no-console": "off"
}
```

## GitHub Actions CI Pipeline

### Workflow File Location

**IMPORTANT**: Due to GitHub App permissions, the workflow file must be manually placed in `.github/workflows/`.

The workflow file is provided at: `ci-check-workflow.yml`

**To activate the CI pipeline:**

1. Move the workflow file to the correct location:
   ```bash
   mv ci-check-workflow.yml .github/workflows/ci-check.yml
   ```

2. Commit and push:
   ```bash
   git add .github/workflows/ci-check.yml
   git commit -m "chore: add CI workflow for type checking and linting"
   git push
   ```

### Workflow Features

The CI workflow includes two jobs:

#### 1. Check Job (Runs on all PRs and main branch pushes)

- Installs dependencies
- Runs type checking (`pnpm type-check`)
- Runs linting (`pnpm lint`)
- Builds the project (`pnpm build`)

This ensures all code meets quality standards before merging.

#### 2. Auto-fix Job (Runs only on PRs)

- Automatically fixes lint issues using `pnpm lint:fix`
- Commits and pushes fixes back to the PR branch
- Comments on the PR when fixes are applied
- Only runs if fixable issues are found

### Safety Features

The auto-fix job includes several safety measures:

1. **Continue on error** - Won't fail if some lint issues can't be auto-fixed
2. **Change detection** - Only commits if files were actually modified
3. **PR-only** - Auto-fixes only run on pull requests, not on main branch
4. **Clear logging** - All auto-fixes are logged and commented on the PR

### Workflow Triggers

The workflow runs on:

- Pull requests to `main` branch
- Direct pushes to `main` branch

## Integration with Turborepo

The setup integrates seamlessly with the existing Turborepo configuration:

```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"]
    },
    "lint:fix": {
      "dependsOn": ["^lint:fix"],
      "cache": false
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
```

This ensures that when you run `pnpm lint` from the root:
1. All workspace packages run their lint scripts in dependency order
2. Results are cached by Turborepo for faster subsequent runs
3. Auto-fix commands bypass cache to ensure fresh fixes

## Adding Lint Rules

To customize linting rules:

1. Edit `.eslintrc.json` in the root directory
2. Add or modify rules in the `rules` section
3. Run `pnpm lint` to verify the changes
4. Commit the updated configuration

### Example: Making a Rule More Strict

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"  // Changed from "warn"
  }
}
```

## Troubleshooting

### Lint errors but no auto-fixes applied

Some lint rules cannot be auto-fixed. In these cases:

1. Review the lint error messages
2. Manually fix the issues in your code
3. Run `pnpm lint` to verify fixes

### Type check errors

Type errors cannot be auto-fixed. You must:

1. Review the TypeScript error messages
2. Fix type issues in your code
3. Run `pnpm type-check` to verify

### CI workflow not running

Ensure the workflow file is in `.github/workflows/` directory with a `.yml` extension.

### Permission errors in CI

The auto-fix job requires write permissions. Ensure your repository settings allow GitHub Actions to create commits.

## Best Practices

1. **Run locally first** - Always run `pnpm lint` and `pnpm type-check` before pushing
2. **Use auto-fix** - Run `pnpm lint:fix` to automatically fix simple issues
3. **Review auto-fixes** - Check what the auto-fix changed before committing
4. **Don't ignore warnings** - Address warnings to maintain code quality
5. **Keep dependencies updated** - Regularly update ESLint and TypeScript

## Dependencies Added

The following dependencies were added to support linting:

```json
{
  "@typescript-eslint/eslint-plugin": "^6.21.0",
  "@typescript-eslint/parser": "^6.21.0",
  "eslint": "^8.57.0"
}
```

These are installed as dev dependencies in the root `package.json`.

## Next Steps

After activating the workflow:

1. Test it by creating a PR with intentional lint issues
2. Verify that the check job catches the issues
3. Verify that the auto-fix job fixes and commits changes
4. Adjust rules in `.eslintrc.json` as needed for your coding standards

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Turborepo Documentation](https://turbo.build/repo/docs)
