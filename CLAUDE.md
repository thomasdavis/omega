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
