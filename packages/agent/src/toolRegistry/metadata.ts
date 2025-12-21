/**
 * Tool Metadata Registry
 * Manually curated metadata for all 123 tools for BM25 search optimization
 */

import { ToolMetadata } from './types.js';

/**
 * Complete tool metadata registry
 * Manually curated for optimal BM25 search accuracy
 */
export const TOOL_METADATA: ToolMetadata[] = [
  // ===== CORE TOOLS (Always Included) =====
  {
    id: 'search',
    name: 'Web Search',
    description: 'Search the web for information using DuckDuckGo',
    keywords: ['search', 'google', 'web', 'lookup', 'find', 'internet', 'duckduckgo'],
    tags: ['research', 'web', 'core', 'search'],
    examples: [
      'search for AI news',
      'find information about TypeScript',
      'look up current events',
      'what is happening with OpenAI',
      'search the web for'
    ],
    isCore: true,
    category: 'research'
  },

  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Perform mathematical calculations and expressions',
    keywords: ['calculate', 'math', 'compute', 'arithmetic', 'evaluate', 'equation'],
    tags: ['math', 'calculation', 'core', 'numbers'],
    examples: [
      'what is 2 + 2',
      'calculate 15% of 200',
      'what is 2^16',
      'solve this equation',
      'do the math'
    ],
    isCore: true,
    category: 'development'
  },

  {
    id: 'unsandbox',
    name: 'Code Execution',
    description: 'Execute code in 42+ languages including Python, JavaScript, TypeScript, Rust, Go, etc.',
    keywords: ['execute', 'run', 'code', 'python', 'javascript', 'typescript', 'compile', 'test'],
    tags: ['development', 'code', 'execution', 'core', 'programming'],
    examples: [
      'run this Python code',
      'execute JavaScript',
      'compile and run Rust',
      'test this code snippet',
      'run code'
    ],
    isCore: true,
    category: 'development'
  },

  {
    id: 'webFetch',
    name: 'Web Fetch',
    description: 'Fetch and parse web content from URLs',
    keywords: ['fetch', 'scrape', 'web', 'url', 'download', 'get', 'retrieve'],
    tags: ['web', 'scraping', 'core', 'http'],
    examples: [
      'fetch this URL',
      'get content from website',
      'scrape this page',
      'download web content'
    ],
    isCore: true,
    category: 'research'
  },

  {
    id: 'fileUpload',
    name: 'File Upload',
    description: 'Download and host Discord attachments permanently',
    keywords: ['upload', 'file', 'attachment', 'download', 'save', 'host'],
    tags: ['file', 'storage', 'core', 'upload'],
    examples: [
      'save this file',
      'upload attachment',
      'download and host this',
      'save my file permanently'
    ],
    isCore: true,
    category: 'file'
  },

  {
    id: 'whoami',
    name: 'Who Am I',
    description: 'Explain bot capabilities and features',
    keywords: ['whoami', 'help', 'capabilities', 'features', 'about', 'info'],
    tags: ['admin', 'help', 'core', 'info'],
    examples: [
      'who are you',
      'what can you do',
      'tell me about yourself',
      'help',
      'capabilities'
    ],
    isCore: true,
    category: 'admin'
  },

  {
    id: 'listTools',
    name: 'List Available Tools',
    description: 'List all available AI tools with their descriptions and capabilities',
    keywords: ['list', 'tools', 'show', 'available', 'capabilities', 'what tools', 'all tools', 'browse tools', 'tool browser'],
    tags: ['admin', 'discovery', 'help', 'tools', 'catalog'],
    examples: [
      'list all tools',
      'what tools are available',
      'show me all database tools',
      'list your capabilities',
      'what tools do you have',
      'browse tools'
    ],
    isCore: false,
    category: 'admin'
  },

  // ===== MONGODB TOOLS (14) =====
  {
    id: 'mongoInsert',
    name: 'MongoDB Insert',
    description: 'Insert documents into a MongoDB collection',
    keywords: ['mongodb', 'insert', 'add', 'create', 'document', 'database', 'nosql', 'mongo'],
    tags: ['database', 'mongodb', 'crud', 'insert'],
    examples: [
      'insert a document into MongoDB',
      'add a user to the database',
      'create a new record in MongoDB',
      'save data to MongoDB'
    ],
    category: 'database'
  },

  {
    id: 'mongoFind',
    name: 'MongoDB Find',
    description: 'Query multiple documents from a MongoDB collection with filters, sorting, and pagination',
    keywords: ['mongodb', 'find', 'query', 'search', 'filter', 'select', 'get', 'database', 'mongo'],
    tags: ['database', 'mongodb', 'crud', 'query'],
    examples: [
      'find users in MongoDB',
      'query documents where age > 18',
      'get all products sorted by price',
      'search MongoDB collection'
    ],
    category: 'database'
  },

  {
    id: 'mongoFindOne',
    name: 'MongoDB Find One',
    description: 'Query a single document from a MongoDB collection',
    keywords: ['mongodb', 'findone', 'query', 'get', 'single', 'document', 'mongo'],
    tags: ['database', 'mongodb', 'crud', 'query'],
    examples: [
      'find one user in MongoDB',
      'get a single document',
      'query one record by ID'
    ],
    category: 'database'
  },

  {
    id: 'mongoUpdate',
    name: 'MongoDB Update',
    description: 'Update documents in a MongoDB collection using MongoDB operators',
    keywords: ['mongodb', 'update', 'modify', 'edit', 'change', 'set', 'database', 'mongo'],
    tags: ['database', 'mongodb', 'crud', 'update'],
    examples: [
      'update user age in MongoDB',
      'modify document',
      'change MongoDB record',
      'update database'
    ],
    category: 'database'
  },

  {
    id: 'mongoDelete',
    name: 'MongoDB Delete',
    description: 'Delete documents from a MongoDB collection',
    keywords: ['mongodb', 'delete', 'remove', 'destroy', 'drop', 'database', 'mongo'],
    tags: ['database', 'mongodb', 'crud', 'delete'],
    examples: [
      'delete documents from MongoDB',
      'remove records',
      'delete MongoDB data',
      'remove from database'
    ],
    category: 'database'
  },

  {
    id: 'mongoCount',
    name: 'MongoDB Count',
    description: 'Count documents matching a filter in MongoDB',
    keywords: ['mongodb', 'count', 'total', 'number', 'how many', 'database', 'mongo'],
    tags: ['database', 'mongodb', 'query', 'count'],
    examples: [
      'count users in MongoDB',
      'how many documents',
      'get total count',
      'count records'
    ],
    category: 'database'
  },

  {
    id: 'mongoListCollections',
    name: 'MongoDB List Collections',
    description: 'List all collections in the MongoDB database',
    keywords: ['mongodb', 'list', 'collections', 'show', 'tables', 'database', 'mongo'],
    tags: ['database', 'mongodb', 'schema', 'management'],
    examples: [
      'list MongoDB collections',
      'show all collections',
      'what collections exist',
      'list tables'
    ],
    category: 'database'
  },

  {
    id: 'mongoCreateCollection',
    name: 'MongoDB Create Collection',
    description: 'Create a new collection in MongoDB',
    keywords: ['mongodb', 'create', 'collection', 'new', 'make', 'database', 'mongo'],
    tags: ['database', 'mongodb', 'schema', 'create'],
    examples: [
      'create a MongoDB collection',
      'make a new collection',
      'create collection',
      'new MongoDB table'
    ],
    category: 'database'
  },

  {
    id: 'mongoDropCollection',
    name: 'MongoDB Drop Collection',
    description: 'Drop (delete) an entire collection in MongoDB',
    keywords: ['mongodb', 'drop', 'delete', 'remove', 'collection', 'destroy', 'mongo'],
    tags: ['database', 'mongodb', 'schema', 'delete'],
    examples: [
      'drop MongoDB collection',
      'delete entire collection',
      'remove collection',
      'destroy collection'
    ],
    category: 'database'
  },

  {
    id: 'mongoRenameCollection',
    name: 'MongoDB Rename Collection',
    description: 'Rename a collection in MongoDB',
    keywords: ['mongodb', 'rename', 'collection', 'change name', 'database', 'mongo'],
    tags: ['database', 'mongodb', 'schema', 'rename'],
    examples: [
      'rename MongoDB collection',
      'change collection name',
      'rename table'
    ],
    category: 'database'
  },

  {
    id: 'mongoAggregate',
    name: 'MongoDB Aggregate',
    description: 'Run aggregation pipelines for complex analytics in MongoDB',
    keywords: ['mongodb', 'aggregate', 'pipeline', 'analytics', 'group', 'sum', 'mongo'],
    tags: ['database', 'mongodb', 'analytics', 'aggregation'],
    examples: [
      'run MongoDB aggregation',
      'group and sum data',
      'aggregate pipeline',
      'analytics query'
    ],
    category: 'database'
  },

  {
    id: 'mongoCreateIndex',
    name: 'MongoDB Create Index',
    description: 'Create indexes for query optimization in MongoDB',
    keywords: ['mongodb', 'index', 'create', 'optimize', 'performance', 'mongo'],
    tags: ['database', 'mongodb', 'index', 'optimization'],
    examples: [
      'create MongoDB index',
      'optimize query performance',
      'add index',
      'create unique index'
    ],
    category: 'database'
  },

  {
    id: 'mongoListIndexes',
    name: 'MongoDB List Indexes',
    description: 'List all indexes on a MongoDB collection',
    keywords: ['mongodb', 'list', 'indexes', 'show', 'view', 'mongo'],
    tags: ['database', 'mongodb', 'index', 'query'],
    examples: [
      'list MongoDB indexes',
      'show indexes',
      'what indexes exist',
      'view indexes'
    ],
    category: 'database'
  },

  {
    id: 'mongoDropIndex',
    name: 'MongoDB Drop Index',
    description: 'Drop an index from a MongoDB collection',
    keywords: ['mongodb', 'drop', 'index', 'delete', 'remove', 'mongo'],
    tags: ['database', 'mongodb', 'index', 'delete'],
    examples: [
      'drop MongoDB index',
      'delete index',
      'remove index'
    ],
    category: 'database'
  },

  // ===== POSTGRESQL TOOLS (16) =====
  {
    id: 'pgQuery',
    name: 'PostgreSQL Query',
    description: 'Execute raw SQL queries on PostgreSQL database',
    keywords: ['postgres', 'postgresql', 'sql', 'query', 'select', 'database', 'relational', 'pg'],
    tags: ['database', 'postgresql', 'sql', 'query'],
    examples: [
      'run SQL query',
      'select from PostgreSQL',
      'execute SQL',
      'query the database',
      'run postgres query'
    ],
    category: 'database'
  },

  {
    id: 'pgInsert',
    name: 'PostgreSQL Insert',
    description: 'Insert rows into a PostgreSQL table',
    keywords: ['postgres', 'postgresql', 'insert', 'add', 'create', 'row', 'sql', 'pg'],
    tags: ['database', 'postgresql', 'crud', 'insert'],
    examples: [
      'insert into PostgreSQL',
      'add row to database',
      'create record in postgres',
      'insert data'
    ],
    category: 'database'
  },

  {
    id: 'pgSelect',
    name: 'PostgreSQL Select',
    description: 'Query rows from PostgreSQL with filters, joins, and sorting',
    keywords: ['postgres', 'postgresql', 'select', 'query', 'get', 'find', 'sql', 'pg'],
    tags: ['database', 'postgresql', 'crud', 'query'],
    examples: [
      'select from postgres',
      'query PostgreSQL table',
      'get rows from database',
      'find records'
    ],
    category: 'database'
  },

  {
    id: 'pgUpdate',
    name: 'PostgreSQL Update',
    description: 'Update rows in a PostgreSQL table',
    keywords: ['postgres', 'postgresql', 'update', 'modify', 'edit', 'change', 'sql', 'pg'],
    tags: ['database', 'postgresql', 'crud', 'update'],
    examples: [
      'update PostgreSQL row',
      'modify database record',
      'change postgres data',
      'update table'
    ],
    category: 'database'
  },

  {
    id: 'pgDelete',
    name: 'PostgreSQL Delete',
    description: 'Delete rows from a PostgreSQL table',
    keywords: ['postgres', 'postgresql', 'delete', 'remove', 'destroy', 'sql', 'pg'],
    tags: ['database', 'postgresql', 'crud', 'delete'],
    examples: [
      'delete from PostgreSQL',
      'remove rows',
      'delete postgres records',
      'destroy data'
    ],
    category: 'database'
  },

  {
    id: 'pgCount',
    name: 'PostgreSQL Count',
    description: 'Count rows matching a filter in PostgreSQL',
    keywords: ['postgres', 'postgresql', 'count', 'total', 'number', 'how many', 'sql', 'pg'],
    tags: ['database', 'postgresql', 'query', 'count'],
    examples: [
      'count rows in postgres',
      'how many records',
      'get total count',
      'count PostgreSQL'
    ],
    category: 'database'
  },

  {
    id: 'pgListTables',
    name: 'PostgreSQL List Tables',
    description: 'List all tables in the PostgreSQL database',
    keywords: ['postgres', 'postgresql', 'list', 'tables', 'show', 'schema', 'pg'],
    tags: ['database', 'postgresql', 'schema', 'management'],
    examples: [
      'list PostgreSQL tables',
      'show all tables',
      'what tables exist',
      'list postgres schema'
    ],
    category: 'database'
  },

  {
    id: 'pgCreateTable',
    name: 'PostgreSQL Create Table',
    description: 'Create a new table in PostgreSQL',
    keywords: ['postgres', 'postgresql', 'create', 'table', 'new', 'schema', 'pg'],
    tags: ['database', 'postgresql', 'schema', 'create'],
    examples: [
      'create PostgreSQL table',
      'make new table',
      'create postgres schema',
      'new table'
    ],
    category: 'database'
  },

  {
    id: 'pgDropTable',
    name: 'PostgreSQL Drop Table',
    description: 'Drop (delete) an entire table in PostgreSQL',
    keywords: ['postgres', 'postgresql', 'drop', 'delete', 'table', 'remove', 'pg'],
    tags: ['database', 'postgresql', 'schema', 'delete'],
    examples: [
      'drop PostgreSQL table',
      'delete entire table',
      'remove table',
      'destroy table'
    ],
    category: 'database'
  },

  {
    id: 'pgDescribeTable',
    name: 'PostgreSQL Describe Table',
    description: 'Show table schema (columns, indexes, constraints) in PostgreSQL',
    keywords: ['postgres', 'postgresql', 'describe', 'schema', 'columns', 'structure', 'pg'],
    tags: ['database', 'postgresql', 'schema', 'query'],
    examples: [
      'describe PostgreSQL table',
      'show table structure',
      'get table schema',
      'view columns'
    ],
    category: 'database'
  },

  {
    id: 'pgDescribeSchema',
    name: 'PostgreSQL Describe Schema',
    description: 'Show the entire database schema including all tables, columns, types, indexes, and constraints',
    keywords: ['postgres', 'postgresql', 'describe', 'schema', 'database', 'all tables', 'structure', 'pg', 'show schema', 'database structure'],
    tags: ['database', 'postgresql', 'schema', 'query'],
    examples: [
      'describe database schema',
      'show all tables',
      'get database structure',
      'view entire schema',
      'what tables exist',
      'show PostgreSQL schema'
    ],
    category: 'database'
  },

  {
    id: 'pgCreateIndex',
    name: 'PostgreSQL Create Index',
    description: 'Create an index for query optimization in PostgreSQL',
    keywords: ['postgres', 'postgresql', 'index', 'create', 'optimize', 'performance', 'pg'],
    tags: ['database', 'postgresql', 'index', 'optimization'],
    examples: [
      'create PostgreSQL index',
      'optimize query',
      'add index',
      'create unique index'
    ],
    category: 'database'
  },

  {
    id: 'pgListIndexes',
    name: 'PostgreSQL List Indexes',
    description: 'List all indexes on a PostgreSQL table',
    keywords: ['postgres', 'postgresql', 'list', 'indexes', 'show', 'view', 'pg'],
    tags: ['database', 'postgresql', 'index', 'query'],
    examples: [
      'list PostgreSQL indexes',
      'show indexes',
      'what indexes exist',
      'view postgres indexes'
    ],
    category: 'database'
  },

  {
    id: 'pgDropIndex',
    name: 'PostgreSQL Drop Index',
    description: 'Drop an index from a PostgreSQL table',
    keywords: ['postgres', 'postgresql', 'drop', 'index', 'delete', 'remove', 'pg'],
    tags: ['database', 'postgresql', 'index', 'delete'],
    examples: [
      'drop PostgreSQL index',
      'delete index',
      'remove postgres index'
    ],
    category: 'database'
  },

  // ===== TODO LIST CRUD TOOLS (5) =====
  {
    id: 'createTodo',
    name: 'Create Todo',
    description: 'Create a new task in the todo list',
    keywords: ['todo', 'task', 'create', 'add', 'reminder', 'list', 'track'],
    tags: ['database', 'todo', 'task-management', 'crud'],
    examples: [
      'add task to todo list',
      'create a reminder',
      'add todo',
      'create task',
      'track something to do'
    ],
    category: 'database'
  },

  {
    id: 'listTodos',
    name: 'List Todos',
    description: 'List all tasks from the todo list with optional filtering',
    keywords: ['todo', 'task', 'list', 'show', 'view', 'get', 'display'],
    tags: ['database', 'todo', 'task-management', 'crud'],
    examples: [
      'show my todos',
      'list tasks',
      'what tasks do I have',
      'show todo list',
      'view my reminders'
    ],
    category: 'database'
  },

  {
    id: 'getTodo',
    name: 'Get Todo',
    description: 'Get a specific todo task by ID',
    keywords: ['todo', 'task', 'get', 'retrieve', 'view', 'show', 'find'],
    tags: ['database', 'todo', 'task-management', 'crud'],
    examples: [
      'get todo by id',
      'show task details',
      'retrieve todo',
      'view specific task'
    ],
    category: 'database'
  },

  {
    id: 'updateTodo',
    name: 'Update Todo',
    description: 'Update an existing todo task',
    keywords: ['todo', 'task', 'update', 'modify', 'edit', 'change', 'complete', 'mark'],
    tags: ['database', 'todo', 'task-management', 'crud'],
    examples: [
      'update todo',
      'mark task as complete',
      'edit task',
      'complete todo',
      'modify task'
    ],
    category: 'database'
  },

  {
    id: 'deleteTodo',
    name: 'Delete Todo',
    description: 'Delete a todo task',
    keywords: ['todo', 'task', 'delete', 'remove', 'destroy', 'clear'],
    tags: ['database', 'todo', 'task-management', 'crud'],
    examples: [
      'delete todo',
      'remove task',
      'delete task',
      'clear todo'
    ],
    category: 'database'
  },

  // ===== SCRIPT STORAGE CRUD TOOLS (5) =====
  {
    id: 'createScript',
    name: 'Create Script',
    description: 'Create and store a new script in the database',
    keywords: ['script', 'code', 'save', 'store', 'create', 'add', 'upload', 'persist'],
    tags: ['database', 'script', 'storage', 'crud', 'code'],
    examples: [
      'save this script',
      'store this code',
      'create a new script',
      'save Python script',
      'upload script to database'
    ],
    category: 'database'
  },

  {
    id: 'listScripts',
    name: 'List Scripts',
    description: 'List stored scripts with optional filtering by user, language, or name',
    keywords: ['script', 'code', 'list', 'show', 'view', 'get', 'display', 'browse'],
    tags: ['database', 'script', 'storage', 'crud', 'code'],
    examples: [
      'show my scripts',
      'list all scripts',
      'what scripts do I have',
      'show Python scripts',
      'list stored code'
    ],
    category: 'database'
  },

  {
    id: 'getScript',
    name: 'Get Script',
    description: 'Retrieve a specific script by ID or name',
    keywords: ['script', 'code', 'get', 'retrieve', 'view', 'show', 'load', 'find'],
    tags: ['database', 'script', 'storage', 'crud', 'code'],
    examples: [
      'get script by id',
      'show script called backup_tool',
      'retrieve my Python script',
      'load script',
      'view script content'
    ],
    category: 'database'
  },

  {
    id: 'updateScript',
    name: 'Update Script',
    description: 'Update an existing script in storage',
    keywords: ['script', 'code', 'update', 'modify', 'edit', 'change', 'save'],
    tags: ['database', 'script', 'storage', 'crud', 'code'],
    examples: [
      'update script',
      'modify my script',
      'edit script content',
      'change script description',
      'update stored code'
    ],
    category: 'database'
  },

  {
    id: 'deleteScript',
    name: 'Delete Script',
    description: 'Delete a script from storage',
    keywords: ['script', 'code', 'delete', 'remove', 'destroy', 'clear'],
    tags: ['database', 'script', 'storage', 'crud', 'code'],
    examples: [
      'delete script',
      'remove my script',
      'delete stored code',
      'clear old scripts'
    ],
    category: 'database'
  },

  // ===== USER FEELINGS TOOLS (3) =====
  {
    id: 'logFeeling',
    name: 'Log Feeling',
    description: 'Log a user\'s feeling or mood entry to track emotional states over time',
    keywords: ['feeling', 'mood', 'emotion', 'log', 'track', 'mental health', 'wellness', 'sentiment', 'happy', 'sad', 'anxious', 'record'],
    tags: ['database', 'feelings', 'mood', 'tracking', 'mental-health'],
    examples: [
      'log my feeling for today',
      'I\'m feeling happy',
      'record that I\'m anxious',
      'track my mood',
      'log feeling',
      'I feel stressed'
    ],
    category: 'database'
  },

  {
    id: 'queryFeelings',
    name: 'Query Feelings',
    description: 'Query and retrieve user feelings history with flexible filtering by date, type, and intensity',
    keywords: ['feeling', 'mood', 'emotion', 'query', 'history', 'track', 'show', 'list', 'view', 'filter', 'search', 'mental health'],
    tags: ['database', 'feelings', 'mood', 'tracking', 'query'],
    examples: [
      'show me my mood history',
      'what were my feelings last week',
      'show all times I felt anxious',
      'list my feelings from the past month',
      'query my feelings',
      'show high intensity feelings'
    ],
    category: 'database'
  },

  {
    id: 'getFeelingSummary',
    name: 'Get Feeling Summary',
    description: 'Get aggregated mood statistics and insights including most common feelings, average intensity, trends, and emotional patterns',
    keywords: ['feeling', 'mood', 'emotion', 'summary', 'statistics', 'analysis', 'trends', 'patterns', 'insights', 'mental health', 'wellness'],
    tags: ['database', 'feelings', 'mood', 'analytics', 'summary'],
    examples: [
      'show me my mood summary',
      'what are my most common feelings',
      'analyze my emotional patterns',
      'give me mood statistics',
      'how have I been feeling overall',
      'feeling trends'
    ],
    category: 'database'
  },

  // ===== GITHUB TOOLS (10) =====
  {
    id: 'githubCreateIssue',
    name: 'GitHub Create Issue',
    description: 'Create a GitHub issue with full context and formatting',
    keywords: ['github', 'issue', 'create', 'bug', 'feature', 'request', 'task'],
    tags: ['github', 'issue', 'project-management'],
    examples: [
      'create a GitHub issue',
      'file a bug report',
      'open an issue',
      'report a bug on GitHub'
    ],
    category: 'github'
  },

  {
    id: 'githubFixIssues',
    name: 'GitHub Fix Issues',
    description: 'Request Claude to fix specific GitHub issues by commenting with detailed guidance on whether to close or fix them',
    keywords: ['github', 'issue', 'fix', 'repair', 'resolve', 'claude', 'auto', 'self-evolving'],
    tags: ['github', 'issue', 'automation', 'ai'],
    examples: [
      'fix GitHub issue 123',
      'request Claude to fix issues',
      'have Claude resolve issue',
      'auto-fix GitHub issues'
    ],
    category: 'github'
  },

  {
    id: 'githubUpdateIssue',
    name: 'GitHub Update Issue',
    description: 'Update an existing GitHub issue',
    keywords: ['github', 'issue', 'update', 'modify', 'edit', 'change'],
    tags: ['github', 'issue', 'project-management'],
    examples: [
      'update GitHub issue',
      'modify issue',
      'edit GitHub issue',
      'change issue status'
    ],
    category: 'github'
  },

  {
    id: 'githubCloseIssue',
    name: 'GitHub Close Issue',
    description: 'Close a GitHub issue',
    keywords: ['github', 'issue', 'close', 'resolve', 'complete', 'finish'],
    tags: ['github', 'issue', 'project-management'],
    examples: [
      'close GitHub issue',
      'resolve issue',
      'mark issue complete',
      'finish issue'
    ],
    category: 'github'
  },

  {
    id: 'githubListIssues',
    name: 'GitHub List Issues',
    description: 'List GitHub issues from the repository with filtering by state',
    keywords: ['github', 'issue', 'list', 'show', 'view', 'all', 'open', 'closed'],
    tags: ['github', 'issue', 'project-management'],
    examples: [
      'list GitHub issues',
      'show all issues',
      'view open issues',
      'list all issues'
    ],
    category: 'github'
  },

  {
    id: 'githubCloseAllIssues',
    name: 'GitHub Close All Issues',
    description: 'Close all open issues in the repository (destructive operation)',
    keywords: ['github', 'issue', 'close', 'all', 'bulk', 'cleanup'],
    tags: ['github', 'issue', 'project-management'],
    examples: [
      'close all GitHub issues',
      'close all open issues',
      'bulk close issues',
      'cleanup all issues'
    ],
    category: 'github'
  },

  {
    id: 'githubMergePR',
    name: 'GitHub Merge PR',
    description: 'Merge a GitHub pull request',
    keywords: ['github', 'merge', 'pull request', 'pr', 'approve'],
    tags: ['github', 'pr', 'project-management'],
    examples: [
      'merge pull request',
      'merge PR',
      'approve and merge',
      'merge GitHub PR'
    ],
    category: 'github'
  },

  {
    id: 'githubListPullRequests',
    name: 'GitHub List Pull Requests',
    description: 'List GitHub pull requests from the repository with filtering by state',
    keywords: ['github', 'pull request', 'pr', 'list', 'show', 'view', 'all', 'open', 'closed'],
    tags: ['github', 'pr', 'project-management'],
    examples: [
      'list pull requests',
      'show all PRs',
      'view open PRs',
      'list GitHub PRs'
    ],
    category: 'github'
  },

  {
    id: 'githubClosePullRequest',
    name: 'GitHub Close Pull Request',
    description: 'Close a GitHub pull request without merging',
    keywords: ['github', 'pull request', 'pr', 'close', 'reject', 'cancel'],
    tags: ['github', 'pr', 'project-management'],
    examples: [
      'close pull request',
      'reject PR',
      'close GitHub PR',
      'cancel PR'
    ],
    category: 'github'
  },

  {
    id: 'githubCloseAllPullRequests',
    name: 'GitHub Close All Pull Requests',
    description: 'Close all open pull requests in the repository (destructive operation)',
    keywords: ['github', 'pull request', 'pr', 'close', 'all', 'bulk', 'cleanup'],
    tags: ['github', 'pr', 'project-management'],
    examples: [
      'close all pull requests',
      'close all PRs',
      'bulk close PRs',
      'cleanup all PRs'
    ],
    category: 'github'
  },

  // ===== CONTENT CREATION TOOLS =====
  {
    id: 'researchEssay',
    name: 'Research Essay',
    description: 'Automated research and essay generation',
    keywords: ['research', 'essay', 'write', 'article', 'paper', 'academic'],
    tags: ['content', 'research', 'writing'],
    examples: [
      'write a research essay',
      'research and write about',
      'create an essay on',
      'write academic paper'
    ],
    category: 'content'
  },

  {
    id: 'asciiGraph',
    name: 'ASCII Graph',
    description: 'Generate text-based data visualizations',
    keywords: ['ascii', 'graph', 'chart', 'visualization', 'text', 'plot'],
    tags: ['visualization', 'ascii', 'chart'],
    examples: [
      'create ASCII graph',
      'make text chart',
      'generate ASCII visualization',
      'plot data as text'
    ],
    category: 'content'
  },

  {
    id: 'asciiMap',
    name: 'ASCII Map',
    description: 'Generate ASCII maps and diagrams',
    keywords: ['ascii', 'map', 'diagram', 'text', 'visualization'],
    tags: ['visualization', 'ascii', 'map'],
    examples: [
      'create ASCII map',
      'make text map',
      'generate ASCII diagram'
    ],
    category: 'content'
  },

  {
    id: 'renderChart',
    name: 'Render Chart',
    description: 'Render data visualizations and charts',
    keywords: ['chart', 'graph', 'visualization', 'data', 'plot', 'render'],
    tags: ['visualization', 'chart', 'data'],
    examples: [
      'render a chart',
      'create visualization',
      'make a graph',
      'plot this data'
    ],
    category: 'content'
  },

  {
    id: 'generateComic',
    name: 'Generate Comic',
    description: 'Generate comic strips and panels',
    keywords: ['comic', 'cartoon', 'strip', 'generate', 'art'],
    tags: ['content', 'image', 'comic'],
    examples: [
      'generate a comic',
      'create comic strip',
      'make cartoon',
      'generate comic panel'
    ],
    category: 'content'
  },

  {
    id: 'generateSonnet',
    name: 'Generate Sonnet',
    description: 'Generate sonnets and poetry',
    keywords: ['sonnet', 'poem', 'poetry', 'verse', 'generate'],
    tags: ['content', 'poetry', 'writing'],
    examples: [
      'write a sonnet',
      'generate poetry',
      'create a poem',
      'write verse'
    ],
    category: 'content'
  },

  {
    id: 'generateHaiku',
    name: 'Generate Haiku',
    description: 'Generate haiku poems',
    keywords: ['haiku', 'poem', 'poetry', 'generate', 'japanese'],
    tags: ['content', 'poetry', 'writing'],
    examples: [
      'write a haiku',
      'generate haiku',
      'create haiku poem'
    ],
    category: 'content'
  },

  {
    id: 'generatePersonalizedPoem',
    name: 'Generate Personalized Poem',
    description: 'Generate personalized poems based on user profile data including personality, interests, and characteristics',
    keywords: ['personalized', 'poem', 'poetry', 'profile', 'personal', 'custom', 'me', 'my', 'about me'],
    tags: ['content', 'poetry', 'writing', 'personalized'],
    examples: [
      'write me a poem',
      'write a poem about me',
      'create a personalized poem',
      'generate a poem for me',
      'make me a personal poem'
    ],
    category: 'content'
  },

  {
    id: 'generateUnexpectedEvent',
    name: 'Generate Unexpected Event',
    description: 'Generate unexpected and surprising events, plot twists, challenges, or scenarios for creative inspiration, storytelling, and brainstorming',
    keywords: ['unexpected', 'surprise', 'twist', 'event', 'plot', 'creative', 'random', 'challenge', 'idea', 'inspiration', 'story'],
    tags: ['content', 'creative', 'writing', 'storytelling', 'gaming'],
    examples: [
      'generate an unexpected event',
      'give me a surprising plot twist',
      'create a random challenge',
      'surprise me with a weird idea',
      'generate a plot twist',
      'create unexpected scenario',
      'give me a creative challenge'
    ],
    category: 'content'
  },

  {
    id: 'generateCsv',
    name: 'Generate CSV',
    description: 'Generate CSV data files',
    keywords: ['csv', 'data', 'generate', 'spreadsheet', 'table'],
    tags: ['content', 'data', 'csv'],
    examples: [
      'generate CSV',
      'create CSV file',
      'make spreadsheet data',
      'export to CSV'
    ],
    category: 'content'
  },

  {
    id: 'csvToChart',
    name: 'CSV to Chart',
    description: 'Convert CSV data to charts',
    keywords: ['csv', 'chart', 'convert', 'visualize', 'data'],
    tags: ['visualization', 'csv', 'chart'],
    examples: [
      'convert CSV to chart',
      'visualize CSV data',
      'make chart from CSV',
      'plot CSV'
    ],
    category: 'content'
  },

  {
    id: 'generateSongLyrics',
    name: 'Generate Song Lyrics',
    description: 'Generate song lyrics',
    keywords: ['song', 'lyrics', 'music', 'generate', 'write'],
    tags: ['content', 'music', 'writing'],
    examples: [
      'write song lyrics',
      'generate lyrics',
      'create a song',
      'write music'
    ],
    category: 'content'
  },

  {
    id: 'generateSheetMusic',
    name: 'Generate Sheet Music',
    description: 'Generate sheet music notation',
    keywords: ['sheet music', 'music', 'notation', 'generate', 'compose'],
    tags: ['content', 'music', 'notation'],
    examples: [
      'generate sheet music',
      'create music notation',
      'compose music',
      'make sheet music'
    ],
    category: 'content'
  },

  {
    id: 'abcToMidi',
    name: 'ABC to MIDI Converter',
    description: 'Convert ABC notation to MIDI format and upload as artifact',
    keywords: ['abc', 'midi', 'convert', 'music', 'audio', 'playable', 'notation', 'file'],
    tags: ['content', 'music', 'conversion', 'artifact'],
    examples: [
      'convert to MIDI',
      'make MIDI file',
      'create playable music',
      'abc to midi',
      'convert abc notation',
      'generate midi from sheet music'
    ],
    category: 'content'
  },

  {
    id: 'abcToMp3',
    name: 'ABC to MP3 Converter',
    description: 'Convert ABC notation to high-quality MP3 audio with realistic piano sound using FluidSynth and SoundFont',
    keywords: ['abc', 'mp3', 'audio', 'convert', 'music', 'piano', 'sound', 'playable', 'notation', 'high quality', 'fluidsynth', 'soundfont'],
    tags: ['content', 'music', 'conversion', 'audio', 'artifact'],
    examples: [
      'convert to MP3',
      'make MP3 file',
      'create high quality audio',
      'abc to mp3',
      'convert abc to audio',
      'generate mp3 from sheet music',
      'realistic piano audio',
      'playable music file'
    ],
    category: 'content'
  },

  {
    id: 'ffmpegVideoCreator',
    name: 'FFmpeg Video Creator',
    description: 'Create videos from sequences of still images using FFmpeg automation. Upload or provide URLs to a series of images to generate MP4 videos.',
    keywords: ['video', 'ffmpeg', 'images', 'sequence', 'animation', 'create video', 'mp4', 'cartoon', 'frames', 'animate', 'image to video'],
    tags: ['content', 'video', 'creation', 'media', 'artifact'],
    examples: [
      'create a video from images',
      'make video from pictures',
      'combine images into video',
      'animate image sequence',
      'create video from cartoon frames',
      'generate mp4 from images',
      'image sequence to video',
      'make animation from images'
    ],
    category: 'content'
  },

  {
    id: 'generateMarkdown',
    name: 'Generate Markdown',
    description: 'Generate formatted markdown documents',
    keywords: ['markdown', 'generate', 'document', 'format', 'write'],
    tags: ['content', 'markdown', 'writing'],
    examples: [
      'generate markdown',
      'create markdown document',
      'write in markdown',
      'format as markdown'
    ],
    category: 'content'
  },

  {
    id: 'generateCrossword',
    name: 'Generate Crossword',
    description: 'Generate crossword puzzles',
    keywords: ['crossword', 'puzzle', 'game', 'generate', 'word'],
    tags: ['content', 'game', 'puzzle'],
    examples: [
      'generate crossword',
      'create crossword puzzle',
      'make word puzzle'
    ],
    category: 'content'
  },

  {
    id: 'generateMarketingCopy',
    name: 'Generate Marketing Copy',
    description: 'Generate marketing and advertising copy',
    keywords: ['marketing', 'copy', 'advertising', 'generate', 'write'],
    tags: ['content', 'marketing', 'writing'],
    examples: [
      'write marketing copy',
      'generate ad copy',
      'create marketing content',
      'write advertisement'
    ],
    category: 'content'
  },

  {
    id: 'generateDungeonMap',
    name: 'Generate Dungeon Map',
    description: 'Generate RPG dungeon maps',
    keywords: ['dungeon', 'map', 'rpg', 'game', 'generate', 'dnd'],
    tags: ['content', 'game', 'rpg'],
    examples: [
      'generate dungeon map',
      'create RPG map',
      'make dungeon layout',
      'generate D&D map'
    ],
    category: 'content'
  },

  {
    id: 'generateIconEmoji',
    name: 'Generate Icon Emoji',
    description: 'Generate custom icons and emojis',
    keywords: ['icon', 'emoji', 'generate', 'create', 'symbol'],
    tags: ['content', 'icon', 'image'],
    examples: [
      'generate icon',
      'create emoji',
      'make custom icon',
      'generate symbol'
    ],
    category: 'content'
  },

  {
    id: 'generateStandupSummary',
    name: 'Generate Standup Summary',
    description: 'Generate standup meeting summaries',
    keywords: ['standup', 'summary', 'meeting', 'generate', 'scrum'],
    tags: ['content', 'meeting', 'summary'],
    examples: [
      'generate standup summary',
      'create meeting summary',
      'summarize standup',
      'scrum summary'
    ],
    category: 'content'
  },

  {
    id: 'generateLegalDisclaimer',
    name: 'Generate Legal Disclaimer',
    description: 'Generate legal disclaimers and notices',
    keywords: ['legal', 'disclaimer', 'generate', 'notice', 'terms'],
    tags: ['content', 'legal', 'writing'],
    examples: [
      'generate legal disclaimer',
      'create legal notice',
      'write disclaimer',
      'generate terms'
    ],
    category: 'content'
  },

  {
    id: 'generateFilmScene',
    name: 'Generate Film Scene',
    description: 'Generate film scene descriptions',
    keywords: ['film', 'scene', 'movie', 'generate', 'screenplay'],
    tags: ['content', 'film', 'writing'],
    examples: [
      'generate film scene',
      'create movie scene',
      'write screenplay',
      'describe film scene'
    ],
    category: 'content'
  },

  {
    id: 'generateAnimeManga',
    name: 'Generate Anime Manga',
    description: 'Generate vertical anime-style manga pages with multiple tiled panels, authentic Japanese manga art styles, and character integration',
    keywords: ['anime', 'manga', 'comic', 'japanese', 'vertical', 'panel', 'generate', 'art', 'shonen', 'shoujo', 'seinen', 'josei', 'isekai', 'mecha', 'tile', 'page'],
    tags: ['content', 'image', 'manga', 'anime', 'comic'],
    examples: [
      'generate anime manga',
      'create manga page',
      'make anime comic',
      'generate vertical manga',
      'create shonen manga',
      'make shoujo manga page',
      'generate isekai manga'
    ],
    category: 'content'
  },

  {
    id: 'generateStarSign',
    name: 'Generate Star Sign',
    description: 'Generate astrological readings and horoscopes',
    keywords: ['astrology', 'horoscope', 'star sign', 'zodiac', 'generate'],
    tags: ['content', 'astrology', 'fun'],
    examples: [
      'generate horoscope',
      'create star sign reading',
      'astrology reading',
      'zodiac prediction'
    ],
    category: 'specialized'
  },

  // ===== IMAGE GENERATION TOOLS =====
  {
    id: 'generateUserImage',
    name: 'Generate User Image',
    description: 'Generate images using AI',
    keywords: ['image', 'generate', 'ai', 'create', 'picture', 'art'],
    tags: ['image', 'ai', 'generation'],
    examples: [
      'generate an image',
      'create a picture',
      'make an image of',
      'generate art'
    ],
    category: 'content'
  },

  {
    id: 'editUserImage',
    name: 'Edit User Image',
    description: 'Edit images using AI',
    keywords: ['image', 'edit', 'modify', 'change', 'ai'],
    tags: ['image', 'ai', 'editing'],
    examples: [
      'edit this image',
      'modify picture',
      'change image',
      'edit photo'
    ],
    category: 'content'
  },

  {
    id: 'imageEditor',
    name: 'Image Editor',
    description: 'Advanced image editing tool',
    keywords: ['image', 'editor', 'edit', 'modify', 'advanced'],
    tags: ['image', 'editing', 'advanced'],
    examples: [
      'edit image',
      'advanced image editing',
      'modify photo',
      'image manipulation'
    ],
    category: 'content'
  },

  {
    id: 'advancedImageEditingWithContext',
    name: 'Advanced Image Editing',
    description: 'Advanced image editing with conversation context',
    keywords: ['image', 'edit', 'advanced', 'context', 'ai'],
    tags: ['image', 'editing', 'advanced'],
    examples: [
      'advanced image edit',
      'edit with context',
      'complex image editing'
    ],
    category: 'content'
  },

  {
    id: 'generateUserAvatar',
    name: 'Generate User Avatar',
    description: 'Generate user avatars and profile pictures',
    keywords: ['avatar', 'generate', 'profile', 'picture', 'image'],
    tags: ['image', 'avatar', 'generation'],
    examples: [
      'generate avatar',
      'create profile picture',
      'make avatar',
      'generate user icon'
    ],
    category: 'content'
  },

  {
    id: 'uploadMyPhoto',
    name: 'Upload My Photo',
    description: 'Upload and manage user photos',
    keywords: ['upload', 'photo', 'image', 'save', 'my'],
    tags: ['file', 'image', 'upload'],
    examples: [
      'upload my photo',
      'save my picture',
      'upload image',
      'save photo'
    ],
    category: 'file'
  },

  {
    id: 'thisIsHowILook',
    name: 'This Is How I Look',
    description: 'Describe your avatar appearance through words as an alternative to photo uploads',
    keywords: ['describe', 'appearance', 'look', 'avatar', 'text', 'description', 'how i look', 'this is how'],
    tags: ['avatar', 'appearance', 'description', 'profile'],
    examples: [
      'this is how i look',
      'describe my appearance',
      'I look like a tall person with brown hair',
      'let me describe how I look',
      'my appearance is'
    ],
    category: 'file'
  },

  {
    id: 'generateMyPortrait',
    name: 'Generate My Portrait',
    description: 'Generate personalized portraits',
    keywords: ['portrait', 'generate', 'personalized', 'image', 'my'],
    tags: ['image', 'portrait', 'generation'],
    examples: [
      'generate my portrait',
      'create portrait',
      'make my portrait',
      'personalized portrait'
    ],
    category: 'content'
  },

  {
    id: 'generateCaricature',
    name: 'Generate Caricature',
    description: 'Generate caricatures that cartoonishly exaggerate user features based on photo and personality',
    keywords: ['caricature', 'cartoon', 'exaggerate', 'funny', 'drawing', 'comic', 'humorous', 'personalized', 'generate'],
    tags: ['image', 'caricature', 'generation', 'fun'],
    examples: [
      'generate my caricature',
      'make a caricature of me',
      'draw a cartoon version of me',
      'create an exaggerated drawing',
      'caricature me'
    ],
    category: 'content'
  },

  // ===== FILE MANAGEMENT TOOLS =====
  {
    id: 'listUploadedFiles',
    name: 'List Uploaded Files',
    description: 'List all uploaded files',
    keywords: ['list', 'files', 'uploaded', 'show', 'view'],
    tags: ['file', 'list', 'management'],
    examples: [
      'list uploaded files',
      'show my files',
      'view uploaded files',
      'list files'
    ],
    category: 'file'
  },

  {
    id: 'transferRailwayFiles',
    name: 'Transfer Railway Files',
    description: 'Transfer files to Railway storage',
    keywords: ['transfer', 'railway', 'files', 'upload', 'migrate'],
    tags: ['file', 'railway', 'transfer'],
    examples: [
      'transfer files to railway',
      'migrate files',
      'upload to railway'
    ],
    category: 'file'
  },

  {
    id: 'uploadAndCommitFile',
    name: 'Upload and Commit File',
    description: 'Upload file and commit to git repository',
    keywords: ['upload', 'commit', 'git', 'file', 'save'],
    tags: ['file', 'git', 'upload'],
    examples: [
      'upload and commit file',
      'save to git',
      'commit file to repo'
    ],
    category: 'file'
  },

  {
    id: 'commitFile',
    name: 'Commit File',
    description: 'Commit file changes to git repository',
    keywords: ['commit', 'git', 'file', 'save', 'repository'],
    tags: ['git', 'commit', 'file'],
    examples: [
      'commit file',
      'save to git',
      'commit changes',
      'git commit'
    ],
    category: 'file'
  },

  {
    id: 'listRepositoryFiles',
    name: 'List Repository Files',
    description: 'List files in a git repository',
    keywords: ['list', 'repository', 'files', 'git', 'show'],
    tags: ['git', 'list', 'repository'],
    examples: [
      'list repository files',
      'show repo files',
      'list git files',
      'view repository'
    ],
    category: 'file'
  },

  // ===== BLOG AND DOCUMENTATION TOOLS =====
  {
    id: 'createBlogPost',
    name: 'Create Blog Post',
    description: 'Create blog posts and articles',
    keywords: ['blog', 'create', 'post', 'article', 'write'],
    tags: ['content', 'blog', 'writing'],
    examples: [
      'create blog post',
      'write article',
      'make blog post',
      'new blog entry'
    ],
    category: 'content'
  },

  {
    id: 'updateBlogPost',
    name: 'Update Blog Post',
    description: 'Update existing blog posts',
    keywords: ['blog', 'update', 'edit', 'modify', 'post'],
    tags: ['content', 'blog', 'editing'],
    examples: [
      'update blog post',
      'edit article',
      'modify blog post',
      'change blog entry'
    ],
    category: 'content'
  },

  {
    id: 'listBlogPosts',
    name: 'List Blog Posts',
    description: 'List all blog posts',
    keywords: ['blog', 'list', 'posts', 'show', 'view'],
    tags: ['content', 'blog', 'list'],
    examples: [
      'list blog posts',
      'show all posts',
      'view blog posts',
      'list articles'
    ],
    category: 'content'
  },

  {
    id: 'triggerDailyBlog',
    name: 'Trigger Daily Blog',
    description: 'Trigger daily blog post generation',
    keywords: ['blog', 'daily', 'trigger', 'automatic', 'generate'],
    tags: ['content', 'blog', 'automation'],
    examples: [
      'trigger daily blog',
      'generate daily post',
      'create daily blog'
    ],
    category: 'content'
  },

  // ===== CONVERSATION AND MESSAGING TOOLS =====
  {
    id: 'exportConversation',
    name: 'Export Conversation',
    description: 'Export Discord conversation history as Markdown',
    keywords: ['export', 'conversation', 'history', 'markdown', 'save'],
    tags: ['content', 'conversation', 'export'],
    examples: [
      'export conversation',
      'save chat history',
      'export messages',
      'download conversation'
    ],
    category: 'content'
  },

  {
    id: 'conversationDiagram',
    name: 'Conversation Diagram',
    description: 'Generate diagrams from conversations',
    keywords: ['conversation', 'diagram', 'visualize', 'chart', 'flow'],
    tags: ['visualization', 'conversation', 'diagram'],
    examples: [
      'create conversation diagram',
      'visualize conversation',
      'make chat diagram'
    ],
    category: 'content'
  },

  {
    id: 'conversationToSlidev',
    name: 'Conversation to Slidev',
    description: 'Convert conversation to Slidev presentation',
    keywords: ['conversation', 'slidev', 'presentation', 'convert', 'slides'],
    tags: ['content', 'presentation', 'slidev'],
    examples: [
      'convert to slidev',
      'make presentation from chat',
      'create slides from conversation'
    ],
    category: 'content'
  },

  {
    id: 'buildSlidevPresentation',
    name: 'Build Slidev Presentation',
    description: 'Build Slidev presentations',
    keywords: ['slidev', 'presentation', 'build', 'slides', 'create'],
    tags: ['content', 'presentation', 'slidev'],
    examples: [
      'build slidev presentation',
      'create slides',
      'make presentation'
    ],
    category: 'content'
  },

  {
    id: 'queryMessages',
    name: 'Query Messages',
    description: 'Query and search Discord messages',
    keywords: ['query', 'messages', 'search', 'find', 'discord'],
    tags: ['content', 'search', 'messages'],
    examples: [
      'query messages',
      'search messages',
      'find message',
      'search chat history'
    ],
    category: 'research'
  },

  {
    id: 'queryDecisionLogs',
    name: 'Query Decision Logs',
    description: 'Query and analyze decision logs to learn from past decisions, track patterns, and support autonomous growth',
    keywords: ['decision', 'logs', 'query', 'analyze', 'learn', 'autonomous', 'growth', 'patterns', 'audit', 'history', 'tracking', 'sentiment', 'confidence', 'tools'],
    tags: ['database', 'analytics', 'autonomous', 'decision', 'learning'],
    examples: [
      'show recent decisions',
      'analyze my decision patterns',
      'search decision logs for sentiment',
      'how many decisions have I made',
      'what are my confidence trends',
      'show me tool execution decisions',
      'query decision logs',
      'analyze past decisions'
    ],
    category: 'database'
  },

  {
    id: 'reportMessageAsIssue',
    name: 'Report Message as Issue',
    description: 'Report Discord message as GitHub issue',
    keywords: ['report', 'message', 'issue', 'github', 'bug'],
    tags: ['github', 'issue', 'reporting'],
    examples: [
      'report as issue',
      'create issue from message',
      'report message',
      'file bug from message'
    ],
    category: 'github'
  },

  // ===== UTILITY AND ANALYSIS TOOLS =====
  {
    id: 'weather',
    name: 'Weather',
    description: 'Get weather information',
    keywords: ['weather', 'forecast', 'temperature', 'climate', 'conditions'],
    tags: ['research', 'weather', 'utility'],
    examples: [
      'get weather',
      'weather forecast',
      'what is the weather',
      'check weather'
    ],
    category: 'research'
  },

  {
    id: 'locationMap',
    name: 'Location Map',
    description: 'Detect physical locations (GPS coordinates, addresses, zip codes, postal codes, place names) and generate Google Maps static image snapshot and clickable link',
    keywords: ['location', 'map', 'maps', 'google maps', 'address', 'coordinates', 'gps', 'latitude', 'longitude', 'zip code', 'postal code', 'place', 'directions', 'geography', 'geocode'],
    tags: ['research', 'maps', 'location', 'utility', 'geography'],
    examples: [
      'show me a map of',
      'where is 47.6205, -122.3493',
      'map of Seattle',
      'show 10001 on a map',
      'get location for',
      'coordinates of',
      'map this address',
      'show me where'
    ],
    category: 'research'
  },

  {
    id: 'spatialQuery',
    name: 'Spatial Query',
    description: 'Query location data using PostGIS spatial capabilities - find nearby locations, calculate distances, search within areas, and track location mentions',
    keywords: ['spatial', 'postgis', 'proximity', 'nearby', 'distance', 'location query', 'geospatial', 'radius', 'bounding box', 'nearest', 'geography'],
    tags: ['database', 'location', 'spatial', 'postgis', 'geography'],
    examples: [
      'find locations near',
      'locations within 10km',
      'calculate distance between',
      'find nearest locations',
      'locations in area',
      'spatial search',
      'proximity query',
      'user locations'
    ],
    category: 'research'
  },

  {
    id: 'linuxAdvantages',
    name: 'Linux Advantages',
    description: 'Educational content about Linux and open-source',
    keywords: ['linux', 'opensource', 'advantages', 'education', 'operating system'],
    tags: ['admin', 'education', 'linux'],
    examples: [
      'linux advantages',
      'why use linux',
      'benefits of linux',
      'opensource benefits'
    ],
    category: 'admin'
  },

  {
    id: 'jsonAgentGenerator',
    name: 'JSON Agent Generator',
    description: 'Create/validate/convert JSON Agents (PAM spec)',
    keywords: ['json', 'agent', 'generator', 'pam', 'validate'],
    tags: ['development', 'json', 'agent'],
    examples: [
      'generate JSON agent',
      'create PAM agent',
      'validate JSON agent',
      'convert to JSON agent'
    ],
    category: 'development'
  },

  {
    id: 'hackerNewsPhilosophy',
    name: 'Hacker News Philosophy',
    description: 'Discover philosophical content from Hacker News',
    keywords: ['hackernews', 'philosophy', 'discover', 'articles', 'tech'],
    tags: ['research', 'hackernews', 'philosophy'],
    examples: [
      'hacker news philosophy',
      'find philosophical articles',
      'discover HN philosophy',
      'philosophical tech news'
    ],
    category: 'research'
  },

  {
    id: 'hackerNews',
    name: 'Hacker News',
    description: 'Get top stories from Hacker News',
    keywords: ['hackernews', 'news', 'tech', 'stories', 'hn'],
    tags: ['research', 'hackernews', 'news'],
    examples: [
      'hacker news',
      'HN top stories',
      'tech news',
      'get hacker news'
    ],
    category: 'research'
  },

  {
    id: 'arxiv',
    name: 'arXiv',
    description: 'Search arXiv for research papers',
    keywords: ['arxiv', 'research', 'papers', 'academic', 'scientific'],
    tags: ['research', 'arxiv', 'academic'],
    examples: [
      'search arxiv',
      'find research papers',
      'arxiv papers',
      'scientific research'
    ],
    category: 'research'
  },

  {
    id: 'moodUplifter',
    name: 'Mood Uplifter',
    description: 'Detect and respond to negative sentiment',
    keywords: ['mood', 'uplifter', 'sentiment', 'positive', 'cheer'],
    tags: ['specialized', 'mood', 'sentiment'],
    examples: [
      'cheer me up',
      'improve mood',
      'uplift mood',
      'make me happy'
    ],
    category: 'specialized'
  },

  {
    id: 'tellJoke',
    name: 'Tell Joke',
    description: 'Tell jokes',
    keywords: ['joke', 'funny', 'humor', 'comedy', 'laugh'],
    tags: ['specialized', 'joke', 'fun'],
    examples: [
      'tell a joke',
      'make me laugh',
      'tell me something funny',
      'joke please'
    ],
    category: 'specialized'
  },

  {
    id: 'fishJoke',
    name: 'Fish Joke',
    description: 'Tell fish-themed jokes',
    keywords: ['fish', 'joke', 'funny', 'humor', 'comedy'],
    tags: ['specialized', 'joke', 'fun'],
    examples: [
      'tell a fish joke',
      'fish humor',
      'fish pun',
      'fishing joke'
    ],
    category: 'specialized'
  },

  {
    id: 'tellHistoricalFact',
    name: 'Tell Historical Fact',
    description: 'Share historical facts',
    keywords: ['history', 'fact', 'historical', 'trivia', 'past'],
    tags: ['specialized', 'history', 'education'],
    examples: [
      'tell historical fact',
      'history trivia',
      'historical fact',
      'tell me about history'
    ],
    category: 'specialized'
  },

  {
    id: 'recipeGenerator',
    name: 'Recipe Generator',
    description: 'Generate cooking recipes',
    keywords: ['recipe', 'cooking', 'food', 'generate', 'meal'],
    tags: ['content', 'recipe', 'cooking'],
    examples: [
      'generate recipe',
      'create recipe',
      'cooking recipe',
      'make recipe'
    ],
    category: 'content'
  },

  {
    id: 'ooda',
    name: 'OODA Loop',
    description: 'OODA loop decision-making framework',
    keywords: ['ooda', 'decision', 'framework', 'strategy', 'loop'],
    tags: ['specialized', 'decision', 'strategy'],
    examples: [
      'ooda loop',
      'decision framework',
      'strategic thinking',
      'ooda analysis'
    ],
    category: 'specialized'
  },

  {
    id: 'codeQuery',
    name: 'Code Query',
    description: 'Query and search code',
    keywords: ['code', 'query', 'search', 'find', 'analyze'],
    tags: ['development', 'code', 'search'],
    examples: [
      'query code',
      'search code',
      'find code',
      'analyze code'
    ],
    category: 'development'
  },

  {
    id: 'getOmegaManifest',
    name: 'Get Omega Manifest',
    description: 'Get bot configuration and manifest',
    keywords: ['omega', 'manifest', 'config', 'configuration', 'settings'],
    tags: ['admin', 'config', 'manifest'],
    examples: [
      'get omega manifest',
      'show configuration',
      'bot manifest',
      'omega config'
    ],
    category: 'admin'
  },

  {
    id: 'translateToSpanish',
    name: 'Translate to Spanish',
    description: 'Translate text to Spanish',
    keywords: ['translate', 'spanish', 'language', 'convert', 'español'],
    tags: ['specialized', 'translation', 'language'],
    examples: [
      'translate to spanish',
      'convert to spanish',
      'spanish translation',
      'translate this'
    ],
    category: 'specialized'
  },

  {
    id: 'summarizeToS',
    name: 'Summarize Terms of Service',
    description: 'Fetch and analyze Terms of Service documents from URLs, extracting key points, privacy concerns, and risk flags',
    keywords: ['terms', 'service', 'tos', 'legal', 'privacy', 'policy', 'agreement', 'contract', 'summarize', 'analyze'],
    tags: ['legal', 'document', 'analysis', 'privacy'],
    examples: [
      'summarize these terms of service',
      'analyze this ToS',
      'what does this privacy policy say',
      'explain these terms',
      'terms of service summary',
      'check this agreement'
    ],
    category: 'research'
  },

  {
    id: 'marketPrediction',
    name: 'Market Prediction',
    description: 'Generate market predictions and analysis',
    keywords: ['market', 'prediction', 'analysis', 'forecast', 'stock'],
    tags: ['specialized', 'market', 'prediction'],
    examples: [
      'market prediction',
      'predict market',
      'market analysis',
      'forecast market'
    ],
    category: 'specialized'
  },

  {
    id: 'summarizeCommits',
    name: 'Summarize Commits',
    description: 'Summarize git commits',
    keywords: ['summarize', 'commits', 'git', 'changelog', 'history'],
    tags: ['git', 'summary', 'commits'],
    examples: [
      'summarize commits',
      'git summary',
      'commit summary',
      'changelog summary'
    ],
    category: 'github'
  },

  {
    id: 'introspectFeelings',
    name: 'Introspect Feelings',
    description: 'Introspect and analyze feelings',
    keywords: ['introspect', 'feelings', 'emotions', 'analyze', 'psychology'],
    tags: ['specialized', 'psychology', 'feelings'],
    examples: [
      'introspect feelings',
      'analyze emotions',
      'introspection',
      'examine feelings'
    ],
    category: 'specialized'
  },

  {
    id: 'autonomousInsightAgent',
    name: 'Autonomous Insight Agent',
    description: 'Autonomously analyze conversation history, user sentiment, bot internal state, and database activity to generate insights and recommendations for improving interactions',
    keywords: ['autonomous', 'insight', 'analysis', 'recommendations', 'conversation', 'sentiment', 'bot', 'feelings', 'performance', 'improvements', 'patterns', 'trends', 'ai-ops'],
    tags: ['ai-ops', 'analysis', 'insights', 'autonomous', 'recommendations'],
    examples: [
      'generate insights from the last 500 messages',
      'analyze bot feelings and user interactions',
      'recommend improvements based on conversation patterns',
      'analyze conversation quality',
      'show me insights from recent messages',
      'what can you tell me about user engagement'
    ],
    category: 'specialized'
  },

  {
    id: 'createLiveDocument',
    name: 'Create Live Document',
    description: 'Create collaborative live documents',
    keywords: ['create', 'live', 'document', 'collaborative', 'share'],
    tags: ['content', 'document', 'collaborative'],
    examples: [
      'create live document',
      'make collaborative doc',
      'create shared document',
      'live doc'
    ],
    category: 'content'
  },

  {
    id: 'readLiveDocument',
    name: 'Read Live Document',
    description: 'Read live document content',
    keywords: ['read', 'live', 'document', 'view', 'get'],
    tags: ['content', 'document', 'read'],
    examples: [
      'read live document',
      'view live doc',
      'get document content',
      'show live document'
    ],
    category: 'content'
  },

  {
    id: 'reportMissingTool',
    name: 'Report Missing Tool',
    description: 'Report missing or needed tools',
    keywords: ['report', 'missing', 'tool', 'request', 'feature'],
    tags: ['admin', 'report', 'feature'],
    examples: [
      'report missing tool',
      'request tool',
      'missing feature',
      'report need'
    ],
    category: 'admin'
  },

  {
    id: 'inspectTool',
    name: 'Inspect Tool',
    description: 'Inspect tool details and documentation',
    keywords: ['inspect', 'tool', 'details', 'documentation', 'info'],
    tags: ['admin', 'inspect', 'documentation'],
    examples: [
      'inspect tool',
      'tool details',
      'show tool info',
      'tool documentation'
    ],
    category: 'admin'
  },

  {
    id: 'grammarInsult',
    name: 'Grammar Insult',
    description: 'Humorously correct grammar mistakes',
    keywords: ['grammar', 'insult', 'correct', 'humor', 'typo'],
    tags: ['specialized', 'grammar', 'fun'],
    examples: [
      'grammar insult',
      'correct grammar',
      'grammar humor',
      'fix typos'
    ],
    category: 'specialized'
  },

  {
    id: 'runBatchAnalysis',
    name: 'Run Batch Analysis',
    description: 'Run batch analysis on data',
    keywords: ['batch', 'analysis', 'run', 'data', 'process'],
    tags: ['development', 'analysis', 'batch'],
    examples: [
      'run batch analysis',
      'batch process',
      'analyze batch',
      'process data'
    ],
    category: 'development'
  },

  {
    id: 'quantumComputing',
    name: 'Quantum Computing',
    description: 'Quantum computing information and simulation',
    keywords: ['quantum', 'computing', 'simulation', 'quantum computer', 'qc'],
    tags: ['specialized', 'quantum', 'science'],
    examples: [
      'quantum computing',
      'quantum simulation',
      'explain quantum',
      'quantum computer'
    ],
    category: 'specialized'
  },

  {
    id: 'queryDatabase',
    name: 'Query Database',
    description: 'Generic database query tool',
    keywords: ['query', 'database', 'sql', 'search', 'data'],
    tags: ['database', 'query', 'generic'],
    examples: [
      'query database',
      'search database',
      'database query',
      'get data'
    ],
    category: 'database'
  },

  {
    id: 'defineWord',
    name: 'Define Word',
    description: 'Get dictionary definitions',
    keywords: ['define', 'word', 'dictionary', 'meaning', 'definition'],
    tags: ['specialized', 'dictionary', 'language'],
    examples: [
      'define word',
      'what does this mean',
      'word definition',
      'dictionary lookup'
    ],
    category: 'specialized'
  },

  {
    id: 'getUserProfile',
    name: 'Get User Profile',
    description: 'Get user profile information',
    keywords: ['user', 'profile', 'get', 'info', 'information'],
    tags: ['admin', 'user', 'profile'],
    examples: [
      'get user profile',
      'show user info',
      'user information',
      'profile data'
    ],
    category: 'admin'
  },

  {
    id: 'bullshitDetector',
    name: 'Bullshit Detector',
    description: 'Detect and analyze misleading information',
    keywords: ['bullshit', 'detector', 'detect', 'misleading', 'analysis'],
    tags: ['specialized', 'analysis', 'fact-check'],
    examples: [
      'detect bullshit',
      'fact check',
      'analyze claim',
      'check validity'
    ],
    category: 'specialized'
  },

  {
    id: 'tweet',
    name: 'Tweet',
    description: 'Post tweets to Twitter/X',
    keywords: ['tweet', 'twitter', 'post', 'social media', 'x'],
    tags: ['specialized', 'social', 'twitter'],
    examples: [
      'post tweet',
      'tweet this',
      'send to twitter',
      'post on X'
    ],
    category: 'specialized'
  },

  {
    id: 'detectBias',
    name: 'Detect Bias',
    description: 'Detect bias in text and content',
    keywords: ['detect', 'bias', 'analyze', 'fairness', 'objectivity'],
    tags: ['specialized', 'analysis', 'bias'],
    examples: [
      'detect bias',
      'analyze bias',
      'check for bias',
      'bias detection'
    ],
    category: 'specialized'
  },

  {
    id: 'psychoAnalysis',
    name: 'Psychoanalysis',
    description: 'Psychological analysis and insights',
    keywords: ['psycho', 'analysis', 'psychology', 'mental', 'analyze'],
    tags: ['specialized', 'psychology', 'analysis'],
    examples: [
      'psychoanalysis',
      'psychological analysis',
      'analyze psychology',
      'mental analysis'
    ],
    category: 'specialized'
  },

  {
    id: 'psychoHistory',
    name: 'Psychohistory',
    description: 'Psychohistorical analysis and prediction',
    keywords: ['psycho', 'history', 'prediction', 'analysis', 'asimov'],
    tags: ['specialized', 'psychology', 'prediction'],
    examples: [
      'psychohistory',
      'psychohistorical analysis',
      'predict trends',
      'historical psychology'
    ],
    category: 'specialized'
  },

  {
    id: 'analyzeLinguisticFeatures',
    name: 'Analyze Linguistic Features',
    description: 'Analyze conversation messages for interesting linguistic features including phonological, morphological, syntactic, semantic, pragmatic, and discourse patterns. Find language patterns in discussions.',
    keywords: ['linguistic', 'linguistics', 'linguisticfeatures', 'analyzeLinguisticFeatures', 'language features', 'language patterns', 'phonology', 'morphology', 'syntax', 'semantics', 'pragmatics', 'discourse', 'grammar', 'speech patterns', 'linguistic analysis'],
    tags: ['analysis', 'language', 'linguistics', 'specialized'],
    examples: [
      'linguistic analysis',
      'do a linguistic analysis',
      'analyze linguistic features',
      'analyzeLinguisticFeatures',
      'use the analyzeLinguisticFeatures tool',
      'linguistic analysis of the above',
      'what linguistic features are in this conversation',
      'find linguistic patterns'
    ],
    category: 'specialized'
  },

  {
    id: 'unsandboxSubmit',
    name: 'Unsandbox Submit',
    description: 'Submit code to unsandbox execution environment',
    keywords: ['unsandbox', 'submit', 'code', 'execute', 'run'],
    tags: ['development', 'code', 'execution'],
    examples: [
      'submit code',
      'execute in unsandbox',
      'run code submission'
    ],
    category: 'development'
  },

  {
    id: 'unsandboxStatus',
    name: 'Unsandbox Status',
    description: 'Check status of code execution in unsandbox',
    keywords: ['unsandbox', 'status', 'check', 'execution', 'progress'],
    tags: ['development', 'code', 'status'],
    examples: [
      'check execution status',
      'unsandbox status',
      'code execution status'
    ],
    category: 'development'
  },

  {
    id: 'sentimentClassification',
    name: 'Sentiment Classification',
    description: 'Classify text sentiment as positive, negative, or neutral using Ax LLM SDK',
    keywords: ['sentiment', 'classify', 'analysis', 'emotion', 'tone', 'positive', 'negative', 'neutral', 'review', 'feedback'],
    tags: ['analysis', 'nlp', 'sentiment', 'text'],
    examples: [
      'analyze sentiment',
      'classify sentiment',
      'is this positive or negative',
      'sentiment analysis',
      'check sentiment of review'
    ],
    category: 'specialized'
  },

  {
    id: 'axllmExecutor',
    name: 'AxLLM Generic Executor',
    description: 'Execute arbitrary AI tasks using dynamic DSL generation with Ax LLM framework. Can handle jokes, summaries, translations, creative content, and more with context awareness.',
    keywords: ['axllm', 'dsl', 'dynamic', 'generic', 'ai', 'joke', 'summarize', 'translate', 'generate', 'creative', 'contextual', 'flexible'],
    tags: ['ai', 'nlp', 'generation', 'analysis', 'flexible'],
    examples: [
      'make a joke about the conversation',
      'axllm tool to generate a joke',
      'summarize this text',
      'create a creative story',
      'translate this to French',
      'extract key points',
      'generate ideas based on context'
    ],
    category: 'specialized'
  },

  // ===== AUTONOMOUS TOOL MANAGEMENT =====
  {
    id: 'createToolAutonomously',
    name: 'Create Tool Autonomously',
    description: 'Create a new tool autonomously based on identified capability gaps. Enables autonomous innovation with strict safety boundaries. Only for simple utility tools (data transformation, calculations, text processing).',
    keywords: ['create', 'tool', 'autonomous', 'build', 'new', 'capability', 'innovation', 'self-improvement', 'utility', 'generate'],
    tags: ['admin', 'autonomous', 'tool-creation', 'innovation'],
    examples: [
      'create a tool to convert JSON to YAML',
      'build a new utility tool',
      'I need a tool that can format phone numbers',
      'create a tool autonomously',
      'make a custom tool'
    ],
    category: 'admin'
  },

  {
    id: 'listAutonomousTools',
    name: 'List Autonomous Tools',
    description: 'View all autonomously created tools with status, usage statistics, and metadata. See what tools Omega has built on its own.',
    keywords: ['list', 'autonomous', 'tools', 'view', 'show', 'created', 'custom', 'self-made', 'statistics'],
    tags: ['admin', 'autonomous', 'monitoring', 'tools'],
    examples: [
      'list autonomous tools',
      'show me tools you created',
      'what tools have you built',
      'list custom tools',
      'show autonomous creations'
    ],
    category: 'admin'
  },

  {
    id: 'manageAutonomousTool',
    name: 'Manage Autonomous Tool',
    description: 'Manage autonomously created tools: enable, disable, validate for safety, or delete them. Provides control over which autonomous tools are active.',
    keywords: ['manage', 'autonomous', 'tool', 'enable', 'disable', 'delete', 'validate', 'control', 'safety'],
    tags: ['admin', 'autonomous', 'management', 'control'],
    examples: [
      'enable autonomous tool',
      'disable that tool',
      'validate tool for safety',
      'delete autonomous tool',
      'manage custom tool'
    ],
    category: 'admin'
  },

  {
    id: 'integrateTpmjsSdk',
    name: 'Integrate TPMJS SDK',
    description: 'Fetch and integrate tools from the TPMJS SDK (https://tpmjs.com/sdk). This tool reads the SDK documentation, parses available tools, and prepares them for integration into Omega\'s tool system. Supports multiple modes: fetch, analyze, and integrate.',
    keywords: ['tpmjs', 'sdk', 'integration', 'fetch', 'tools', 'external', 'api', 'plugin', 'extend', 'import'],
    tags: ['development', 'integration', 'sdk', 'tools', 'admin'],
    examples: [
      'integrate tpmjs sdk',
      'fetch tpmjs tools',
      'analyze tpmjs sdk',
      'import tpmjs sdk',
      'add tpmjs tools to omega'
    ],
    isCore: false,
    category: 'development'
  },

  // ===== TPMJS REGISTRY TOOLS (Core) =====
  {
    id: 'tpmjsRegistrySearch',
    name: 'TPMJS Registry Search',
    description: 'Search the TPMJS registry to find tools for any task. Returns metadata including the toolId needed for execution with tpmjsRegistryExecute. Use this to discover external tools that can extend your capabilities.',
    keywords: ['tpmjs', 'registry', 'search', 'find', 'tools', 'discover', 'external', 'plugin', 'capability', 'extend', 'sdk'],
    tags: ['core', 'registry', 'search', 'tools', 'discovery'],
    examples: [
      'search for image processing tools',
      'find a tool to scrape websites',
      'discover data processing tools',
      'search tpmjs registry',
      'find tools for automation',
      'what tools can do web scraping',
      'search for api integration tools'
    ],
    isCore: true,
    category: 'research'
  },

  {
    id: 'tpmjsRegistryExecute',
    name: 'TPMJS Registry Execute',
    description: 'Execute any tool from the TPMJS registry by its toolId. Tools run in a secure sandbox - no local installation required. Use tpmjsRegistrySearch first to find tools and get their toolIds.',
    keywords: ['tpmjs', 'registry', 'execute', 'run', 'tool', 'external', 'sandbox', 'invoke', 'call', 'sdk'],
    tags: ['core', 'registry', 'execution', 'tools', 'sandbox'],
    examples: [
      'execute tpmjs tool',
      'run external tool',
      'invoke registry tool',
      'execute package::toolName',
      'run tpmjs registry tool',
      'use external tool'
    ],
    isCore: true,
    category: 'development'
  },

  // ===== LLM PROVIDER INTEGRATIONS =====
  {
    id: 'openrouterChat',
    name: 'OpenRouter Chat',
    description: 'Generate chat completions using OpenRouter API. Provides access to multiple LLM providers including Claude, GPT-4, Gemini, Llama, and more through a unified API.',
    keywords: ['openrouter', 'llm', 'chat', 'completion', 'ai', 'model', 'claude', 'gpt', 'gemini', 'llama', 'language model', 'generation'],
    tags: ['ai', 'llm', 'chat', 'generation', 'openrouter'],
    examples: [
      'use openrouter to generate text',
      'chat with claude via openrouter',
      'generate completion with gpt-4',
      'use openrouter for ai generation',
      'access multiple llm models',
      'generate text with openrouter'
    ],
    category: 'specialized'
  },

  // Note: Entries for logFeeling, queryFeelings, and getFeelingSummary
  // are already defined above (lines 745-794)
];

/**
 * Core tools configuration
 * These tools are always included regardless of BM25 ranking
 */
export const CORE_TOOLS: string[] = [
  'search',
  'calculator',
  'unsandbox',
  'webFetch',
  'fileUpload',
  'whoami',
  // TPMJS Registry - Always available for discovering and executing external tools
  'tpmjsRegistrySearch',
  'tpmjsRegistryExecute',
];
