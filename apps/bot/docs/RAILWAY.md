# Railway Deployment Guide

## Build Timestamp Access

The bot generates a `BUILD-TIMESTAMP.txt` file during the build process that contains the Unix timestamp (in seconds) of when the build was created. This file is used to display the build date in the blog footer and other locations.

### Accessing BUILD-TIMESTAMP.txt

After deployment on Railway, the BUILD-TIMESTAMP.txt file is accessible via the artifact server:

```
https://your-railway-app.railway.app/BUILD-TIMESTAMP.txt
```

**Example:**
```bash
curl https://your-railway-app.railway.app/BUILD-TIMESTAMP.txt
```

This returns a plain text Unix timestamp in seconds:
```
1732197280
```

### Build Process

The timestamp is generated during the build process by the `prebuild` script:

1. **Script Location:** `apps/bot/scripts/generate-deployment-info.js`
2. **Runs Before Build:** Configured in `package.json` as `prebuild` script
3. **Output Location:** `apps/bot/public/BUILD-TIMESTAMP.txt`
4. **Format:** Unix timestamp in seconds (integer)

### How It Works

1. During build (`pnpm build`), the `prebuild` script runs first
2. It generates `BUILD-TIMESTAMP.txt` with the current timestamp
3. The build process copies all files from `public/` to `dist/public/`
4. The artifact server serves static files from `dist/public/`
5. The file is accessible at `/BUILD-TIMESTAMP.txt` endpoint

### Integration

The build timestamp is used in several places:

- **Blog Footer:** Displays "Built: [Date]" on all blog pages
- **Artifact Gallery:** Shows build information in the footer
- **Uploads Gallery:** Displays build date
- **Message Browser:** Shows build timestamp
- **Query Browser:** Includes build information

### API Endpoint

The `/BUILD-TIMESTAMP.txt` endpoint is implemented in `src/server/artifactServer.ts`:

```typescript
app.get('/BUILD-TIMESTAMP.txt', (req: Request, res: Response) => {
  try {
    const filepath = join(PUBLIC_DIR, 'BUILD-TIMESTAMP.txt');

    if (existsSync(filepath)) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(readFileSync(filepath, 'utf-8'));
    } else {
      // Fallback to current timestamp if file doesn't exist
      const fallbackTimestamp = Math.floor(Date.now() / 1000);
      res.setHeader('Content-Type', 'text/plain');
      res.send(fallbackTimestamp.toString());
    }
  } catch (error) {
    console.error('Error loading BUILD-TIMESTAMP.txt:', error);
    const fallbackTimestamp = Math.floor(Date.now() / 1000);
    res.setHeader('Content-Type', 'text/plain');
    res.send(fallbackTimestamp.toString());
  }
});
```

### Converting Timestamp

To convert the Unix timestamp to a readable date:

**JavaScript/Node.js:**
```javascript
const timestamp = 1732197280;
const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
console.log(date.toISOString());
// Output: 2025-11-21T14:28:00.000Z
```

**Bash:**
```bash
timestamp=$(curl -s https://your-app.railway.app/BUILD-TIMESTAMP.txt)
date -d "@$timestamp"
```

### Troubleshooting

**Problem:** BUILD-TIMESTAMP.txt not found (404)

**Solution:** Ensure the build process completed successfully and the `copy-assets` script ran:
```bash
# Check if file exists after build
ls -la dist/public/BUILD-TIMESTAMP.txt

# Rebuild if needed
pnpm build
```

**Problem:** Timestamp shows current time instead of build time

**Solution:** The server falls back to current time if the file is missing. Check build logs to ensure `generate-deployment-info.js` ran successfully.

### Railway-Specific Notes

- The artifact server runs on port 3001 by default
- Railway automatically sets `PORT` environment variable
- The file is served from the deployed container's filesystem
- No additional configuration needed for Railway
- The timestamp persists across container restarts (it's part of the built image)

### Related Files

- Build script: `apps/bot/scripts/generate-deployment-info.js`
- Utility module: `apps/bot/src/utils/buildTimestamp.ts`
- Server endpoint: `apps/bot/src/server/artifactServer.ts` (line 458-478)
- Package scripts: `apps/bot/package.json` (prebuild, build, copy-assets)

---

## Environment Variables for Railway

The following environment variables must be configured in Railway for full bot functionality:

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DISCORD_BOT_TOKEN` | Discord bot authentication token | Discord Developer Portal → Bot tab |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | https://platform.openai.com/api-keys |

### Optional Variables

| Variable | Description | Default | Where to Get |
|----------|-------------|---------|--------------|
| `GITHUB_TOKEN` | Personal access token for file uploads to GitHub | None | https://github.com/settings/tokens (requires 'repo' scope) |
| `GITHUB_REPO` | Repository name for file uploads | `thomasdavis/omega` | Your repository name |
| `ARTIFACT_SERVER_URL` | Public URL for artifact previews | Railway URL | Your Railway app URL |
| `ARTIFACT_SERVER_PORT` | Port for artifact server | `3001` | - |
| `NODE_ENV` | Environment mode | `production` | - |

### File Upload Configuration

**IMPORTANT:** To enable GitHub file upload functionality, you must configure:

1. **GITHUB_TOKEN**: Create a Personal Access Token at https://github.com/settings/tokens
   - Select "Generate new token (classic)"
   - Give it a descriptive name like "Omega Bot File Uploads"
   - Check the `repo` scope (Full control of private repositories)
   - Copy the token and add it to Railway environment variables

2. **GITHUB_REPO** (optional): Set to your repository name
   - Default: `thomasdavis/omega`
   - Format: `username/repository`

Without `GITHUB_TOKEN`, the bot will:
- Save files to Railway storage (`/data/uploads`)
- NOT upload to GitHub
- Files will remain in Railway storage only
- Background transfer queue will be unable to migrate files

With `GITHUB_TOKEN` configured, the bot will:
- Save files temporarily to Railway storage
- Upload to GitHub at `file-library/` directory
- Create metadata in `file-library/index.json`
- Automatically clean up Railway storage after successful GitHub upload
- Retry failed uploads with exponential backoff (5s, 15s, 60s)

### Persistent Storage

Railway volume is mounted at `/data` for:
- `/data/uploads` - User-uploaded files (temporary, cleaned up after GitHub upload)
- `/data/artifacts` - Generated artifacts (HTML, SVG, etc.)
- `/data/blog` - Blog posts
- `/data/content-index` - Content metadata

### Setting Environment Variables in Railway

1. Go to your Railway project
2. Click on your service
3. Navigate to "Variables" tab
4. Click "New Variable"
5. Add each variable with its value
6. Railway will automatically redeploy with new variables

### Verifying Configuration

After deployment, check logs for:
- `✅ Using Railway persistent volume at /data` - Storage is configured
- `📦 Saving to Railway storage first...` - File upload starting
- `📤 Uploading to GitHub...` - GitHub integration working
- `✅ Successfully uploaded to GitHub` - Upload complete
- `🗑️ Cleaned up file from Railway` - Cleanup successful

If you see:
- `⚠️ GitHub not configured, file remains in Railway storage` - GITHUB_TOKEN is missing
- `⚠️ GitHub upload failed` - Check GITHUB_TOKEN permissions and rate limits
