# Autonomous Tool Creation System

This document describes Omega's autonomous tool creation capability, which allows the AI to design and build new tools on its own initiative.

## Overview

Omega can now autonomously create simple utility tools when it identifies capability gaps or recognizes patterns of user requests that could benefit from dedicated tools. This enables:

- **Self-improvement**: Omega can expand its own capabilities
- **Rapid prototyping**: Quick creation of utility tools for specific needs
- **Innovation**: Discovery of useful new capabilities without explicit user requests
- **Adaptability**: Response to emerging use cases in real-time

## Safety Boundaries

To ensure safety and maintainability, autonomous tool creation has strict limitations:

### Allowed Tool Types
- Simple utility tools (data transformation, calculations, text processing)
- Content generators (format converters, text manipulators)
- Research helpers (data aggregators, formatters)
- Specialized calculators (domain-specific math)

### Prohibited Tool Types
- Database operations (MongoDB, PostgreSQL)
- File system access (reading, writing, deleting files)
- GitHub API operations
- External API calls (without explicit validation)
- Process or system operations
- Network operations

### Code Restrictions
Tools CANNOT use:
- `require()` or `import` statements
- `eval()` or `Function()` constructor (except for controlled execution)
- File system modules (`fs`, `path`, etc.)
- Process modules (`process`, `child_process`, etc.)
- Network modules (`http`, `https`, `net`, etc.)
- Directory traversal patterns (`../../`)
- Dangerous shell commands

### Parameter Limits
- Maximum 5 parameters per tool
- All parameters must have clear descriptions
- Type-safe via auto-generated Zod schemas

## Architecture

### Database Schema

Autonomous tools are stored in the `autonomous_tools` table:

```sql
CREATE TABLE autonomous_tools (
  id TEXT PRIMARY KEY,                    -- Tool ID (alphanumeric + underscores)
  name TEXT NOT NULL,                     -- Human-readable name
  description TEXT NOT NULL,              -- What the tool does
  category TEXT NOT NULL,                 -- Tool category
  parameters JSONB NOT NULL,              -- Parameter definitions
  implementation TEXT NOT NULL,           -- JavaScript code
  keywords TEXT[] NOT NULL,               -- BM25 search keywords
  examples TEXT[] NOT NULL,               -- Example queries
  tags TEXT[] NOT NULL,                   -- Category tags
  created_at TIMESTAMPTZ NOT NULL,        -- Creation timestamp
  created_by TEXT,                        -- Creator (e.g., 'omega-autonomous')
  is_enabled BOOLEAN NOT NULL,            -- Active/inactive status
  usage_count INTEGER NOT NULL,           -- Number of times used
  last_used_at TIMESTAMPTZ,              -- Last usage timestamp
  safety_validated BOOLEAN NOT NULL,      -- Safety review status
  validation_notes TEXT                   -- Validation comments
);
```

### Components

1. **createToolAutonomously** (`packages/agent/src/tools/createToolAutonomously.ts`)
   - Main tool for autonomous creation
   - Validates tool definitions
   - Checks for dangerous code patterns
   - Stores tools in database

2. **autonomousToolLoader** (`packages/agent/src/autonomousToolLoader.ts`)
   - Loads tools from database at runtime
   - Generates Zod schemas from parameter definitions
   - Creates sandboxed execution environments
   - Tracks usage statistics

3. **listAutonomousTools** (`packages/agent/src/tools/listAutonomousTools.ts`)
   - Lists all autonomous tools
   - Shows status, usage stats, and metadata
   - Filters by enabled status or category

4. **manageAutonomousTool** (`packages/agent/src/tools/manageAutonomousTool.ts`)
   - Enable/disable tools
   - Validate tools for safety
   - Delete tools
   - View full tool details

### Integration with BM25 Search

Autonomous tools are automatically integrated into Omega's BM25 tool selection system:

1. Tool metadata is fetched from database on startup
2. Metadata is indexed alongside core tools
3. Tools are selected based on relevance to user queries
4. Tools are loaded dynamically when selected

## Usage

### Creating a Tool

Omega will autonomously create tools when it identifies a need. Users can also request tool creation:

```
User: "I need a tool that converts JSON to YAML format"
Omega: [Uses createToolAutonomously to build the tool]
```

### Listing Tools

```
User: "List all autonomous tools"
Omega: [Uses listAutonomousTools to show created tools]
```

### Managing Tools

```
User: "Enable the jsonToYaml tool"
Omega: [Uses manageAutonomousTool to enable it]

User: "Validate the phoneFormatter tool"
Omega: [Uses manageAutonomousTool with safety validation]
```

## Tool Lifecycle

1. **Creation**: Tool is created via `createToolAutonomously`
   - Stored in database
   - Status: `is_enabled = false`, `safety_validated = false`
   - Rationale is recorded in `validation_notes`

2. **Review**: Admin or automated system reviews the tool
   - Checks implementation for safety
   - Verifies usefulness
   - Tests functionality

3. **Validation**: If approved, tool is validated
   - Status: `is_enabled = true`, `safety_validated = true`
   - Tool becomes available for general use
   - Indexed in BM25 search

4. **Usage**: Tool is used by Omega
   - Selected via BM25 search when relevant
   - Loaded dynamically at runtime
   - Usage statistics tracked

5. **Monitoring**: Ongoing monitoring
   - Usage count tracked
   - Last used timestamp recorded
   - Can be disabled if issues arise

6. **Retirement**: Tool can be disabled or deleted
   - Disable: `is_enabled = false` (soft delete)
   - Delete: Removed from database (hard delete)

## Example Tool Definition

Here's what an autonomous tool looks like:

```typescript
{
  toolId: 'jsonToYaml',
  toolName: 'JSON to YAML Converter',
  description: 'Convert JSON data to YAML format with proper indentation',
  category: 'development',
  parameters: [
    {
      name: 'json',
      type: 'string',
      description: 'JSON string to convert',
      required: true
    },
    {
      name: 'indent',
      type: 'number',
      description: 'Number of spaces for indentation',
      required: false,
      default: 2
    }
  ],
  implementation: `
    // Parse JSON
    const obj = JSON.parse(json);

    // Convert to YAML (simplified implementation)
    function toYaml(obj, indent = 0) {
      const spaces = ' '.repeat(indent);
      let yaml = '';

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          yaml += spaces + key + ':\\n';
          yaml += toYaml(value, indent + 2);
        } else {
          yaml += spaces + key + ': ' + value + '\\n';
        }
      }

      return yaml;
    }

    const result = toYaml(obj, indent);

    return {
      success: true,
      yaml: result,
      originalJson: json
    };
  `,
  keywords: ['json', 'yaml', 'convert', 'format', 'transform'],
  examples: [
    'convert JSON to YAML',
    'json to yaml',
    'transform json format'
  ],
  tags: ['development', 'conversion', 'formatting'],
  rationale: 'Users frequently need to convert between JSON and YAML formats for configuration files'
}
```

## Monitoring and Control

### Database Queries

View all autonomous tools:
```sql
SELECT id, name, is_enabled, usage_count, created_at
FROM autonomous_tools
ORDER BY created_at DESC;
```

View most used tools:
```sql
SELECT id, name, usage_count, last_used_at
FROM autonomous_tools
WHERE is_enabled = true
ORDER BY usage_count DESC
LIMIT 10;
```

View tools needing validation:
```sql
SELECT id, name, created_at, validation_notes
FROM autonomous_tools
WHERE safety_validated = false
ORDER BY created_at DESC;
```

### Manual Management

Enable a tool:
```sql
UPDATE autonomous_tools
SET is_enabled = true, safety_validated = true,
    validation_notes = 'Reviewed and approved by [reviewer]'
WHERE id = 'toolId';
```

Disable a tool:
```sql
UPDATE autonomous_tools
SET is_enabled = false
WHERE id = 'toolId';
```

Delete a tool:
```sql
DELETE FROM autonomous_tools
WHERE id = 'toolId';
```

## Future Enhancements

Potential improvements to the autonomous tool system:

1. **Automated Testing**: Generate test cases for new tools automatically
2. **Code Review AI**: Use AI to review tool implementations for safety
3. **Performance Monitoring**: Track execution time and resource usage
4. **Version Control**: Support tool updates with version history
5. **Collaborative Creation**: Allow users to suggest improvements to tools
6. **Tool Categories**: More granular categorization and discovery
7. **Marketplace**: Share successful autonomous tools across Omega instances
8. **Learning**: Identify which tools are most useful and create similar ones

## Security Considerations

- **Sandboxed Execution**: Tools run in isolated context with limited scope
- **No External Access**: Cannot make network requests or access file system
- **Code Validation**: Dangerous patterns are blocked at creation time
- **Default Disabled**: All new tools require explicit approval
- **Usage Tracking**: All tool invocations are logged
- **Review Process**: Tools should be reviewed before general deployment
- **Rate Limiting**: Consider adding rate limits to prevent abuse
- **Audit Trail**: Full history of creation, validation, and usage

## Best Practices

1. **Clear Descriptions**: Tool descriptions should clearly explain what the tool does
2. **Focused Purpose**: Each tool should do one thing well
3. **Error Handling**: Implementations should handle edge cases gracefully
4. **Return Format**: Always return `{success: boolean, data?: any, error?: string}`
5. **Documentation**: Use descriptive parameter names and descriptions
6. **Keywords**: Choose keywords that match how users would request the capability
7. **Testing**: Test tools manually before enabling for general use
8. **Monitoring**: Regularly review usage statistics and disable unused tools
9. **Security**: Review implementations for potential security issues
10. **Maintenance**: Periodically review and update autonomous tools

## Troubleshooting

### Tool Not Appearing in Selection

1. Check if tool is enabled: `SELECT is_enabled FROM autonomous_tools WHERE id = 'toolId'`
2. Verify keywords match user queries
3. Rebuild search index: Call `rebuildSearchIndex()` in code
4. Check BM25 search logs for tool selection

### Tool Execution Fails

1. Check implementation for syntax errors
2. Verify parameter types match Zod schema
3. Review error messages in usage logs
4. Test implementation in isolation
5. Check for missing return statement

### Tool Not Being Used

1. Review usage statistics: `SELECT usage_count FROM autonomous_tools WHERE id = 'toolId'`
2. Improve keywords and examples for better discovery
3. Check if similar core tools are being selected instead
4. Verify tool provides unique value

## Configuration

Environment variables (if needed):
- None currently required - uses existing database configuration

Feature flags (if added):
- `ENABLE_AUTONOMOUS_TOOLS`: Enable/disable autonomous tool creation system
- `AUTO_VALIDATE_TOOLS`: Automatically validate tools (unsafe, not recommended)

## Migration

To set up the autonomous tools table on an existing database:

```bash
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-autonomous-tools-table.sh'
```

Or manually:
```sql
-- Run the SQL from packages/database/scripts/create-autonomous-tools-table.sh
```

## Support

For questions or issues with autonomous tool creation:
1. Check this documentation
2. Review tool implementation in `packages/agent/src/tools/createToolAutonomously.ts`
3. Check database logs and usage statistics
4. Create an issue in the GitHub repository
