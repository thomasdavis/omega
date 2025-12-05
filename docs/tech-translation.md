# Tech Translation Tool

The Tech Translation tool converts casual or high-level user requests into comprehensive, implementation-ready technical specifications.

## Overview

This tool applies charitable interpretation and proposes refined solutions with best practices across:
- Software engineering (clean code, SOLID principles)
- Database design (PostgreSQL best practices, indexing)
- DevOps (CI/CD, observability, deployment)
- Security (threat modeling, mitigations)
- Testing (unit, integration, e2e)

## Usage

The tool is available as `techTranslate` and can be invoked by the AI agent when users need help translating vague requirements into actionable technical specs.

### Basic Usage

```typescript
// Simple translation with defaults
techTranslate({
  request: "I need a simple status page that shows Omega's health"
})
```

### Advanced Usage

```typescript
// Comprehensive translation with custom stack and constraints
techTranslate({
  request: "Build a real-time collaboration feature for document editing",
  depth: "comprehensive",
  output: "both",
  targetStack: {
    runtime: "Node.js/TypeScript",
    db: "PostgreSQL",
    deploy: "Railway.app"
  },
  constraints: [
    "GDPR compliant",
    "Support 1000+ concurrent users",
    "Sub-100ms latency"
  ],
  autoCreateIssue: true,
  userId: "user123",
  username: "johndoe"
})
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `request` | string | **required** | The user's request or feature idea |
| `depth` | `'basic' \| 'thorough' \| 'comprehensive'` | `'thorough'` | Level of detail in the spec |
| `output` | `'markdown' \| 'json' \| 'both'` | `'both'` | Output format |
| `targetStack.runtime` | string | `'Node.js/TypeScript'` | Target runtime environment |
| `targetStack.db` | string | `'PostgreSQL'` | Target database |
| `targetStack.deploy` | string | `'Railway.app'` | Target deployment platform |
| `constraints` | string[] | `[]` | Constraints like HIPAA, GDPR, budget |
| `autoCreateIssue` | boolean | `false` | Auto-create GitHub issue from spec |
| `userId` | string | - | User ID for tracking |
| `username` | string | - | Username for tracking |

## Output

The tool returns a comprehensive technical specification including:

### Markdown Format
- Title and summary
- Assumptions and goals
- Functional and non-functional requirements
- Architecture with components and tradeoffs
- Data model (tables, columns, indexes, relations)
- API contracts with examples
- DevOps plan (CI/CD, infrastructure, observability)
- Security threats and mitigations
- Privacy considerations
- Rollout strategy (feature flags, phases)
- Acceptance criteria
- Testing strategy (unit, integration, e2e)
- Metrics to track
- Work breakdown with estimates
- Risks and mitigation strategies

### JSON Format
Structured data following the `TechSpecSchema` for programmatic consumption.

## Examples

### Example 1: Status Page

**Input:**
```
"I need a simple status page that shows Omega's health and an error comic when uploads fail"
```

**Output:** Comprehensive spec including:
- Database schema for status checks and incidents
- REST endpoints for health checks
- CI probe integration
- Acceptance tests
- Error handling with comic generation

### Example 2: User Authentication

**Input:**
```
"Add user authentication to the app"
```

**Output:** Detailed spec covering:
- JWT-based authentication vs session-based
- User table schema with password hashing
- Login/logout endpoints
- Middleware for protected routes
- Security best practices (HTTPS, rate limiting)
- Testing strategy

### Example 3: Real-time Features

**Input:**
```
"Implement real-time updates for the dashboard"
```

**Output:** Architecture comparing:
- WebSockets vs Server-Sent Events vs polling
- Infrastructure requirements
- Scaling considerations
- Connection management
- Fallback strategies

## Database Storage

All translations are stored in the `tech_translations` table with full provenance:
- User ID and username
- Source text (original request)
- Output markdown and JSON
- Assumptions and risks
- Model and prompt version
- Creation timestamp

Users can provide feedback through the `tech_translation_feedback` table:
- Rating (1-5)
- Comments
- Timestamp

## Best Practices Applied

### Database Design
- TIMESTAMPTZ for all timestamps
- SERIAL for auto-incrementing IDs
- JSONB for flexible metadata
- Foreign key constraints
- Indexes on frequently queried columns
- GIN indexes for JSONB and full-text search

### API Design
- RESTful conventions
- Proper HTTP status codes
- Versioned endpoints
- Request/response examples
- Error handling
- Rate limiting and pagination

### Security
- Input validation and sanitization
- Authentication and authorization
- HTTPS only
- Secure headers (CORS, CSP)
- Rate limiting
- SQL injection prevention
- XSS and CSRF protection
- Secret management

### DevOps
- Health check endpoints
- Structured logging with correlation IDs
- Distributed tracing
- Metrics and dashboards
- Alerts and runbooks
- CI/CD pipeline
- Feature flags for gradual rollout
- Backup and disaster recovery

### Testing
- Unit tests for business logic
- Integration tests for APIs and database
- End-to-end tests for critical flows
- Test coverage targets (>80%)
- Mocking strategies

## Integration with GitHub

When `autoCreateIssue: true`, the tool automatically:
1. Creates a GitHub issue with the spec as the body
2. Adds appropriate labels (`enhancement`, `tech-spec`)
3. Returns the issue URL

This enables seamless workflow from idea → spec → issue → implementation.

## Model and Versioning

- **Model:** GPT-4o (for high-quality, comprehensive specs)
- **Prompt Version:** 1.0.0 (tracked for future improvements)

All translations are versioned so we can:
- Track spec quality over time
- A/B test prompt improvements
- Provide consistent output format

## Querying Past Translations

Use the PostgreSQL tools to query past translations:

```typescript
// Find all translations by user
pgSelect({
  table: 'tech_translations',
  where: { user_id: 'user123' },
  orderBy: 'created_at DESC'
})

// Search translations by keywords
pgQuery({
  query: `
    SELECT * FROM tech_translations
    WHERE to_tsvector('simple', source_text) @@ to_tsquery('simple', $1)
    ORDER BY created_at DESC
    LIMIT 10
  `,
  params: ['authentication & security']
})

// Get highly-rated translations
pgQuery({
  query: `
    SELECT t.*, AVG(f.rating) as avg_rating
    FROM tech_translations t
    LEFT JOIN tech_translation_feedback f ON t.id = f.translation_id
    GROUP BY t.id
    HAVING AVG(f.rating) >= 4
    ORDER BY avg_rating DESC
  `
})
```

## Future Enhancements

Potential improvements:
1. Auto-scaffolding PR generation from JSON spec
2. Integration with project management tools
3. Cost estimation based on work breakdown
4. Template library for common patterns
5. Comparison mode (generate multiple approaches)
6. Interactive refinement (ask clarifying questions)
7. Diagram generation (architecture, data flow)
8. Code snippet generation for common patterns

## Related Tools

- `githubCreateIssue` - Create GitHub issues
- `generateComic` - Generate comics for error scenarios
- `pgQuery` - Query database for past translations
- `generateHtmlPage` - Create interactive spec viewers
