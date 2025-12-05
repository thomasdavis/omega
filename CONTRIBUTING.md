# Contributing to Omega

Thank you for your interest in contributing to Omega! This document outlines our processes for issue triage, duplicate handling, and prioritization.

## Issue Triage Process

### Marking Duplicates

When you identify a duplicate issue, follow these steps:

1. **Add the `duplicate` label** to the new issue
2. **Add a comment** referencing the original issue using the format:
   ```
   Duplicate of #N
   ```
   Where `N` is the issue number of the original issue

3. **Close the duplicate issue** after adding the label and comment

**Example:**
```
Duplicate of #123
```

This helps maintain a clean issue tracker and consolidates discussion in one place.

### Checking for Duplicates

Before creating a new issue:
- Search existing issues (both open and closed) for similar problems
- Look for related error messages, feature requests, or bug descriptions
- Check if the issue has already been reported and add context to the existing issue instead

## Priority Assignment (P0-P3)

During triage, assign priority labels to help the team understand urgency and impact:

### Priority Levels

#### P0 - Critical
**Label:** `P0`

Use for issues that:
- Block deployment or production operation
- Cause data loss or corruption
- Create security vulnerabilities
- Affect all users or critical functionality

**Response Time:** Immediate attention required

**Examples:**
- Production database is down
- Security vulnerability exposed
- Complete service outage

#### P1 - High
**Label:** `P1`

Use for issues that:
- Significantly impact user experience
- Block important features from working
- Affect a large portion of users
- Require urgent attention but don't block deployment

**Response Time:** Address within 1-2 days

**Examples:**
- Major feature broken for most users
- Performance degradation affecting UX
- Important integration failing

#### P2 - Medium
**Label:** `P2`

Use for issues that:
- Affect some users or specific use cases
- Cause inconvenience but have workarounds
- Represent important features or improvements
- Should be addressed in the current development cycle

**Response Time:** Address within 1-2 weeks

**Examples:**
- Feature enhancement requests
- Non-critical bugs with workarounds
- UI/UX improvements

#### P3 - Low
**Label:** `P3`

Use for issues that:
- Have minimal user impact
- Represent nice-to-have improvements
- Can be deferred without significant consequences
- Affect edge cases or rare scenarios

**Response Time:** Address when capacity allows

**Examples:**
- Minor UI tweaks
- Code refactoring (non-urgent)
- Documentation improvements
- Low-impact feature requests

### Priority Assignment Guidelines

1. **Consider impact and urgency:** Evaluate how many users are affected and how severely
2. **Assess workarounds:** Issues with no workaround should be higher priority
3. **Think about dependencies:** Issues blocking other work should be prioritized
4. **Review regularly:** Priorities can change as context evolves
5. **Default to P2:** If unsure, start with P2 and adjust based on discussion

### Applying Priority Labels

When triaging an issue:
1. Read and understand the issue thoroughly
2. Determine the appropriate priority level
3. Add the corresponding label (`P0`, `P1`, `P2`, or `P3`)
4. Add a brief comment explaining the priority decision if it's not obvious

**Example triage comment:**
```
Setting to P1 - this affects user authentication for all new users.
Existing users can still login, but we need to fix this quickly.
```

## General Contributing Guidelines

- Follow the project's coding standards (see `CLAUDE.md` for AI-specific guidance)
- Write clear, descriptive commit messages
- Test changes thoroughly before submitting
- Update documentation when adding features or changing behavior
- Be respectful and constructive in all communications

## Questions?

If you have questions about contributing, feel free to:
- Ask in the Discord #omega channel
- Comment on relevant issues
- Reach out to maintainers

Thank you for helping make Omega better!
