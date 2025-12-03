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
