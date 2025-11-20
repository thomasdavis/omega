# Persistent Storage with Railway Volume

This document explains how Omega bot uses Railway's persistent volume for reliable data storage across deployments.

## Overview

Omega bot stores user data, artifacts, and uploads using Railway's persistent volume mounted at `/data`. This ensures that files remain available even after deployments or restarts.

## Storage Structure

```
/data/
├── artifacts/          # Generated artifacts (HTML, SVG, Markdown)
│   ├── {uuid}.html    # Artifact file
│   └── {uuid}.json    # Artifact metadata
└── uploads/           # User-uploaded files
    ├── {filename}     # Uploaded file
    └── {filename}.json # Upload metadata
```

## Implementation

### Centralized Storage Utility

All storage paths are managed through `apps/bot/src/utils/storage.ts`, which provides:

- `getArtifactsDir()` - Returns `/data/artifacts` in production, local path in development
- `getUploadsDir()` - Returns `/data/uploads` in production, local path in development
- `getDataDir(name)` - Returns `/data/{name}` for custom storage needs
- `initializeStorage()` - Ensures all directories exist on startup

### Environment Detection

The bot automatically detects if it's running with a Railway volume:

```typescript
function isProductionWithVolume(): boolean {
  return process.env.NODE_ENV === 'production' && existsSync('/data');
}
```

### Tools Using Persistent Storage

All file-storage tools use the centralized storage utility:

1. **artifact.ts** - Stores generated artifacts (HTML, SVG, calendars)
2. **fileUpload.ts** - Stores user-uploaded files
3. **conversationToSlidev.ts** - Saves Slidev presentation files
4. **generateHtmlPage.ts** - Stores AI-generated HTML pages
5. **listArtifacts.ts** - Lists files from persistent storage
6. **artifactServer.ts** - Serves files from persistent storage

## Railway Configuration

### Volume Setup

1. In Railway dashboard, create a volume for your service
2. Mount point: `/data`
3. Size: 1GB (or as needed)

### Environment Variables

No special environment variables needed - the bot auto-detects the volume.

Optional:
- `ARTIFACT_SERVER_URL` - Base URL for artifact links (defaults to Railway URL)

## Local Development

In development mode (no `/data` directory), files are stored in:
- `apps/bot/artifacts/` - Artifacts
- `apps/bot/public/uploads/` - Uploads

These directories are git-ignored and safe for local testing.

## Benefits

✅ **Reliability** - Files persist across deployments and restarts
✅ **Data Safety** - User uploads and artifacts aren't lost on redeploy
✅ **Consistent URLs** - Artifact links remain valid indefinitely
✅ **Automatic Fallback** - Works seamlessly in development without volume

## Migration Notes

If you're migrating from ephemeral storage:

1. Files created before volume setup will be lost on next deploy
2. Enable the Railway volume before the next deployment
3. The bot will automatically start using `/data` on next startup
4. No code changes needed - storage utility handles everything

## Monitoring Storage

Use the `listArtifacts` tool to see what's stored:
- Lists all artifacts and uploads
- Shows file sizes and creation dates
- Displays storage location (local vs. volume)

## Troubleshooting

### Files not persisting after deployment

**Check:**
1. Railway volume is properly mounted at `/data`
2. Volume has sufficient space
3. Check logs for "Using Railway persistent volume at /data" message

### Local development creating files in production paths

**Solution:**
- Ensure `NODE_ENV !== 'production'` in development
- Storage utility will use local paths automatically

### Permission errors

**Solution:**
- Ensure Railway volume has correct permissions
- Bot process should have read/write access to `/data`

## Future Enhancements

Potential improvements for persistent storage:

- [ ] Database integration for metadata (instead of JSON files)
- [ ] Automatic cleanup of old artifacts
- [ ] Storage quota management
- [ ] File versioning
- [ ] Backup/restore functionality
- [ ] CDN integration for faster artifact delivery
