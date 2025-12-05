# User Feelings Tracking System

A comprehensive system for tracking, analyzing, and visualizing user emotions and moods over time.

## Features

- **Track Feelings**: Log detailed emotional states with intensity, valence, triggers, and context
- **Query History**: Retrieve feelings with flexible filtering by type, time range, intensity, and valence
- **Analytics**: Generate insights including trends, patterns, and emotional distribution
- **Visualization**: UI components for displaying mood charts and timelines

## Database Schema

The `user_feelings` table includes:

- `id` - Unique identifier (UUID)
- `user_id` - User identifier
- `username` - Username (optional)
- `feeling_type` - Type of feeling (e.g., happy, anxious, excited)
- `intensity` - Intensity level (1-10)
- `valence` - Emotional valence (positive/negative/neutral/mixed)
- `notes` - Free-text notes
- `context` - JSON context data
- `triggers` - JSON array of triggers
- `physical_state` - Physical state description
- `mental_state` - Mental state description
- `metadata` - Additional JSON metadata
- `timestamp` - When the feeling occurred (Unix timestamp)
- `created_at` - When the record was created (Unix timestamp)

## Deployment Instructions

### 1. Deploy Database Migration

Run the migration script on Railway:

```bash
# Using Railway CLI
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && bash packages/database/scripts/create-user-feelings-table.sh'

# OR using direct SQL
railway run bash -c 'export DATABASE_URL=$DATABASE_PUBLIC_URL && psql "$DATABASE_URL" < packages/database/scripts/create-user-feelings-table.sql'
```

### 2. Regenerate Prisma Client

After deploying the migration, pull the schema and regenerate the Prisma client:

```bash
cd packages/database
export DATABASE_URL="postgresql://postgres:<password>@switchback.proxy.rlwy.net:11820/railway"
pnpm prisma db pull
pnpm prisma generate
```

### 3. Build and Deploy

```bash
# From project root
pnpm type-check
pnpm build
```

## Tools Available

### createFeeling

Track a user's feeling or mood.

**Example:**
```typescript
{
  userId: "123456",
  username: "john",
  feelingType: "anxious",
  intensity: 7,
  valence: "negative",
  notes: "Worried about the presentation tomorrow",
  triggers: ["work", "deadline"],
  physicalState: "tense",
  mentalState: "scattered"
}
```

### listFeelings

Query feelings history with filtering.

**Example:**
```typescript
{
  userId: "123456",
  feelingType: "anxious",  // optional
  startTimestamp: 1701820800,  // optional
  endTimestamp: 1702425600,  // optional
  minIntensity: 5,  // optional
  limit: 50,
  orderBy: "timestamp",
  orderDirection: "desc"
}
```

### getFeeling

Retrieve a specific feeling entry by ID.

### updateFeeling

Update an existing feeling entry.

### deleteFeeling

Delete a feeling entry.

### analyzeFeelings

Generate analytics and insights from feelings data.

**Returns:**
- Total entries
- Most common feelings
- Valence distribution
- Average intensity overall and by type
- Recent trends
- Insights (dominant valence, most frequent feeling, entries per day)

## UI Components

### FeelingsChart

Bar chart showing feeling type distribution.

```tsx
import { FeelingsChart } from '@repo/ui';

<FeelingsChart feelings={feelingsData} />
```

### FeelingsTimeline

Chronological timeline of feelings.

```tsx
import { FeelingsTimeline } from '@repo/ui';

<FeelingsTimeline feelings={feelingsData} />
```

### FeelingsDashboard

Complete dashboard with charts, timeline, and analytics.

```tsx
import { FeelingsDashboard } from '@repo/ui';

<FeelingsDashboard
  feelings={feelingsData}
  analytics={analyticsData}
/>
```

## Example Usage

### Track a feeling via Discord bot

User: "I'm feeling anxious today, intensity 8"

Bot will use `createFeeling` tool to log the emotion.

### View mood trends

User: "Show me my mood trends from the past week"

Bot will:
1. Use `listFeelings` to get recent entries
2. Use `analyzeFeelings` to generate insights
3. Display results with visualization

### Analyze emotional patterns

User: "Analyze my feelings"

Bot will use `analyzeFeelings` to provide:
- Most common emotions
- Average intensity
- Emotional valence distribution
- Recent trends

## Integration with Existing System

The feelings tracking system integrates with the existing `UserProfile` model:
- `feelings_json` field can store aggregated feelings data
- `UserAnalysisHistory` model includes `feelingsSnapshot` for tracking changes over time
- Tools can cross-reference with sentiment analysis and user profiles

## Security Considerations

- All queries are parameterized to prevent SQL injection
- User data is isolated by `userId`
- Timestamps are stored as Unix timestamps (BigInt) for consistency
- JSON fields use JSONB in PostgreSQL for efficient querying
