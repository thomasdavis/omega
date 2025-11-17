# Evalite Integration for Omega

This directory contains the Evalite integration for automated evaluation and scoring of Omega's AI responses.

## Overview

The Evalite integration provides:

1. **Prompt Abstraction**: Centralized system prompt management for testability
2. **Automated Evaluation**: Automatic scoring of responses for quality, relevance, accuracy, coherence, and helpfulness
3. **Persistent Storage**: Evaluation results stored for querying and analysis
4. **Query Interface**: Discord tool for users to view evaluation data and statistics

## Architecture

### Files

- `promptAbstraction.ts` - Centralized prompt management and versioning
- `evaliteService.ts` - Evalite integration service with evaluation and storage
- `../agent/tools/evaliteQuery.ts` - Discord tool for querying evaluation data

### Data Flow

```
User Message
    ↓
Agent Response
    ↓
Evalite Evaluation (async, non-blocking)
    ↓
Store Results
    ↓
Query via evaliteQuery tool
```

## Usage

### Environment Variables

```bash
# Optional: Disable evaluation (enabled by default)
EVALITE_ENABLED=false

# Optional: Evalite API key (for production use with real Evalite API)
EVALITE_API_KEY=your_api_key_here

# Optional: Evalite API base URL
EVALITE_BASE_URL=https://api.evalite.dev/v1
```

### Querying Evaluation Data

Users can query evaluation data using the `/ask` command in Discord:

```
@omega Show me my recent evaluation scores
@omega What's my average quality score?
@omega Show evaluations from #omega channel with scores above 80
```

The bot will use the `evaliteQuery` tool to:

- Query individual evaluations with filters
- Get summary statistics (averages, distributions)
- View detailed metrics for specific interactions

### Evaluation Metrics

Each response is evaluated on:

- **Quality** (0-100): Overall response quality, structure, and completeness
- **Relevance** (0-100): How well the response addresses the prompt
- **Accuracy** (0-100): Factual correctness and reliability
- **Coherence** (0-100): Logical flow and readability
- **Helpfulness** (0-100): Actionability and usefulness to the user
- **Overall** (0-100): Average of all metrics

## Implementation Notes

### Current State (Phase 1)

The current implementation is a **functional placeholder** that:

- ✅ Provides the abstraction layer for prompts
- ✅ Implements basic evaluation metrics using heuristics
- ✅ Stores evaluations in memory
- ✅ Supports querying and statistics
- ✅ Integrates seamlessly with the agent

### Production Migration (Phase 2)

To migrate to the real Evalite API:

1. **Install Evalite SDK**:
   ```bash
   pnpm add @evalite/sdk
   ```

2. **Update `evaliteService.ts`**:
   ```typescript
   import { Evalite } from '@evalite/sdk';

   const evalite = new Evalite({ apiKey: process.env.EVALITE_API_KEY });

   async evaluateResponse(prompt, response, context) {
     // Replace placeholder with real API call
     const result = await evalite.evaluate({
       prompt,
       response,
       criteria: ['quality', 'relevance', 'accuracy', 'coherence', 'helpfulness']
     });

     // Store using Evalite's storage API
     await evalite.storage.save(result);
   }
   ```

3. **Update query methods** to use Evalite's storage API
4. **Set environment variables** with real Evalite credentials

### Benefits of Abstraction

The abstraction layer provides:

- **Testability**: Prompts can be versioned and tested independently
- **Evaluation**: Responses can be automatically scored for quality
- **Transparency**: Users can query evaluation data for trust and accountability
- **Iteration**: Prompts and evaluations can be improved based on metrics
- **Portability**: Easy migration from placeholder to production Evalite API

## Example Queries

### Query Recent Evaluations
```typescript
const evaluations = await evaliteService.queryEvaluations({
  username: 'john',
  limit: 10
});
```

### Get Statistics
```typescript
const stats = await evaliteService.getStatistics({
  channelName: 'omega',
  startDate: new Date('2025-01-01')
});
```

### Filter by Score
```typescript
const highQuality = await evaliteService.queryEvaluations({
  minScore: 90,
  limit: 20
});
```

## Integration with Agent

The evaluation happens **after** the response is generated and is **non-blocking**:

```typescript
// agent.ts
if (finalText && process.env.EVALITE_ENABLED !== 'false') {
  evaliteService.evaluateResponse(userMessage, finalText, context)
    .catch(error => {
      console.error('[Evalite] Error evaluating response:', error);
    });
}
```

This ensures:
- No delay in response delivery to users
- Evaluation runs asynchronously in the background
- Errors in evaluation don't affect user experience

## Future Enhancements

1. **Real Evalite Integration**: Connect to actual Evalite API for LLM-based evaluation
2. **Persistent Storage**: Use Evalite's storage API or database for long-term persistence
3. **Analytics Dashboard**: Web interface for viewing evaluation trends
4. **A/B Testing**: Compare different prompts using evaluation metrics
5. **Automated Alerts**: Notify when evaluation scores drop below thresholds
6. **User Feedback**: Allow users to rate responses for training evaluation models

## Contributing

When modifying the evaluation system:

1. Update prompt abstraction in `promptAbstraction.ts` for prompt changes
2. Enhance metrics in `evaliteService.ts` for evaluation improvements
3. Add new query filters in `evaliteQuery.ts` for new query capabilities
4. Update this README with any architectural changes

## References

- [Evalite Documentation](https://v1.evalite.dev/)
- [Evalite Quickstart Guide](https://v1.evalite.dev/guides/quickstart/)
- [Evalite Storage API](https://v1.evalite.dev/guides/storage)
