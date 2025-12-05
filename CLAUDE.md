- don't take shortcuts
- we are hosted on railway, you can use the railway cli
- we use github, you can use the github cli 


## Database Configuration

### PostgreSQL Connection (Railway)

**External TCP Connection:**
- **Host:** `switchback.proxy.rlwy.net`
- **Port:** `11820`
- **Database:** `railway`
- **User:** `postgres`

**Connection String for External Access:**
```
postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway
```

**Using Prisma DB Pull:**
To introspect the production database and regenerate the Prisma schema:

```bash
# Set the DATABASE_URL to use the TCP proxy
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"

# Navigate to the database package
cd packages/database

# Pull the schema from production
pnpm prisma db pull

# Generate the Prisma client
pnpm prisma generate
```

**Important:** Always use `prisma db pull` when the production database schema changes to keep the Prisma schema in sync with the actual database structure.

### Running Database Migrations on Railway

**Using railway run with shell scripts:**

```bash
# Run migration script using DATABASE_PUBLIC_URL (avoids internal hostname issues)
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-agent-synthesis-table.sh'
```

**Why this works:**
- `railway run` executes in Railway's environment with all env vars available
- `DATABASE_PUBLIC_URL` uses the external TCP proxy (switchback.proxy.rlwy.net)
- Avoids `postgres.railway.internal` hostname resolution errors from local machine

**Alternative - Using Prisma migrations:**

```bash
# Deploy all pending Prisma migrations
railway run bash -c 'cd packages/database && DATABASE_URL=$DATABASE_PUBLIC_URL pnpm prisma migrate deploy'
```

**Alternative - Push schema without migrations:**

```bash
# Quick push for development (not recommended for production)
railway run bash -c 'cd packages/database && DATABASE_URL=$DATABASE_PUBLIC_URL pnpm prisma db push'
```

### Direct Database Operations with Railway CLI

**Execute SQL commands directly on production:**

```bash
# Single SQL command
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "ALTER TABLE table_name ADD COLUMN column_name TYPE;"'

# Multiple commands with heredoc
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" << '\''EOF'\''
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name INTEGER;
ALTER TABLE table_name ALTER COLUMN other_column TYPE TIMESTAMPTZ;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '\''table_name'\'';
EOF'

# Inspect table schema
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '\''table_name'\'' ORDER BY ordinal_position;"'
```

**Common operations:**
- `ALTER TABLE ADD COLUMN` - Add missing columns
- `ALTER TABLE ALTER COLUMN TYPE` - Change column types
- `ALTER TABLE DROP COLUMN` - Remove columns
- `SELECT ... FROM information_schema.columns` - Inspect schema
- Always use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations

### GitHub Actions for Database Migrations

The repository has automated GitHub Actions for database operations:

**1. Automatic Migration on Label (`database-migrate.yml`):**
- When an issue is labeled with `database`, guidance is automatically added
- New migration scripts in `packages/database/scripts/` auto-run on merge to main
- Schema verification runs automatically to detect drift

**2. Manual Migration Workflow:**
```bash
# Go to Actions → "Database - Run Migrations" → Run workflow
# Options:
#   - migration_sql: Raw SQL to execute
#   - migration_script: Path to script in packages/database/scripts/
#   - dry_run: Validate without executing
```

**3. Database Label Behavior:**
When creating GitHub issues with the `database` label:
- Auto-detected from keywords: track, store, analytics, leaderboard, history, etc.
- Triggers Claude Code to implement with database-first approach
- Adds migration guidance comments automatically
- Requires database acceptance criteria in PRs

**Creating Database-Aware Issues:**
The `githubCreateIssue` tool auto-detects database requirements and:
- Adds the `database` label automatically
- Includes a Database Requirements section template
- Provides migration SQL examples
- Triggers the database workflow

**Required GitHub Secrets for Database Actions:**
- `DATABASE_PUBLIC_URL`: PostgreSQL connection string (external TCP proxy)
