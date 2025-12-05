# Tech Translation Tool

Converts casual/high-level user requests into comprehensive, implementation-ready technical specifications.

## Quick Start

```typescript
import { techTranslateTool } from './techTranslate.js';

// Basic usage
const result = await techTranslateTool.execute({
  request: "Build a user authentication system",
  userId: "123",
  username: "johndoe"
});

console.log(result.markdown); // Human-readable spec
console.log(result.json);     // Machine-readable spec
```

## Features

- ✅ Charitable interpretation of user intent
- ✅ Best practices across all technical domains
- ✅ Comprehensive coverage (architecture, database, APIs, DevOps, security)
- ✅ Multiple output formats (Markdown, JSON, or both)
- ✅ Auto-save to database with provenance tracking
- ✅ Optional GitHub issue creation
- ✅ Three depth levels (basic, thorough, comprehensive)
- ✅ Custom stack configuration
- ✅ Constraint handling (GDPR, HIPAA, budget, etc.)

## Specification Coverage

Every spec includes:

1. **Requirements**: Functional and non-functional
2. **Architecture**: Components, responsibilities, tradeoffs
3. **Data Model**: Tables, columns, indexes, relations
4. **APIs**: REST/GraphQL/events with examples
5. **DevOps**: CI/CD, infrastructure, observability
6. **Security**: Threat modeling and mitigations
7. **Privacy**: Data collection, retention, compliance
8. **Rollout**: Feature flags, phased deployment
9. **Testing**: Unit, integration, e2e strategies
10. **Metrics**: Success indicators
11. **Work Breakdown**: Tasks with estimates and dependencies
12. **Risks**: Identified risks and mitigation strategies

## Examples

### Example 1: Simple Request

```typescript
const result = await techTranslateTool.execute({
  request: "Add a like button to posts"
});

// Generates spec including:
// - Database schema (post_likes table)
// - API endpoints (POST /posts/:id/like)
// - Security (rate limiting, auth)
// - Testing strategy
```

### Example 2: Complex Feature

```typescript
const result = await techTranslateTool.execute({
  request: "Build real-time collaboration for documents",
  depth: "comprehensive",
  targetStack: {
    runtime: "Node.js/TypeScript",
    db: "PostgreSQL",
    deploy: "Railway.app"
  },
  constraints: [
    "GDPR compliant",
    "Support 1000+ concurrent users"
  ],
  autoCreateIssue: true,
  userId: "123",
  username: "johndoe"
});

// Generates exhaustive spec comparing WebSockets vs SSE,
// scaling strategies, database schema, testing plan, etc.
// Also creates GitHub issue automatically.
```

### Example 3: With Auto-Issue Creation

```typescript
const result = await techTranslateTool.execute({
  request: "Implement user authentication",
  autoCreateIssue: true,
  userId: "123",
  username: "johndoe"
});

console.log(result.issueUrl); // GitHub issue URL
```

## Best Practices Embedded

### Database
- TIMESTAMPTZ for timestamps
- SERIAL for IDs
- JSONB for metadata
- Foreign keys with cascades
- Indexes on queries
- GIN for JSONB/FTS

### Security
- Input validation
- Authentication/authorization
- HTTPS enforcement
- Rate limiting
- SQL injection prevention
- XSS/CSRF protection
- Secret management

### DevOps
- Health checks
- Structured logging
- Distributed tracing
- Metrics/dashboards
- CI/CD pipelines
- Feature flags
- Backup/recovery

### Testing
- Test pyramid (unit → integration → e2e)
- >80% coverage for critical paths
- Mocking strategies
- Golden file tests for AI outputs

## Configuration

### Depth Levels

- **basic**: Essential details only (architecture + requirements)
- **thorough** (default): Comprehensive coverage of all domains
- **comprehensive**: Exhaustive with work breakdown, estimates, risks

### Output Formats

- **markdown**: Human-readable spec ready for GitHub issues
- **json**: Machine-readable for automation
- **both** (default): Both formats

### Target Stack

Default stack:
- Runtime: Node.js/TypeScript
- Database: PostgreSQL
- Deploy: Railway.app

Override with `targetStack` parameter.

## Database Schema

### tech_translations

Stores all translations with provenance:

```sql
CREATE TABLE tech_translations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  source_text TEXT NOT NULL,
  output_markdown TEXT,
  output_json JSONB,
  assumptions JSONB,
  risks JSONB,
  model VARCHAR(100),
  prompt_version VARCHAR(50),
  helpfulness_score SMALLINT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### tech_translation_feedback

Optional user feedback:

```sql
CREATE TABLE tech_translation_feedback (
  id SERIAL PRIMARY KEY,
  translation_id INTEGER REFERENCES tech_translations(id),
  user_id VARCHAR(255),
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Querying Past Translations

Use PostgreSQL tools to search past translations:

```typescript
// Find by user
await pgSelect({
  table: 'tech_translations',
  where: { user_id: 'user123' }
});

// Full-text search
await pgQuery({
  query: `
    SELECT * FROM tech_translations
    WHERE to_tsvector('simple', source_text) @@ to_tsquery('simple', $1)
  `,
  params: ['authentication']
});
```

## Prompt Engineering

The tool uses a comprehensive prompt that:
1. Assumes good faith and charitable interpretation
2. Applies best practices from senior engineers
3. Considers security, privacy, testing, operations
4. Provides practical, actionable specifications
5. Documents assumptions and risks
6. Breaks down work into tasks with estimates

Prompt version is tracked for improvements over time.

## Error Handling

The tool handles errors gracefully:
- AI generation failures return error message
- Database save failures don't fail the operation
- GitHub issue creation is optional and logged

All errors are logged with context for debugging.

## Testing

Test the tool with golden examples:

```typescript
// Test basic translation
const result = await techTranslateTool.execute({
  request: "Add a search feature",
  depth: "basic"
});

expect(result.success).toBe(true);
expect(result.json).toBeDefined();
expect(result.json.dataModel).toHaveLength(1);
```

## Performance

- **Model**: GPT-4o (high quality, ~2-5s response time)
- **Cost**: ~$0.01-0.05 per translation depending on depth
- **Caching**: None currently (future enhancement)

## Future Improvements

1. Auto-scaffolding from JSON spec
2. Template library for common patterns
3. Comparison mode (multiple approaches)
4. Interactive refinement
5. Diagram generation
6. Code snippet generation
7. Cost estimation
8. Integration with PM tools

## Related Documentation

- [Full Documentation](../../../../docs/tech-translation.md)
- [Tool Loader](../toolLoader.ts)
- [GitHub Create Issue Tool](./github/createIssue.ts)
