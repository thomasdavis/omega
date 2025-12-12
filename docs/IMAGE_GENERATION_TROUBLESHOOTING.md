# Image Generation Troubleshooting Guide

## Issue #693: Generated Image Not Displaying

This guide provides a comprehensive troubleshooting checklist for debugging image display issues in the Omega system.

---

## Quick Diagnosis Checklist

### 1. Collect Reproduction Information

**Required Information:**
- [ ] Image ID from database
- [ ] Public URL that's not working
- [ ] Tool used to generate the image (e.g., `generateUserImage`, `generateComic`)
- [ ] Timestamp when image was generated
- [ ] User ID who generated the image
- [ ] Discord message ID (if applicable)
- [ ] Error message displayed to user (if any)

**How to Get Image Details:**

```sql
-- Query generated_images table (legacy system)
SELECT
  id,
  filename,
  public_url,
  artifact_path,
  tool_used,
  created_at,
  created_by_username
FROM generated_images
WHERE id = [IMAGE_ID];

-- Query images table (new system)
SELECT
  i.id,
  i.storage_url,
  i.storage_provider,
  i.created_at,
  i.username,
  ir.tool_name,
  ir.prompt,
  ir.status
FROM images i
LEFT JOIN image_requests ir ON i.request_id = ir.id
WHERE i.id = [IMAGE_ID];
```

---

## Storage Architecture Overview

### File Storage Locations
1. **Railway Volume**: `/data/uploads/` (persistent across deployments)
2. **Local Dev**: `apps/bot/public/uploads/` (development only)
3. **Database**: PostgreSQL `imageData` column (Bytes/BYTEA)

### URL Structure
- **Public URL Format**: `${OMEGA_API_URL}/uploads/${filename}`
- **API Endpoint**: `/api/uploads/[filename]` serves files from filesystem
- **Database Endpoint**: `/api/generated-images/[id]` serves from DB or redirects

### Environment Variables
- `OMEGA_API_URL`: Base URL for public links (default: `https://omegaai.dev`)
- `DATABASE_URL` / `DATABASE_PUBLIC_URL`: PostgreSQL connection
- `NODE_ENV`: Determines storage location (`production` uses `/data`)

---

## Troubleshooting Steps

### Step 1: Verify Database Record

```bash
# Connect to production database
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" -c "SELECT id, filename, public_url, artifact_path, file_size, tool_used, created_at FROM generated_images ORDER BY created_at DESC LIMIT 10;"'
```

**Check:**
- [ ] Record exists in database
- [ ] `filename` field is populated
- [ ] `public_url` field is populated
- [ ] `file_size` is greater than 0 (if `imageData` stored)
- [ ] `artifact_path` points to correct location

**Red Flags:**
- ❌ `public_url` is NULL or empty
- ❌ `filename` doesn't match pattern `user-image-*.png`
- ❌ `artifact_path` points to non-existent path
- ❌ `file_size` is 0 or NULL when `imageData` should exist

---

### Step 2: Check File Existence on Railway Volume

```bash
# List recent uploads
railway run bash -c 'ls -lh /data/uploads/ | tail -20'

# Check specific file
railway run bash -c 'ls -lh /data/uploads/[FILENAME]'

# Check volume size and usage
railway run bash -c 'df -h /data'
```

**Check:**
- [ ] `/data` volume is mounted
- [ ] `/data/uploads/` directory exists
- [ ] Image file exists with expected filename
- [ ] File size is > 0 bytes
- [ ] Volume has free space remaining

**Red Flags:**
- ❌ `/data` not mounted (ephemeral storage being used)
- ❌ File missing from `/data/uploads/`
- ❌ Volume is full (100% usage)
- ❌ Permission errors on `/data/uploads/`

---

### Step 3: Verify OMEGA_API_URL Configuration

```bash
# Check environment variable in production
railway run bash -c 'echo $OMEGA_API_URL'
```

**Expected Values:**
- Production: `https://omegaai.dev` or `https://omega-vu7a.onrailway.app`
- Development: `http://localhost:3000`

**Check:**
- [ ] `OMEGA_API_URL` is set correctly
- [ ] URL uses HTTPS in production
- [ ] Domain is accessible and resolves correctly

**Common Issues:**
- ❌ URL has trailing slash: `https://omegaai.dev/` (should not have slash)
- ❌ Wrong domain or port
- ❌ HTTP instead of HTTPS
- ❌ Using Railway internal URL instead of public URL

---

### Step 4: Test Image API Endpoints

**Test File Serving Endpoint:**
```bash
# Test from command line
curl -I https://omegaai.dev/uploads/[FILENAME]

# Should return:
# HTTP/2 200
# content-type: image/png
# content-length: [FILE_SIZE]
```

**Test Database Endpoint:**
```bash
# Test metadata retrieval
curl https://omegaai.dev/api/generated-images/[IMAGE_ID]

# Should return JSON with image details or binary image data
```

**Check:**
- [ ] `/api/uploads/[filename]` returns 200 status
- [ ] Content-Type header is correct (e.g., `image/png`)
- [ ] Content-Length matches expected file size
- [ ] `/api/generated-images/[id]` returns valid response

**Red Flags:**
- ❌ 404 Not Found (file missing from filesystem)
- ❌ 500 Internal Server Error (server-side issue)
- ❌ 403 Forbidden (permission issue)
- ❌ Wrong Content-Type (e.g., `text/html` instead of `image/png`)

---

### Step 5: Check Storage Service Logs

```bash
# Check recent logs for image generation
railway logs --service omega-web | grep -i "image\|upload\|generate"

# Look for specific error patterns
railway logs --service omega-web | grep -i "error\|failed\|404"
```

**Look for:**
- [ ] "✅ Image saved to:" confirmation messages
- [ ] "💾 Image metadata saved to database" confirmations
- [ ] Storage directory initialization messages
- [ ] Any error messages during image generation

**Red Flags:**
- ❌ "❌ Failed to save image metadata to database"
- ❌ "⚠️ File not found" warnings
- ❌ "❌ Error generating image"
- ❌ "⚠️ Using local storage (ephemeral)" in production
- ❌ Database connection errors

---

### Step 6: Verify Image Generation Tool

Check which tool was used and verify its implementation:

**Common Tools:**
- `generateUserImage` - Uses Gemini API, saves to `/data/uploads`
- `generateComic` - Uses Gemini Comic Service
- `generateUserAvatar` - Avatar generation
- `editUserImage` - Image editing workflow

**Verify Tool Flow:**

```bash
# Check tool implementation
cat packages/agent/src/tools/generateUserImage.ts | grep -A 5 "saveGeneratedImage"
```

**Check:**
- [ ] Tool calls `saveGeneratedImage()` after generation
- [ ] Tool writes file to correct directory (`getUploadsDir()`)
- [ ] Tool constructs `publicUrl` correctly
- [ ] Tool includes all required metadata

---

### Step 7: Check Database Image Storage

Some images are stored directly in the database as BYTEA:

```sql
-- Check if image data is in database
SELECT
  id,
  filename,
  public_url,
  CASE
    WHEN image_data IS NOT NULL THEN pg_column_size(image_data)
    ELSE 0
  END as image_data_size_bytes
FROM generated_images
WHERE id = [IMAGE_ID];
```

**Check:**
- [ ] `image_data` column has data (size > 0)
- [ ] API endpoint `/api/generated-images/[id]` serves binary data
- [ ] Content-Type header matches image format

**If image is in DB but not displaying:**
- Check if API endpoint is returning image data correctly
- Verify MIME type detection in route handler
- Test direct API call with curl/browser

---

## Common Failure Scenarios

### Scenario 1: File Saved but URL 404

**Symptoms:**
- Database record exists
- File exists in `/data/uploads/`
- URL returns 404 Not Found

**Likely Causes:**
1. Wrong `OMEGA_API_URL` in environment
2. Next.js route not deployed correctly
3. Railway routing issue

**Fix:**
1. Verify `OMEGA_API_URL` matches actual domain
2. Redeploy web service
3. Check Railway service domain configuration

---

### Scenario 2: Image Not Persisting After Deployment

**Symptoms:**
- Image works initially
- After redeployment, image 404s
- Database still has record

**Likely Causes:**
1. Railway volume not mounted
2. Files saved to ephemeral storage
3. Volume not attached to correct service

**Fix:**
1. Verify `/data` volume in Railway dashboard
2. Check logs for "Using Railway persistent volume at /data"
3. Mount volume if missing

---

### Scenario 3: Database Has Record but No File

**Symptoms:**
- Database record exists
- `public_url` is set
- File missing from `/data/uploads/`
- `image_data` column is NULL

**Likely Causes:**
1. File save failed silently
2. Storage directory permissions issue
3. Volume ran out of space during save

**Fix:**
1. Check error logs during image generation
2. Verify `/data/uploads/` permissions
3. Check volume disk usage

---

### Scenario 4: Wrong URL Format

**Symptoms:**
- `public_url` doesn't match expected format
- URL has wrong domain or protocol

**Likely Causes:**
1. `OMEGA_API_URL` misconfigured
2. Tool hardcoded wrong URL
3. Environment variable not available during generation

**Fix:**
```bash
# Update OMEGA_API_URL in Railway
railway variables set OMEGA_API_URL=https://omegaai.dev

# Verify it's set correctly
railway run bash -c 'echo $OMEGA_API_URL'
```

---

## Debugging Commands Reference

### Railway CLI Commands

```bash
# Check environment variables
railway variables

# Check logs in real-time
railway logs --service omega-web

# Execute command in production environment
railway run bash -c '[COMMAND]'

# Check volume status
railway run bash -c 'df -h /data && ls -lh /data/uploads/ | tail -20'
```

### Database Queries

```sql
-- Get recent images with full details
SELECT
  id,
  filename,
  public_url,
  artifact_path,
  tool_used,
  model_used,
  created_by_username,
  created_at,
  CASE WHEN image_data IS NOT NULL THEN pg_column_size(image_data) ELSE 0 END as size_bytes
FROM generated_images
ORDER BY created_at DESC
LIMIT 20;

-- Check for images with missing files
SELECT
  id,
  filename,
  public_url,
  created_at
FROM generated_images
WHERE image_data IS NULL
  AND public_url IS NOT NULL
ORDER BY created_at DESC;

-- Count images by tool
SELECT
  tool_used,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM generated_images
GROUP BY tool_used
ORDER BY count DESC;
```

### API Testing

```bash
# Test file endpoint
curl -I https://omegaai.dev/uploads/user-image-1234567890.png

# Test database endpoint
curl https://omegaai.dev/api/generated-images/123 | jq

# Test with verbose output
curl -v https://omegaai.dev/uploads/[FILENAME] 2>&1 | grep -i "content-type\|content-length\|HTTP"
```

---

## Prevention Checklist

To prevent image display issues in the future:

- [ ] Verify Railway volume is mounted at `/data`
- [ ] Set `OMEGA_API_URL` environment variable correctly
- [ ] Monitor volume disk usage (set up alerts at 80%)
- [ ] Add error handling in image generation tools
- [ ] Log image save operations with full paths
- [ ] Test image URLs immediately after generation
- [ ] Implement health check for `/data/uploads` directory
- [ ] Add retry logic for database saves
- [ ] Validate URLs before returning to user

---

## Support Resources

- **Storage Documentation**: `/STORAGE.md`
- **Railway Deployment**: `/RAILWAY_DEPLOYMENT.md`
- **Database Instructions**: `/CLAUDE.md` (Database section)
- **Image Service Code**: `packages/database/src/postgres/imageService.ts`
- **Upload API**: `apps/web/app/api/uploads/[filename]/route.ts`

---

## Report Template

When reporting image display issues, include:

```
**Image Details:**
- Image ID: [ID]
- Filename: [FILENAME]
- Public URL: [URL]
- Tool Used: [TOOL_NAME]
- Generated At: [TIMESTAMP]
- User: [USERNAME]

**Error:**
- HTTP Status: [STATUS_CODE]
- Error Message: [MESSAGE]

**Database Check:**
- Record exists: [YES/NO]
- imageData size: [BYTES]
- publicUrl: [URL]
- artifactPath: [PATH]

**File Check:**
- File exists in /data/uploads: [YES/NO]
- File size: [BYTES]

**Environment:**
- OMEGA_API_URL: [URL]
- Volume mounted: [YES/NO]
- Volume space available: [GB]

**Logs:**
[Relevant log excerpts]
```

---

**Last Updated:** 2025-12-05
**Related Issue:** #693
