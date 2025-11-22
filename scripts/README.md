# Scripts

Utility scripts for the Omega bot project.

## File Transfer Verification

### verify-file-transfer.ts

Verification script for the Railway → GitHub automatic file transfer system.

**Purpose:**
- Verify that uploaded files have been successfully transferred from Railway storage to GitHub
- Check cleanup status of Railway files after transfer
- Identify files that failed to transfer or are stuck in Railway storage
- Provide detailed status of the file storage system

**Usage:**

```bash
# Verify entire system (all files)
pnpm verify-transfers

# Verify specific file(s)
pnpm verify-transfers 7C818909-F331-48DD-926D-66F808477A87_8351cbfa.png
pnpm verify-transfers file1.png file2.jpg file3.pdf
```

**What it checks:**

1. **GitHub Storage:**
   - Reads `file-library/index.json` to see all files in GitHub
   - Shows total file count, total size, and latest upload
   - Displays file metadata (uploader, description, tags, URLs)

2. **Railway Storage:**
   - Scans `/data/uploads` (production) or `apps/bot/public/uploads` (development)
   - Lists files that are still in Railway storage
   - Checks for metadata files (`.json`)

3. **Transfer Status:**
   - ✅ Files successfully in GitHub and cleaned up from Railway
   - ⚠️  Files in GitHub but still in Railway (needs cleanup)
   - ❌ Files in Railway but not in GitHub (failed transfer)

**Example Output:**

```
🔍 Verifying: 7C818909-F331-48DD-926D-66F808477A87_8351cbfa.png
────────────────────────────────────────────────────────────────────────────────
✅ Found in GitHub index
   📝 Original name: photo.png
   📊 Size: 234.56 KB
   📅 Uploaded: 11/22/2025, 2:30:00 PM
   👤 Uploaded by: thomasdavis
   🔗 GitHub URL: https://github.com/thomasdavis/omega/blob/main/file-library/...
   📥 Raw URL: https://raw.githubusercontent.com/thomasdavis/omega/main/file-library/...
   📄 Description: Screenshot of new feature
   🏷️  Tags: screenshot, feature

📦 Still in Railway storage
   📊 Size: 234.56 KB
   📅 Modified: 11/22/2025, 2:29:45 PM
   📋 Metadata exists
   👤 Uploaded by: thomasdavis

⚠️  File transferred to GitHub but NOT cleaned up from Railway
   ℹ️  Cleanup can be done manually using transferRailwayFiles tool with deleteAfterTransfer=true
```

**When to use:**

- After uploading a file to verify it reached GitHub
- To check if Railway cleanup is needed
- To troubleshoot failed transfers
- To audit the storage system
- Before/after running manual transfers

**Requirements:**

- `GITHUB_TOKEN` environment variable must be set
- `GITHUB_REPO` environment variable (defaults to `thomasdavis/omega`)
- Railway volume mounted at `/data` (for production verification)

**Related Documentation:**
- [STORAGE.md](../STORAGE.md) - Complete storage system documentation
- [apps/bot/src/agent/tools/fileUpload.ts](../apps/bot/src/agent/tools/fileUpload.ts) - Automatic transfer implementation
- [apps/bot/src/agent/tools/transferRailwayFiles.ts](../apps/bot/src/agent/tools/transferRailwayFiles.ts) - Manual transfer tool

## Other Scripts

### railway-webhook-proxy.ts

Webhook proxy for Railway deployments.

**Purpose:**
- Proxies webhook events from Railway to Discord
- Logs deployment events and status updates

**Usage:**
- Configured in Railway service settings
- Runs automatically on deployment events
