# AI SDK v6 Tool Calling Analysis - Discord Bot Issue

## Problem Summary

The Discord bot using AI SDK v6 (beta.99) is only executing tool calls without generating follow-up text commentary. After tools execute, the agent stops instead of continuing with a text response explaining what was done.

## Current Behavior (From Logs)

```
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]✅ Agent completed (2 tool calls)
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]🔍 DEBUG: result.text =
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]🔍 DEBUG: result.finishReason = tool-calls
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]🔍 DEBUG: Total steps = 1
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]🔍 DEBUG: Step 1: {
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]  "finishReason": "tool-calls",
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]  "hasText": false,
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]  "textLength": 0,
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]  "hasContent": true,
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]  "contentLength": 4
2025-11-15T13:50:27Z app[e82dd0ea761e28] syd [info]}
```

### What This Tells Us

1. **Only 1 step executed** - Agent stopped after first tool-calling step
2. **result.text is empty** - No final text response generated
3. **finishReason: "tool-calls"** - Generation stopped at tool execution
4. **No follow-up step** - Model didn't continue to step 2 for commentary

## Expected Behavior (Multi-Step Flow)

With `maxSteps: 50`, the agent should:
1. **Step 1**: Call tools (✅ WORKING - 2 joke tools called)
2. **Step 2**: Generate text response with commentary (❌ NOT HAPPENING - stops after step 1)

## User Request Context

User said: **"tell 2 jokes"**

The bot correctly:
- Called `tellJoke` tool twice (once for classic, once for tech)
- Returned the jokes in tool results
- Sent tool usage reports to Discord

But it did NOT:
- Generate any text commentary explaining what it did
- Provide context about the jokes
- Summarize the results

## Root Cause Analysis

The model is stopping after tool calls with `finishReason: "tool-calls"` instead of continuing to a text generation step. This suggests:

1. **The model considers the task complete** after tools execute
2. **Tool results contain complete answers** (full jokes), so model sees no need for commentary
3. **The agent protocol isn't forcing a follow-up step** after tool execution
4. **System prompt guidance** about tool commentary may not be strong enough

## Current Implementation

### Model Configuration (agent.ts:52)

```typescript
const model = openai.chat('gpt-4.1-mini');
```

### Agent Call (agent.ts)

```typescript
const result = await generateText({
  model,
  system: systemPrompt, // Includes tool commentary guideline
  prompt: enrichedUserMessage,
  tools: {
    tellJoke: tellJokeTool,
    calculator: calculatorTool,
    unsandbox: unsandboxTool,
    webFetch: webFetchTool,
    artifact: artifactTool,
    // ... 13 more tools
  },
  maxSteps: 50, // Allows multi-step reasoning
  // @ts-ignore - onStepFinish callback types differ in beta
  onStepFinish: (step) => {
    // Track tool calls for reporting
  },
});
```

### System Prompt (agent.ts:276-278)

```typescript
You have access to tools that you can use to help users. When you use a tool, the results will be shared with the user in a separate message, so you don't need to restate tool outputs verbatim.

IMPORTANT TOOL USAGE GUIDELINE: When you use tools to complete a user's request, always provide a textual summary or commentary explaining what you did and what the tools accomplished. The tool arguments and results will be displayed separately in dedicated messages, but you should give context about why you used the tools and what the user should understand from the results. Think of it as narrating your actions - explain the reasoning behind tool choices and summarize key takeaways from the results.
```

## AI SDK v6 Agent Protocol Context

From AI SDK v6 documentation:
- Agent protocol uses loop-based execution with `maxSteps`
- Each step can include tool calls OR text generation
- `finishReason: "tool-calls"` means the step ended to execute tools
- The agent should continue to subsequent steps until reaching a natural completion

## Key Questions for ChatGPT

1. **Why does the model stop after tool calls** instead of continuing to a text generation step?

2. **Is `finishReason: "tool-calls"` expected behavior** in AI SDK v6 when tools complete a task?

3. **How can we force a follow-up text response** after tool execution in AI SDK v6?

4. **Should we:**
   - Strengthen the system prompt language?
   - Use a different model (gpt-4.1-mini vs gpt-4o)?
   - Configure agent protocol differently?
   - Add explicit instruction to always return text after tools?

5. **Is there a configuration option** in AI SDK v6's `generateText()` to require text output even when tools are called?

## Relevant Code Files

### `/apps/bot/src/agent/agent.ts`
Main agent implementation with:
- Model configuration (line 52)
- System prompt with tool commentary guideline (lines 276-278)
- generateText() call with maxSteps: 50 (lines ~350-420)
- onStepFinish callback tracking tool usage

### `/apps/bot/src/handlers/messageHandler.ts`
Handles sending responses to Discord:
- Sends main AI response (result.text)
- Sends separate tool usage reports
- Currently result.text is empty when tools are called

## Debug Logging Added

The following debug logging was added to understand the response structure:

```typescript
// Debug: Log the full result structure to understand what we're getting
console.log(`🔍 DEBUG: result.text =`, result.text);
console.log(`🔍 DEBUG: result.finishReason =`, result.finishReason);

// @ts-ignore - steps property exists at runtime
if (result.steps && Array.isArray(result.steps)) {
  // @ts-ignore
  console.log(`🔍 DEBUG: Total steps = ${result.steps.length}`);
  // @ts-ignore
  result.steps.forEach((step, index) => {
    console.log(`🔍 DEBUG: Step ${index + 1}:`, JSON.stringify({
      finishReason: step.finishReason,
      // @ts-ignore
      hasText: !!step.text,
      // @ts-ignore
      textLength: step.text?.length || 0,
      // @ts-ignore
      hasContent: !!step.content,
      // @ts-ignore
      contentLength: step.content?.length || 0,
    }, null, 2));
  });
}
```

## Example Tool Result Structure

From the logs, tool calls and results are properly tracked:

```javascript
[
  {
    "toolName": "tellJoke",
    "args": {
      "category": "random"
    },
    "result": {
      "joke": "What do you call cheese that isn't yours?\n\nNacho cheese!",
      "category": "classic",
      "setup": "What do you call cheese that isn't yours?",
      "punchline": "Nacho cheese!",
      "availableCategories": [...],
      "success": true
    }
  },
  {
    "toolName": "tellJoke",
    "args": {
      "category": "random"
    },
    "result": {
      "joke": "Why do Java developers wear glasses?\n\nBecause they don't C#!",
      "category": "tech",
      "setup": "Why do Java developers wear glasses?",
      "punchline": "Because they don't C#!",
      "availableCategories": [...],
      "success": true
    }
  }
]
```

## AI SDK v6 Dependencies

```json
{
  "ai": "6.0.0-beta.99",
  "@ai-sdk/openai": "^2.0.67"
}
```

## What We Need

A solution to ensure the AI agent:
1. Executes tools when needed (✅ already working)
2. Generates text commentary after tools execute (❌ not working)
3. Provides context and summaries about what was accomplished
4. Uses the multi-step agent protocol properly

The goal is to get `result.text` populated with commentary even when tools are called, not just have empty text with `finishReason: "tool-calls"`.
