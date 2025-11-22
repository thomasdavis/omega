# File Library

This directory stores user-uploaded files from the Omega Discord bot.

## Purpose

When users upload files through Discord (images, documents, code files, etc.), the bot:
1. Downloads the file from Discord's CDN
2. Saves it temporarily to Railway storage (`/data/uploads`)
3. Uploads it to this GitHub directory for permanent storage
4. Cleans up the temporary file from Railway

## Structure

```
file-library/
├── index.json          # Master index of all uploaded files with metadata
├── image1.png          # Uploaded files
├── document.pdf
└── ...
```

## Index Format

The `index.json` file maintains metadata for all uploaded files:

```json
[
  {
    "id": "abc123",
    "filename": "background_photo_b8c7e5a4.png",
    "originalName": "background photo.png",
    "size": 524288,
    "extension": ".png",
    "mimeType": "image/png",
    "uploadedAt": "2025-11-22T07:30:00.000Z",
    "uploadedBy": "username",
    "githubUrl": "https://github.com/thomasdavis/omega/blob/main/file-library/background_photo_b8c7e5a4.png",
    "rawUrl": "https://raw.githubusercontent.com/thomasdavis/omega/main/file-library/background_photo_b8c7e5a4.png",
    "description": "User uploaded background image",
    "tags": ["image", "background"]
  }
]
```

## Features

- **Automatic Upload**: Files uploaded via Discord are automatically saved here
- **Metadata Tracking**: Each file has comprehensive metadata (uploader, timestamp, tags, description)
- **Searchable Index**: The index.json allows listing and searching uploaded files
- **Version Control**: All uploads tracked in git history
- **Permanent Storage**: Files persist across deployments unlike Railway's ephemeral storage
- **Shareable URLs**: Direct GitHub and raw.githubusercontent.com URLs for each file

## Security

- **File Type Validation**: Only whitelisted file extensions are allowed
- **Size Limits**: Maximum 25MB per file (Discord's attachment limit)
- **Filename Sanitization**: All filenames are sanitized to prevent directory traversal
- **Unique Filenames**: UUID suffixes prevent collisions

## Bot Commands

Users can interact with uploaded files using:
- **Upload**: Attach a file to a Discord message and the bot will save it
- **List Files**: Use the `listUploadedFiles` tool to see all uploaded files
- **Transfer**: Use `transferRailwayFiles` tool to manually migrate Railway files to GitHub

## Configuration

The bot requires the following environment variables:
- `GITHUB_TOKEN`: Personal access token with 'repo' scope
- `GITHUB_REPO`: Repository name (default: thomasdavis/omega)

## Automatic Cleanup

After successful upload to GitHub:
1. File is removed from Railway storage (`/data/uploads`)
2. Metadata JSON is removed from Railway storage
3. Only the GitHub copy remains for permanent storage

## Retry Logic

If GitHub upload fails:
1. File remains in Railway storage
2. Background transfer is scheduled
3. Retries: 3 attempts with delays of 5s, 15s, 60s
4. If all retries fail, file stays in Railway for manual transfer

## Monitoring

Check logs for upload status:
- `📦 Saving to Railway storage first...` - Initial save
- `📤 Uploading to GitHub...` - GitHub upload in progress
- `✅ Successfully uploaded to GitHub` - Upload complete
- `🗑️ Cleaned up file from Railway` - Cleanup complete
- `⚠️ GitHub upload failed` - Upload failed (will retry)

## File Size

This directory should be monitored for size. Consider:
- Periodic cleanup of old/unused files
- CDN integration for large files
- Compression for images/documents

## Related Files

- `/apps/bot/src/agent/tools/fileUpload.ts` - Main upload tool
- `/apps/bot/src/agent/tools/transferRailwayFiles.ts` - Manual transfer tool
- `/apps/bot/src/agent/tools/listUploadedFiles.ts` - List files tool
- `/apps/bot/src/utils/storage.ts` - Storage utilities
- `/STORAGE.md` - Storage architecture documentation
