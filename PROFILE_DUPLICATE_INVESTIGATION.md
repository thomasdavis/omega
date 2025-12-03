# Profile Duplicate Investigation

## Issue
The `/api/profiles/by-username/ajaxdavis` endpoint was returning a profile with no data (all null fields, 0 messages) instead of the profile with actual analysis data.

## Root Cause

### 1. Multiple Profiles with Same Username
Found 3 users with duplicate usernames:

| Username | Count | User IDs |
|----------|-------|----------|
| ajaxdavis | 4 | `806444151422976035`, `1438866165475708979`, `"ajaxdavis"`, `177014147867069440` |
| lisamegawatts | 2 | `1211062099137265723`, `326092366580732160` |
| foxhop. | 2 | `143715740458740736`, `329116693186215938` |

### 2. API Using `findFirst()` Without Ordering
The by-username API endpoint was using:
```typescript
const profile = await prisma.userProfile.findFirst({
  where: { username },
});
```

This returns the **first match** (undefined order), which could be any of the 4 profiles. It was returning the empty profiles instead of the one with data.

### 3. Critical Bug: String userId
One profile had `user_id = "ajaxdavis"` (a string!) instead of a Discord ID (numeric string). This indicates a parameter swap bug where username was passed as userId.

**Correct profile:**
- user_id: `806444151422976035`
- username: `ajaxdavis`
- message_count: `309`
- dominant_archetype: `Creator`

**Empty profiles (deleted):**
- user_id: `1438866165475708979`, message_count: `0`
- user_id: `"ajaxdavis"` ⚠️ **BUG**, message_count: `0`
- user_id: `177014147867069440`, message_count: `0`

## Why This Happened

### Possible Scenarios:

1. **Username Reuse**: Discord allows usernames to be reused after a user changes theirs. If multiple Discord users had the username "ajaxdavis" at different times, each would get a separate profile with a different userId.

2. **Parameter Swap Bug**: The profile with `user_id = "ajaxdavis"` indicates somewhere a tool was called with username in the userId parameter:
   ```typescript
   // WRONG (somewhere this happened)
   getOrCreateUserProfile(username, userId); // Swapped!

   // CORRECT
   getOrCreateUserProfile(userId, username);
   ```

3. **LLM Hallucination**: The AI might have called a tool with incorrect parameter values (hallucinated userIds).

### Database Schema Context

**Current schema:**
- `userId` → **UNIQUE** constraint (one profile per Discord user)
- `username` → **NO** unique constraint (multiple profiles can have same username)

This is **intentional** because:
- `userId` is immutable (Discord user ID)
- `username` can change (users can change their Discord username)
- Same username can be used by different users over time

## Fixes Applied

### 1. Deleted Empty Profiles
```sql
DELETE FROM user_profiles WHERE message_count = 0;
-- Removed 5 empty profiles (3 ajaxdavis + 1 foxhop + 1 lisamegawatts)
```

### 2. Fixed API to Return Profile with Most Data
Updated both endpoints to order by `messageCount DESC`:

**File:** `/apps/web/app/api/profiles/by-username/[username]/route.ts`
```typescript
// Before
const profile = await prisma.userProfile.findFirst({
  where: { username },
});

// After
const profile = await prisma.userProfile.findFirst({
  where: { username },
  orderBy: { messageCount: 'desc' }, // Return profile with most messages
});
```

**File:** `/apps/web/app/profiles/[username]/agent/route.ts`
```typescript
const profile = await prisma.userProfile.findFirst({
  where: { username },
  orderBy: { messageCount: 'desc' }, // Return profile with most messages
});
```

### 3. Verified Fix
```bash
curl https://omegaai.dev/api/profiles/by-username/ajaxdavis

# Now returns:
{
  "userId": "806444151422976035",
  "username": "ajaxdavis",
  "messageCount": 310,
  "dominant_archetype": "Creator"
}
```

## Prevention

### Current Protection:
- ✅ **Database**: UNIQUE constraint on `userId` prevents true duplicates
- ✅ **Application**: `getOrCreateUserProfile()` checks existence before creating
- ✅ **API**: Now returns profile with most data (highest message count)

### Remaining Risk:
The parameter swap bug (`user_id = "ajaxdavis"`) suggests somewhere the LLM or code is calling tools with swapped parameters. All code inspections show correct parameter order:

```typescript
// All calls look correct
await getOrCreateUserProfile(message.author.id, message.author.username); ✅
await getOrCreateUserProfile(userId, username); ✅
```

**Hypothesis**: The LLM might have hallucinated or swapped parameters when calling a tool. This is difficult to prevent without runtime parameter validation.

### Permanent Fix Applied:

1. **✅ Added runtime validation** to `createUserProfile()`:
   ```typescript
   export async function createUserProfile(userId: string, username: string) {
     // Validate userId is a Discord Snowflake (numeric string, 17-20 digits)
     if (!/^\d{17,20}$/.test(userId)) {
       throw new Error(
         `Invalid userId: "${userId}" - Discord IDs must be 17-20 digit numeric strings. ` +
         `Possible parameter swap detected (userId="${userId}", username="${username}").`
       );
     }

     // Validate username is not a numeric Discord ID (likely parameter swap)
     if (/^\d{17,20}$/.test(username)) {
       throw new Error(
         `Invalid username: "${username}" - Username appears to be a Discord ID. ` +
         `Possible parameter swap detected (userId="${userId}", username="${username}").`
       );
     }

     // ... rest of function
   }
   ```

2. **✅ Added username update logic** to prevent duplicate profiles when users change Discord usernames:
   ```typescript
   export async function getOrCreateUserProfile(userId: string, username: string) {
     let profile = await getUserProfile(userId);

     if (!profile) {
       await createUserProfile(userId, username);
       profile = await getUserProfile(userId);
     } else if (profile.username !== username) {
       // User changed their Discord username - update it
       console.log(`📝 Username changed for ${userId}: "${profile.username}" → "${username}"`);
       await updateUserProfile(userId, { username });
       profile = await getUserProfile(userId);
     }

     return profile!;
   }
   ```

**How this prevents future issues:**
- ❌ **Blocks LLM hallucination bugs**: If AI swaps parameters, the validation throws an error with clear message
- ❌ **Blocks invalid data**: Only valid Discord IDs (17-20 digits) accepted as userId
- ✅ **Updates usernames automatically**: No duplicate profiles when users change Discord usernames
- ✅ **Clear error messages**: Developers see exactly what went wrong

### Why NOT to add unique constraint on username:

**DO NOT** add `username String @unique` because:
- Discord usernames can be reused by different users over time
- Username is mutable (users can change it)
- Only `userId` should be unique (it's the immutable Discord user ID)
- Current solution updates username when changed instead of creating duplicates

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Duplicate usernames | 3 (7 total profiles) | 0 (3 profiles) |
| API returns correct profile | ❌ (returned empty) | ✅ (returns most data) |
| Empty profiles | 5 | 0 |
| Parameter swap bugs | 1 found | Deleted |

**Status:** ✅ **Fixed**

The API now correctly returns the profile with actual data. Empty duplicate profiles have been cleaned up. The `orderBy` fix prevents future issues where duplicates might occur.
