#!/bin/bash
# Add user_id and github_issue_number columns to todo_list table
# Usage: ./add-todo-github-columns.sh

set -e

if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: DATABASE_URL or POSTGRES_URL environment variable not set"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "🚀 Adding user_id and github_issue_number columns to todo_list table..."

psql "$DB_URL" << 'EOF'
-- Add user_id column
ALTER TABLE todo_list ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Add github_issue_number column
ALTER TABLE todo_list ADD COLUMN IF NOT EXISTS github_issue_number INTEGER;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_todo_user ON todo_list(user_id);

-- Create index on github_issue_number
CREATE INDEX IF NOT EXISTS idx_todo_github_issue ON todo_list(github_issue_number);

-- Verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'todo_list'
AND column_name IN ('user_id', 'github_issue_number')
ORDER BY ordinal_position;
EOF

echo "✅ Migration completed successfully!"
