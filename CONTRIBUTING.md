# Contributing to Omega

Thank you for your interest in contributing to Omega! This document provides guidelines and information to help you contribute effectively.

## Priority Levels

We use a four-tier priority system (P0–P3) to categorize issues and ensure consistent triage. When creating or reviewing issues, assign the appropriate priority label based on the criteria below.

### P0 - Critical

**Definition:** System-wide outages, data loss, or security vulnerabilities that affect all users in production.

**Examples:**
- Production application is completely down
- Database corruption or data loss
- Active security vulnerability being exploited
- Payment processing failures affecting all transactions

**Expected SLA:**
- **Response Time:** Immediate (within 1 hour)
- **Resolution Time:** Same day (within 24 hours)
- **Escalation:** Immediate notification to maintainers

### P1 - High Priority

**Definition:** Major functionality is broken for a significant subset of users, or critical features are unavailable.

**Examples:**
- Core feature completely broken (e.g., users cannot log in)
- Significant performance degradation affecting user experience
- API endpoints returning errors for multiple users
- Data inconsistency affecting business operations

**Expected SLA:**
- **Response Time:** Within 4 hours during business hours
- **Resolution Time:** Within 2-3 days
- **Escalation:** Daily updates required

### P2 - Medium Priority

**Definition:** Important features are partially broken or degraded, affecting some users but with workarounds available.

**Examples:**
- Non-critical feature malfunction with workaround
- Minor performance issues
- UI/UX bugs that don't prevent core functionality
- Missing error messages or poor error handling

**Expected SLA:**
- **Response Time:** Within 1-2 business days
- **Resolution Time:** Within 1-2 weeks
- **Escalation:** Updates on weekly planning calls

### P3 - Low Priority

**Definition:** Minor issues, cosmetic problems, or feature requests that don't significantly impact users.

**Examples:**
- Minor UI inconsistencies or typos
- Documentation improvements
- Nice-to-have features
- Refactoring or technical debt cleanup
- Non-critical test failures

**Expected SLA:**
- **Response Time:** Best effort
- **Resolution Time:** As capacity allows
- **Escalation:** Addressed in regular backlog grooming

## Triage Guidelines

When triaging issues:

1. **Assess Impact:** How many users are affected?
2. **Assess Severity:** What's the scope of the functionality loss?
3. **Check for Workarounds:** Are there temporary solutions available?
4. **Consider Context:** Is this blocking other work or releases?
5. **Apply Label:** Add the appropriate `P0`, `P1`, `P2`, or `P3` label

**Note:** SLA times are guidelines for typical issues. Actual resolution times may vary based on complexity and available resources. For P0 issues during off-hours, contact maintainers directly.
