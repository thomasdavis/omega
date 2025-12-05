# Triage Guide

This guide documents the conventions and workflows for triaging issues and pull requests in this repository.

## Table of Contents

- [Labels](#labels)
- [Duplicate Issues](#duplicate-issues)
- [Saved Replies](#saved-replies)

## Labels

This repository uses labels to categorize and manage issues and PRs:

- `database` - Issues requiring PostgreSQL schema changes
- `needs close` - Issues/PRs that should be automatically closed
- `duplicate` - Issues that are duplicates of existing issues

## Duplicate Issues

When you identify an issue as a duplicate of an existing issue, follow this convention:

### Process

1. **Add the `duplicate` label** to the duplicate issue
2. **Add a closing comment** using the format: `Duplicate of #<N>` where `<N>` is the issue number of the original issue
3. **Close the issue**

### Example

```markdown
Duplicate of #123
```

This creates a cross-reference link between the duplicate and the original issue, making it easy to track related discussions.

### Benefits

- **Consistent cross-linking**: All related discussions are automatically linked
- **Faster triage**: Standard format makes it clear why the issue was closed
- **Better discoverability**: Users can quickly find the canonical issue

### Using GitHub's Saved Replies

For faster triage, you can create a saved reply for duplicate closures:

1. Go to your GitHub Settings → Saved replies
2. Create a new reply with:
   - **Title**: `Duplicate Issue`
   - **Comment**: See [Saved Replies](#saved-replies) section below

## Saved Replies

### Duplicate Issue

**Title:** Duplicate Issue

**Comment:**
```markdown
Duplicate of #

Thanks for reporting this! This issue is a duplicate of an existing issue. I'm closing this in favor of the original to keep the discussion consolidated.

Please feel free to add any additional context or information to the original issue.
```

**Usage:** Replace `#` with the issue number (e.g., `#123`) before posting.

---

## Automated Workflows

This repository has several automated workflows to assist with issue management:

### Database Label Automation

When an issue is labeled with `database`, a GitHub Action automatically adds helpful guidance about database migrations and schema changes.

See [`.github/workflows/database-migrate.yml`](../workflows/database-migrate.yml) for details.

### Automatic Closure

Issues and PRs labeled with `needs close` are automatically closed every 5 minutes by a scheduled workflow.

See [`.github/workflows/close-labeled-issues.yml`](../workflows/close-labeled-issues.yml) for details.

---

## Additional Resources

- [CLAUDE.md](../../CLAUDE.md) - Project instructions and database configuration
- [Database workflows](.github/workflows/database-migrate.yml) - Migration automation
- [GitHub Issues](https://docs.github.com/en/issues) - Official GitHub documentation
