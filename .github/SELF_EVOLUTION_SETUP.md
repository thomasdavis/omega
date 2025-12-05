# Self-Evolution PR Setup

This document describes the setup for self-evolution pull requests, including templates, labels, and automation.

## PR Template

Self-evolution PRs use a dedicated template: `.github/pull_request_template_self_evolution.md`

### How to Use the Template

When creating a self-evolution PR, add the `template` query parameter to the PR creation URL:

```
https://github.com/thomasdavis/omega/compare/main...your-branch?template=pull_request_template_self_evolution.md
```

Or use the GitHub CLI:

```bash
gh pr create --template .github/pull_request_template_self_evolution.md
```

## Labels

Self-evolution PRs should be tagged with the following labels:

- **self-evolution** (required) - Identifies this as a self-evolution PR
- **ai-ops** (required) - Indicates AI operational changes
- **prompt-improvement** (conditional) - Add when persona or prompt changes are present

## CODEOWNERS

The CODEOWNERS file ensures that changes to critical paths require human approval:

- `prompts/` - AI persona and behavior definitions
- `tools/` - Bot capability implementations
- `workflows/` - Automation and workflow logic
- `.github/workflows/` - GitHub Actions workflows
- Database migration scripts

At least **1 human approval** is required from the CODEOWNERS for any PR touching these paths.

## Label Automation (Implementation Required)

To automatically apply labels to self-evolution PRs, create or modify a GitHub Actions workflow:

### Workflow: `.github/workflows/self-evolution-labels.yml`

```yaml
name: Self-Evolution PR Labels

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  label-self-evolution-pr:
    name: Auto-label Self-Evolution PRs
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Check if self-evolution PR
        id: check
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Check if PR uses self-evolution template or touches critical paths
          PR_NUMBER="${{ github.event.pull_request.number }}"
          PR_BODY="${{ github.event.pull_request.body }}"

          # Check if PR body contains self-evolution template markers
          if echo "$PR_BODY" | grep -q "Self-Evolution Pull Request"; then
            echo "is_self_evolution=true" >> $GITHUB_OUTPUT
          else
            echo "is_self_evolution=false" >> $GITHUB_OUTPUT
          fi

          # Check for persona/prompt changes
          CHANGED_FILES=$(gh pr view "$PR_NUMBER" --json files --jq '.files[].path')
          if echo "$CHANGED_FILES" | grep -qE "prompts/|persona|CLAUDE\.md"; then
            echo "has_persona_changes=true" >> $GITHUB_OUTPUT
          else
            echo "has_persona_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Apply self-evolution labels
        if: steps.check.outputs.is_self_evolution == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          PR_NUMBER="${{ github.event.pull_request.number }}"

          # Add base self-evolution labels
          gh pr edit "$PR_NUMBER" --add-label "self-evolution,ai-ops"

          # Add prompt-improvement label if persona changes detected
          if [ "${{ steps.check.outputs.has_persona_changes }}" == "true" ]; then
            gh pr edit "$PR_NUMBER" --add-label "prompt-improvement"
          fi

      - name: Request CODEOWNERS review
        if: steps.check.outputs.is_self_evolution == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          PR_NUMBER="${{ github.event.pull_request.number }}"

          # Get changed files
          CHANGED_FILES=$(gh pr view "$PR_NUMBER" --json files --jq '.files[].path')

          # Check if any CODEOWNERS paths are affected
          NEEDS_REVIEW=false
          while IFS= read -r file; do
            if echo "$file" | grep -qE "^(prompts|tools|workflows|\.github/workflows|packages/.*/tools|CLAUDE\.md)"; then
              NEEDS_REVIEW=true
              break
            fi
          done <<< "$CHANGED_FILES"

          # Request review from repository owner
          if [ "$NEEDS_REVIEW" == "true" ]; then
            gh pr edit "$PR_NUMBER" --add-reviewer thomasdavis || echo "Failed to add reviewer (may already be requested)"
          fi
```

### Manual Label Application

Until the workflow is created, labels can be applied manually:

```bash
# Add self-evolution labels
gh pr edit <PR_NUMBER> --add-label "self-evolution,ai-ops"

# Add prompt-improvement label if needed
gh pr edit <PR_NUMBER> --add-label "prompt-improvement"

# Request review from CODEOWNERS
gh pr edit <PR_NUMBER> --add-reviewer thomasdavis
```

## Creating Self-Evolution PRs

### Using GitHub CLI

```bash
# Create PR with self-evolution template
gh pr create \
  --template .github/pull_request_template_self_evolution.md \
  --title "Self-evolution: [Brief description]" \
  --label "self-evolution,ai-ops"
```

### Using GitHub Web UI

1. Create PR as usual
2. Add `?template=pull_request_template_self_evolution.md` to the PR creation URL
3. Labels will be auto-applied if workflow is configured

## Acceptance Criteria Checklist

- [x] PR template created at `.github/pull_request_template_self_evolution.md`
- [x] Template includes all required sections: Summary, Reflection snapshot, Proposed changes, Safety checks, Rollout plan, Rollback plan, Metrics to watch
- [x] CODEOWNERS file created with entries for prompts/, tools/, workflows/
- [x] CODEOWNERS requires human approval for critical paths
- [ ] Label automation workflow implemented (requires workflow file creation)
- [ ] Reviewer auto-request functionality implemented (requires workflow file creation)

## Notes

- The label automation workflow cannot be created via this PR due to GitHub App permissions
- The workflow YAML above should be manually created or added via a separate PR with appropriate permissions
- CODEOWNERS integration works automatically once the file is merged to the default branch
