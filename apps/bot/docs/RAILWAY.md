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
