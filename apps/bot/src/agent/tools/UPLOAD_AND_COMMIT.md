# Upload and Commit File Tool

## Overview

The `uploadAndCommitFile` tool provides an automated workflow for uploading files from Discord attachments directly to the GitHub repository with explicit commit handling.

## Purpose

This tool was created to address issue #288, which requested an automated way to commit uploaded files to the repository. While the existing `fileUpload` tool already uploaded files to GitHub, it used the Contents API which created implicit commits. This new tool provides:

1. **Explicit commit control** - Uses Git Objects API for fine-grained control
2. **Atomic commits** - File and index update in a single commit
3. **Better commit messages** - Includes metadata like uploader, description
4. **Commit verification** - Returns commit SHA and URL for verification

## Workflow

```
Discord Attachment → Download → Validate → Upload to GitHub → Update Index → Atomic Commit → Return URLs
```

### Step-by-step:

1. **Download**: Fetches file from Discord attachment URL
2. **Validate**: Checks file type (whitelist) and size (max 25MB)
3. **Generate filename**: Creates collision-proof filename with UUID
4. **Create blobs**: Creates Git blobs for both file and updated index
5. **Create tree**: Creates Git tree with both blobs
6. **Create commit**: Single atomic commit with descriptive message
7. **Update branch**: Updates main branch reference
8. **Return**: Returns file URL, raw URL, commit URL, and commit SHA

## Usage

The agent will automatically use this tool when a user uploads a file to Discord and wants it committed to the repository.

### Example scenario:

**User**: *uploads image.png* "Please save this to the repository"

**Agent**: Uses `uploadAndCommitFile` tool with:
- `fileUrl`: Discord CDN URL
- `originalName`: "image.png"
- `mimeType`: "image/png"
- `uploadedBy`: "username"
- `description`: "User uploaded image for project"
- `tags`: ["user-upload", "image"]

**Result**:
- File saved to `file-library/image_abc123.png`
- Index updated at `file-library/index.json`
- Single commit created with message: "Upload image.png by username"
- Returns GitHub URLs and commit details

## Differences from `fileUpload` tool

| Feature | fileUpload | uploadAndCommitFile |
|---------|-----------|---------------------|
| API Used | GitHub Contents API | Git Objects API |
| Commits | 2 separate (file, then index) | 1 atomic commit |
| Control | Implicit | Explicit |
| Commit Message | Generic | Descriptive with metadata |
| Returns | File URLs | File URLs + Commit details |
| Use Case | Legacy, simple uploads | New, controlled uploads |

## Security

- **Whitelist validation**: Only allowed file extensions
- **Size limits**: Max 25MB per file
- **Filename sanitization**: Prevents directory traversal
- **UUID collision prevention**: No filename conflicts
- **Git Objects API**: Direct repository control

## Allowed File Types

Images, documents, data files, archives, code, media files, and more. See the `ALLOWED_EXTENSIONS` constant in the code for the full list.

## Future Enhancements

Potential improvements:
- Batch uploads (multiple files in one commit)
- Custom branch targeting
- File deletion support
- Rename/move operations
- PR-based uploads for review

## Related Tools

- `fileUpload`: Legacy tool using Contents API
- `commitFile`: Generic file commit tool
- `listUploadedFiles`: List files in the index
- `transferRailwayFiles`: Migrate Railway storage to GitHub

## Example Output

```json
{
  "success": true,
  "filename": "example_abc123.png",
  "originalName": "example.png",
  "size": 245678,
  "sizeFormatted": "239.92 KB",
  "extension": ".png",
  "mimeType": "image/png",
  "uploadedBy": "username",
  "description": "Example image upload",
  "tags": ["example", "image"],
  "fileUrl": "https://github.com/thomasdavis/omega/blob/main/file-library/example_abc123.png",
  "rawUrl": "https://raw.githubusercontent.com/thomasdavis/omega/main/file-library/example_abc123.png",
  "commitUrl": "https://github.com/thomasdavis/omega/commit/abc1234567890",
  "commitSha": "abc1234567890",
  "message": "✅ File uploaded and committed successfully!..."
}
```

## Implementation Details

### Git Objects API Flow

1. **Get latest commit SHA** from branch ref
2. **Get base tree SHA** from commit
3. **Create file blob** (base64 encoded)
4. **Create index blob** (JSON string)
5. **Create tree** with both blobs
6. **Create commit** with tree and parent
7. **Update branch ref** to new commit

This approach gives us atomic commits and full control over the Git history.

## Testing

To test this tool:

1. Upload a file in Discord
2. Ask the agent to save it: "@Omega please save this file to the repository"
3. Agent should use `uploadAndCommitFile` tool
4. Verify the commit appears in GitHub with correct message
5. Verify file is accessible via the returned URLs
6. Check that `file-library/index.json` is updated

## Troubleshooting

**"GitHub token not configured"**
- Ensure `GITHUB_TOKEN` env var is set
- Token needs repo write permissions

**"File type not allowed"**
- Check file extension against `ALLOWED_EXTENSIONS`
- Add new extension if needed (security review required)

**"File size exceeds maximum"**
- Files over 25MB not allowed (Discord limit)
- Consider using file compression or splitting

**"Failed to create commit"**
- Check GitHub API status
- Verify token permissions
- Check branch protection rules

## References

- GitHub REST API: Git Data
- Issue #288: Add automated commit tool
- AI SDK v6 Tool Calling Guide
