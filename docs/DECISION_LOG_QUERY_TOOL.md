# Decision Log Query Tool

## Overview

The `queryDecisionLogs` tool enables querying and analyzing Omega's decision-making history through natural language. It provides insights into bot behavior, performance patterns, and autonomous growth by accessing an append-only audit trail of all decisions.

**Added in PR #889**: This PR made the tool discoverable via BM25 keyword search, enabling natural language queries like "show my recent decisions" or "analyze my confidence trends."

## Purpose

The decision log query tool serves multiple purposes:

1. **Autonomous Learning**: Track decision patterns to improve future decisions
2. **Performance Analysis**: Measure confidence levels and sentiment over time
3. **Tool Effectiveness**: Identify which tools are most useful
4. **User Behavior**: Understand interaction patterns
5. **Debugging**: Audit trail for troubleshooting bot behavior
6. **Self-Improvement**: Learn from successful and failed decisions

## How It Works

### Tool Discovery (BM25 Search)

The tool is automatically selected when users mention decision-related keywords:

**Keywords** (weighted 3.0x):
- decision, logs, query, analyze, learn, autonomous, growth, patterns, audit, history, tracking, sentiment, confidence, tools

**Example Queries**:
- "show recent decisions"
- "analyze my decision patterns"
- "search decision logs for sentiment"
- "how many decisions have I made"
- "what are my confidence trends"
- "show me tool execution decisions"

### Query Interface

The tool uses a union-based query type system with 5 query modes:

```typescript
{
  queryType: 'recent' | 'byUser' | 'search' | 'count' | 'filtered',
  limit?: number,        // Max records (default: 100, max: 500)
  userId?: string,       // Filter by user ID
  searchTerm?: string,   // Text search
  startTime?: string,    // ISO 8601 timestamp
  endTime?: string,      // ISO 8601 timestamp
  offset?: number        // Pagination offset
}
```

## Query Types

### 1. Recent Decisions (`recent`)

Retrieves the most recent decision logs across all users.

**Parameters**:
- `queryType`: `'recent'`
- `limit` (optional): Number of records (default: 100)

**Example**:
```
User: "Show me the last 50 decisions"
→ queryType: 'recent', limit: 50
```

**Use Cases**:
- Quick overview of recent bot activity
- Monitor current decision-making patterns
- Debug recent behavior issues

---

### 2. User Decisions (`byUser`)

Filters decisions by a specific user ID.

**Parameters**:
- `queryType`: `'byUser'`
- `userId` (required): Discord user ID
- `limit` (optional): Number of records (default: 100)

**Example**:
```
User: "Show my decision history"
→ queryType: 'byUser', userId: '12345', limit: 100
```

**Response Includes**:
- Decision records for that user
- Total count of user decisions

**Use Cases**:
- Analyze individual user interactions
- Track decision patterns per user
- Generate user-specific insights

---

### 3. Text Search (`search`)

Full-text search across decision descriptions and blame modules.

**Parameters**:
- `queryType`: `'search'`
- `searchTerm` (required): Text to search for
- `limit` (optional): Number of records (default: 100)

**Search Behavior**:
- Case-insensitive (uses PostgreSQL ILIKE)
- Pattern matching: `%{searchTerm}%`
- Searches fields: `decision_description`, `blame`
- Does NOT search metadata JSON

**Example**:
```
User: "Find decisions about sentiment analysis"
→ queryType: 'search', searchTerm: 'sentiment', limit: 50
```

**Use Cases**:
- Find specific types of decisions
- Search for tool names
- Locate decisions by module
- Debug specific decision patterns

---

### 4. Decision Count (`count`)

Returns the total number of decision logs.

**Parameters**:
- `queryType`: `'count'`
- `userId` (optional): Filter by user ID

**Example**:
```
User: "How many decisions have been made?"
→ queryType: 'count'

User: "How many decisions have I made?"
→ queryType: 'count', userId: '12345'
```

**Response**:
- No decision records returned
- Only `totalCount` field populated

**Use Cases**:
- Quick stats without loading data
- Monitor growth over time
- Compare user activity levels

---

### 5. Filtered Query (`filtered`)

Advanced filtering with date ranges and pagination.

**Parameters**:
- `queryType`: `'filtered'`
- `userId` (optional): Filter by user
- `startTime` (optional): ISO 8601 start timestamp
- `endTime` (optional): ISO 8601 end timestamp
- `limit` (optional): Records to return (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example**:
```
User: "Show decisions from last week"
→ queryType: 'filtered',
  startTime: '2025-12-06T00:00:00Z',
  endTime: '2025-12-13T23:59:59Z',
  limit: 100
```

**Use Cases**:
- Time-range analysis
- Paginated data retrieval
- Complex multi-filter queries
- Historical trend analysis

## Response Format

Every query returns a structured response with analysis:

```typescript
{
  success: boolean,
  queryType: string,
  totalCount: number,           // Total matching records
  recordsReturned: number,       // Records in this response
  results: DecisionLogRecord[],  // Max 20 shown in response
  analysis: {
    summary: string,
    timeRange: {
      earliest: Date,
      latest: Date
    },
    decisionTypeCounts: {
      finalAnswers: number,
      toolExecutions: number,
      responseDecisions: number,
      total: number
    },
    topDecisionTypes: [
      { type: string, count: number }
    ],
    topBlameModules: [
      { module: string, count: number }
    ],
    sentimentDistribution: {
      positive: number,
      negative: number,
      neutral: number
    },
    averageConfidence: string,   // Percentage
    topToolsUsed: [
      { tool: string, count: number }
    ],
    insights: string[]            // AI-generated insights
  },
  message: string,
  hint?: string                   // Pagination hint if needed
}
```

### Decision Log Record Structure

Each record contains:

```typescript
{
  id: number,
  timestamp: Date,
  user_id: string,
  username: string,
  decision_description: string,
  blame: string,                   // Module that made the decision
  metadata: {
    decisionType: string,          // finalAnswer, toolExecution, shouldRespond, intentGate
    confidence?: number,           // 0-1 scale
    sentiment?: string,            // positive, negative, neutral
    toolNames?: string[],          // Tools used in this decision
    // ... other decision-specific fields
  }
}
```

## Automated Analysis

The tool automatically generates insights from the queried data:

### 1. Confidence Analysis
- **High Confidence** (≥0.85): "Strong decision-making capability"
- **Low Confidence** (<0.7): "Potential for improvement in decision confidence"

### 2. Final Answer Ratio
- **High Ratio** (>30%): "Effective problem-solving conversations"

### 3. Tool Usage Patterns
- Identifies most frequently used tool
- Example: "getUserAnalysis was the most used tool (15 executions)"

### 4. Sentiment Analysis
- **High Positive** (>60%): "Helpful and positive responses"

### 5. Complexity Indicators
- High tool usage relative to answers suggests complex problem-solving approach

## Pagination

When query results exceed 20 records, use pagination:

**Initial Query**:
```
queryType: 'recent', limit: 100
→ Returns first 20 records
→ hint: "Showing first 20 of 100 results. Use offset parameter to see more."
```

**Next Page**:
```
queryType: 'recent', limit: 100, offset: 20
→ Returns records 21-40
```

**Continue**:
```
queryType: 'recent', limit: 100, offset: 40
→ Returns records 41-60
```

## Limitations

### Response Limits
- Maximum 20 records displayed per response (prevents token overflow)
- Total query limit capped at 500 records
- Must use pagination (`offset`) to access beyond first 20

### Search Constraints
- Search uses simple substring matching (ILIKE), not full BM25
- Searches only `decision_description` and `blame` fields
- Does NOT search inside metadata JSON
- Case-insensitive but requires exact substring match

### Performance Considerations
- Indexed fields: `timestamp` (DESC), `user_id`, `metadata` (GIN)
- Date range queries on indexed fields are fast
- ILIKE searches can be slower on very large datasets
- Metadata GIN index speeds up JSONB queries (if added in future)

### Data Constraints
- Append-only log (no updates or deletes through tool)
- Timestamps in PostgreSQL `TIMESTAMPTZ` format
- User IDs are Discord snowflake strings
- Metadata is JSONB (schema varies by decision type)

## Usage Examples

### Example 1: Recent Activity Overview
```
User: "What have you been working on recently?"
Tool Call: { queryType: 'recent', limit: 50 }

Response:
- 50 recent decisions
- Analysis shows 60% finalAnswers, 40% toolExecutions
- Top tools: getUserAnalysis (12x), searchDecisionLogs (8x)
- Average confidence: 87%
- Insight: "Strong decision-making capability"
```

### Example 2: User Pattern Analysis
```
User: "Analyze my decision patterns"
Tool Call: { queryType: 'byUser', userId: '12345', limit: 200 }

Response:
- 200 decisions for user 12345
- Time range: 2025-11-01 to 2025-12-13
- Top decision types: finalAnswer (120), toolExecution (80)
- Sentiment: 70% positive, 20% neutral, 10% negative
- Insight: "Helpful and positive responses"
```

### Example 3: Sentiment Search
```
User: "Show me decisions with negative sentiment"
Tool Call: { queryType: 'search', searchTerm: 'negative', limit: 100 }

Response:
- 45 decisions mentioning "negative"
- May include sentiment analysis results
- Shows which responses had negative sentiment
- Helps identify areas for improvement
```

### Example 4: Weekly Trends
```
User: "Show decisions from last week"
Tool Call: {
  queryType: 'filtered',
  startTime: '2025-12-06T00:00:00Z',
  endTime: '2025-12-13T23:59:59Z',
  limit: 500
}

Response:
- All decisions from past week (up to 500)
- Time range analysis
- Week-over-week patterns
- Tool usage trends
```

### Example 5: Tool Effectiveness
```
User: "Which tools are most effective?"
Tool Call: { queryType: 'recent', limit: 500 }

Response:
- Analysis of tool execution frequency
- topToolsUsed: ranked by usage count
- Correlation with decision confidence
- Insights on which tools contribute to successful outcomes
```

## Database Schema

The tool queries the `decision_logs` table:

```sql
CREATE TABLE decision_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id VARCHAR(255),
  username VARCHAR(255),
  decision_description TEXT NOT NULL,
  blame TEXT,
  metadata JSONB
);

CREATE INDEX idx_decision_logs_timestamp ON decision_logs(timestamp DESC);
CREATE INDEX idx_decision_logs_user_id ON decision_logs(user_id);
CREATE INDEX idx_decision_logs_metadata_gin ON decision_logs USING GIN (metadata);
```

## Implementation Details

### File Locations

| Component | File Path |
|-----------|-----------|
| Tool Implementation | `packages/agent/src/tools/queryDecisionLogs.ts` |
| Database Service | `packages/database/src/postgres/decisionLogService.ts` |
| Tool Metadata | `packages/agent/src/toolRegistry/metadata.ts` (lines 1665-1681) |
| BM25 Search Index | `packages/agent/src/toolRegistry/searchIndex.ts` |
| Migration Script | `packages/database/scripts/create-decision-logs-table.sh` |

### Database Service Functions

5 core functions power the query types:

1. **`queryDecisionLogs(options)`**: Dynamic SQL builder for filtered queries
2. **`getUserDecisionLogs(userId, limit)`**: User-specific decisions
3. **`getRecentDecisionLogs(limit)`**: Recent decisions across all users
4. **`countDecisionLogs(userId?)`**: Count total decisions
5. **`searchDecisionLogs(searchTerm, limit)`**: Full-text search

## Related Documentation

- **Decision Logging System**: `/packages/database/DECISION_LOGGING.md`
  - Covers database schema, decision types, and logging functions
  - Migration instructions
  - Best practices for logging decisions

- **Autonomous Tools**: `/docs/AUTONOMOUS_TOOLS.md`
  - Autonomous tool creation system
  - Tool discovery via BM25 search

## Troubleshooting

### Tool Not Being Selected

**Problem**: User asks about decisions but tool isn't used

**Solutions**:
1. Check BM25 keyword match: use terms like "decision", "analyze", "patterns"
2. Be specific: "show my decision logs" vs. "what did I say"
3. Verify tool is enabled in tool registry

### Search Returns No Results

**Problem**: Search query returns 0 results

**Solutions**:
1. Check search term spelling
2. Remember search is substring-based: "sentiment" matches "sentiment analysis"
3. Try broader terms: search "tool" instead of "toolExecution"
4. Search only works on `decision_description` and `blame`, not metadata

### Pagination Confusion

**Problem**: Only seeing 20 results when expecting more

**Solutions**:
1. Check `recordsReturned` vs. `totalCount` in response
2. Use `offset` parameter to access additional records
3. Remember: max 20 records displayed per response (hard limit)

### Slow Queries

**Problem**: Queries take a long time

**Solutions**:
1. Add indexes if missing (should exist by default)
2. Reduce `limit` parameter
3. Use more specific filters (userId, date ranges)
4. ILIKE searches are slower on large datasets

## Future Enhancements

Potential improvements to the decision log query tool:

1. **Full BM25 Database Search**: Replace ILIKE with BM25 for better relevance
2. **Metadata Search**: Enable searching inside JSONB metadata
3. **Aggregation Queries**: Pre-computed analytics for faster insights
4. **Visualization**: Charts and graphs of decision patterns
5. **Export Functionality**: Download decision logs as CSV/JSON
6. **Real-time Streaming**: Live decision log feed
7. **Comparison Queries**: Compare decision patterns across time periods
8. **Anomaly Detection**: Automatically identify unusual decision patterns

## Best Practices

1. **Use Specific Query Types**: Choose the most appropriate query type for your needs
2. **Leverage Filters**: Use userId and date ranges to narrow results
3. **Pagination**: Always check `totalCount` vs. `recordsReturned`
4. **Analyze Insights**: Read the auto-generated insights in responses
5. **Monitor Confidence**: Track average confidence trends over time
6. **Tool Effectiveness**: Regularly review topToolsUsed to identify patterns
7. **Sentiment Tracking**: Monitor sentiment distribution for user satisfaction
8. **Time-Range Analysis**: Use filtered queries for historical trend analysis

## Support

For questions or issues:
1. Check this documentation
2. Review `/packages/database/DECISION_LOGGING.md` for schema details
3. Check implementation: `packages/agent/src/tools/queryDecisionLogs.ts`
4. Create an issue in the GitHub repository
