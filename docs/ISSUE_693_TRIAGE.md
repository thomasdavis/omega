# Issue #693 Triage Summary

## Bug Classification
- **Type**: Bug - Image Display Failure
- **Priority**: High
- **Component**: Image Generation & Storage System
- **Affected Services**: Web API, Image Storage, Database

---

## Reproduction URLs

To assist with debugging, we need the following information:

1. **Failing Image URL(s)**: [TO BE PROVIDED]
2. **Image ID(s) from Database**: [TO BE PROVIDED]
3. **Discord Message Link** (if applicable): [TO BE PROVIDED]
4. **User Report/Screenshot**: [TO BE PROVIDED]

---

## System Architecture Review

### Image Storage Flow
1. User requests image via tool (e.g., `generateUserImage`)
2. Image generated via Gemini API
3. Image saved to **two locations**:
   - **Filesystem**: `/data/uploads/[filename].png` (Railway volume)
   - **Database**: `generated_images.image_data` (PostgreSQL BYTEA)
4. Metadata saved to database with `public_url`
5. Public URL format: `${OMEGA_API_URL}/uploads/[filename]`

### Serving Mechanism
- **Route**: `/api/uploads/[filename]`
- **Handler**: `apps/web/app/api/uploads/[filename]/route.ts`
- **Reads from**: Filesystem using `getUploadsDir()` helper
- **Fallback**: `/api/generated-images/[id]` can serve from database

---

## Potential Root Causes

Based on codebase analysis, here are the most likely failure scenarios:

### 1. Railway Volume Not Mounted (HIGH PROBABILITY)
**Symptoms:**
- Image works initially but 404s after deployment
- Database has record but file missing

**Diagnosis:**
```bash
railway run bash -c 'ls -lh /data/uploads/ | tail -20'
railway run bash -c 'df -h /data'
```

**Expected**: Files should persist in `/data/uploads/`
**Red Flag**: Directory empty or doesn't exist

---

### 2. Incorrect OMEGA_API_URL (MEDIUM PROBABILITY)
**Symptoms:**
- URL points to wrong domain
- URL format is malformed

**Diagnosis:**
```bash
railway run bash -c 'echo $OMEGA_API_URL'
```

**Expected**: `https://omegaai.dev` or `https://omega-vu7a.onrailway.app`
**Red Flag**: Unset, localhost, or wrong domain

---

### 3. File Save Failed Silently (MEDIUM PROBABILITY)
**Symptoms:**
- Database record exists
- `public_url` is set
- File missing from filesystem
- `image_data` is NULL

**Diagnosis:**
```bash
railway logs --service omega-web | grep -i "image.*saved\|error.*image"
```

**Expected**: "✅ Image saved to: /data/uploads/..."
**Red Flag**: Error messages or missing confirmation

---

### 4. API Route Not Deployed (LOW PROBABILITY)
**Symptoms:**
- File exists in storage
- Database has record
- URL still returns 404

**Diagnosis:**
```bash
curl -I https://omegaai.dev/uploads/[FILENAME]
```

**Expected**: HTTP 200 with `Content-Type: image/png`
**Red Flag**: HTTP 404 or 500

---

### 5. Volume Out of Space (LOW PROBABILITY)
**Symptoms:**
- Recent images fail to save
- Older images work fine

**Diagnosis:**
```bash
railway run bash -c 'df -h /data'
```

**Expected**: < 80% usage
**Red Flag**: 100% or near-full capacity

---

## Investigation Steps

### Step 1: Gather Image Details
```sql
-- Run against production database
SELECT
  id,
  filename,
  public_url,
  artifact_path,
  tool_used,
  created_at,
  created_by_username,
  CASE WHEN image_data IS NOT NULL THEN pg_column_size(image_data) ELSE 0 END as db_size_bytes
FROM generated_images
WHERE [FILTER_CRITERIA]
ORDER BY created_at DESC
LIMIT 10;
```

### Step 2: Check File Existence
```bash
railway run bash -c 'ls -lh /data/uploads/[FILENAME]'
```

### Step 3: Test URL Directly
```bash
curl -I [PUBLIC_URL]
```

### Step 4: Check Logs
```bash
railway logs --service omega-web | grep -A 5 -B 5 "[FILENAME]"
```

---

## Recommended Fixes

### Immediate Actions
1. ✅ Add comprehensive troubleshooting guide (see `/docs/IMAGE_GENERATION_TROUBLESHOOTING.md`)
2. ⏳ Collect specific failing image URLs from user report
3. ⏳ Run diagnostic queries against production database
4. ⏳ Verify Railway volume configuration
5. ⏳ Check `OMEGA_API_URL` environment variable

### Short-term Fixes
1. Add better error logging in image generation tools
2. Implement URL validation before returning to user
3. Add health check endpoint for `/data/uploads` directory
4. Log file save operations with full paths

### Long-term Improvements
1. Implement retry logic for file saves
2. Add monitoring for volume disk usage
3. Create automated tests for image generation flow
4. Add fallback to serve from database if filesystem missing
5. Implement image URL validation in API responses

---

## Next Steps

1. **User to provide**:
   - [ ] Specific failing image URL(s)
   - [ ] Screenshot of error
   - [ ] When the image was generated (timestamp)
   - [ ] Tool used to generate the image

2. **DevOps to check**:
   - [ ] Railway volume mounted at `/data`
   - [ ] `OMEGA_API_URL` environment variable set correctly
   - [ ] Disk space available on volume
   - [ ] Recent deployment logs for errors

3. **Development to implement**:
   - [ ] Enhanced error logging in image tools
   - [ ] URL validation before returning to user
   - [ ] Health check for storage directory
   - [ ] Automated tests for image generation flow

---

## Documentation

- **Full Troubleshooting Guide**: `/docs/IMAGE_GENERATION_TROUBLESHOOTING.md`
- **Storage Documentation**: `/STORAGE.md`
- **Database Guide**: `/CLAUDE.md`

---

**Triaged By**: Claude
**Triage Date**: 2025-12-05
**Issue**: #693
**Severity**: High
**Status**: Awaiting reproduction details
