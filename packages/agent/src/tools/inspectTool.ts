/**
 * Inspect Tool - Analyzes and inspects other tools' internal workings
 * Provides transparency and understanding of tool capabilities and design
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OMEGA_MODEL } from '@repo/shared';

// Map of available tools to their file paths
const TOOL_FILE_MAP: Record<string, string> = {
  search: 'search.ts',
  calculator: 'calculator.ts',
  weather: 'weather.ts',
  githubCreateIssue: 'github.ts',
  githubUpdateIssue: 'github.ts',
  githubCloseIssue: 'github.ts',
  listRepositoryFiles: 'listRepositoryFiles.ts',
  webFetch: 'webFetch.ts',
  unsandbox: 'unsandbox.ts',
  unsandboxSubmit: 'unsandbox.ts',
  unsandboxStatus: 'unsandbox.ts',
  researchEssay: 'researchEssay.ts',
  asciiGraph: 'asciiGraph.ts',
  renderChart: 'renderChart.ts',
  artifact: 'artifact.ts',
  whoami: 'whoami.ts',
  linuxAdvantages: 'linuxAdvantages.ts',
  fileUpload: 'fileUpload.ts',
  listUploadedFiles: 'listUploadedFiles.ts',
  transferRailwayFiles: 'transferRailwayFiles.ts',
  exportConversation: 'exportConversation.ts',
  jsonAgentGenerator: 'jsonAgentGenerator.ts',
  hackerNewsPhilosophy: 'hackerNewsPhilosophy.ts',
  moodUplifter: 'moodUplifter.ts',
  tellJoke: 'tellJoke.ts',
  generateHtmlPage: 'generateHtmlPage.ts',
  recipeGenerator: 'recipeGenerator.ts',
  ooda: 'ooda.ts',
  listArtifacts: 'listArtifacts.ts',
  codeQuery: 'codeQuery.ts',
  conversationToSlidev: 'conversationToSlidev.ts',
  getOmegaManifest: 'getOmegaManifest.ts',
  buildSlidevPresentation: 'buildSlidevPresentation.ts',
  createBlogPost: 'createBlogPost.ts',
  updateBlogPost: 'updateBlogPost.ts',
  listBlogPosts: 'listBlogPosts.ts',
  queryMessages: 'queryMessages.ts',
  translateToSpanish: 'translateToSpanish.ts',
  generateUserImage: 'generateUserImage.ts',
  editUserImage: 'editUserImage.ts',
  imageEditor: 'imageEditor.ts',
  advancedImageEditingWithContext: 'advancedImageEditingWithContext.ts',
  marketPrediction: 'marketPrediction.ts',
  triggerDailyBlog: 'triggerDailyBlog.ts',
  commitFile: 'commitFile.ts',
  uploadAndCommitFile: 'uploadAndCommitFile.ts',
  summarizeCommits: 'summarizeCommits.ts',
  introspectFeelings: 'introspectFeelings.ts',
  createLiveDocument: 'createLiveDocument.ts',
  readLiveDocument: 'readLiveDocument.ts',
  reportMissingTool: 'reportMissingTool.ts',
  reportMessageAsIssue: 'reportMessageAsIssue.ts',
};

interface ToolAnalysis {
  toolName: string;
  fileName: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  keyFunctions: string[];
  processes: string[];
  desiredOutcomes: string[];
  dependencies: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  category: string;
  summary: string;
}

/**
 * Extract tool code from file
 */
function getToolCode(toolName: string): { code: string; fileName: string } | null {
  const fileName = TOOL_FILE_MAP[toolName];
  if (!fileName) {
    return null;
  }

  try {
    const toolsDir = join(process.cwd(), 'apps/bot/src/agent/tools');
    const filePath = join(toolsDir, fileName);
    const code = readFileSync(filePath, 'utf-8');
    return { code, fileName };
  } catch (error) {
    console.error(`❌ Error reading tool file for ${toolName}:`, error);
    return null;
  }
}

/**
 * Analyze tool code using AI
 */
async function analyzeToolWithAI(toolName: string, code: string, fileName: string): Promise<ToolAnalysis> {
  const model = openai.chat(OMEGA_MODEL);

  const prompt = `Analyze this TypeScript tool implementation and extract key information.

Tool Name: ${toolName}
File: ${fileName}

Code:
\`\`\`typescript
${code}
\`\`\`

Provide a structured analysis in JSON format with the following fields:

{
  "description": "Brief description of what the tool does (1-2 sentences)",
  "parameters": [
    {
      "name": "parameterName",
      "type": "string|number|boolean|array|object",
      "required": true|false,
      "description": "What this parameter does"
    }
  ],
  "keyFunctions": ["List of main functions/methods used in the tool"],
  "processes": ["Step-by-step processes the tool follows"],
  "desiredOutcomes": ["What the tool aims to achieve"],
  "dependencies": ["External dependencies and APIs used (e.g., 'OpenAI API', 'File System', 'GitHub API')"],
  "complexity": "simple|moderate|complex",
  "category": "Category of the tool (e.g., 'AI Generation', 'Data Retrieval', 'File Management', 'Integration', 'Utility')",
  "summary": "Comprehensive 2-3 sentence summary of the tool's functionality, design, and purpose"
}

IMPORTANT:
- Extract parameters from the Zod schema (z.object definition)
- Identify all key functions and helper functions
- Describe the step-by-step process
- Identify what successful execution looks like
- List all external dependencies and APIs
- Classify complexity based on code length and logic complexity
- Output ONLY valid JSON, no explanations or markdown`;

  const result = await generateText({
    model,
    prompt,
    temperature: 0.3, // Lower temperature for more consistent structured output
  });

  // Parse the AI response
  try {
    // Try to extract JSON from the response
    let jsonText = result.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const analysis = JSON.parse(jsonText);

    return {
      toolName,
      fileName,
      ...analysis,
    };
  } catch (error) {
    console.error('❌ Error parsing AI analysis:', error);
    console.error('Raw response:', result.text);

    // Fallback to basic analysis
    return {
      toolName,
      fileName,
      description: 'Unable to parse detailed analysis',
      parameters: [],
      keyFunctions: [],
      processes: [],
      desiredOutcomes: [],
      dependencies: [],
      complexity: 'moderate',
      category: 'Unknown',
      summary: 'Analysis failed - unable to parse tool structure',
    };
  }
}

/**
 * Format analysis for display
 */
function formatAnalysis(analysis: ToolAnalysis): string {
  let output = `# Tool Inspection: ${analysis.toolName}\n\n`;
  output += `**File:** ${analysis.fileName}\n`;
  output += `**Category:** ${analysis.category}\n`;
  output += `**Complexity:** ${analysis.complexity}\n\n`;

  output += `## Description\n${analysis.description}\n\n`;

  output += `## Summary\n${analysis.summary}\n\n`;

  if (analysis.parameters.length > 0) {
    output += `## Parameters\n`;
    for (const param of analysis.parameters) {
      output += `- **${param.name}** (${param.type})${param.required ? ' *required*' : ' *optional*'}`;
      if (param.description) {
        output += `: ${param.description}`;
      }
      output += '\n';
    }
    output += '\n';
  }

  if (analysis.keyFunctions.length > 0) {
    output += `## Key Functions\n`;
    for (const func of analysis.keyFunctions) {
      output += `- ${func}\n`;
    }
    output += '\n';
  }

  if (analysis.processes.length > 0) {
    output += `## Processes\n`;
    for (let i = 0; i < analysis.processes.length; i++) {
      output += `${i + 1}. ${analysis.processes[i]}\n`;
    }
    output += '\n';
  }

  if (analysis.desiredOutcomes.length > 0) {
    output += `## Desired Outcomes\n`;
    for (const outcome of analysis.desiredOutcomes) {
      output += `- ${outcome}\n`;
    }
    output += '\n';
  }

  if (analysis.dependencies.length > 0) {
    output += `## Dependencies\n`;
    for (const dep of analysis.dependencies) {
      output += `- ${dep}\n`;
    }
    output += '\n';
  }

  return output;
}

export const inspectToolTool = tool({
  description: `Inspect and analyze other tools' internal workings to improve transparency and understanding.

  This meta-tool analyzes the structure, functionality, and design of other tools by:
  - Reviewing what the tool does
  - Analyzing each function and process
  - Extracting key entities and components
  - Identifying desired outcomes
  - Summarizing tool capabilities

  Use this to understand how tools work, what they can do, and how they're implemented.

  Use cases:
  - "How does the search tool work?"
  - "Inspect the artifact tool"
  - "Analyze the generateHtmlPage tool"
  - "What does the unsandbox tool do?"`,

  inputSchema: z.object({
    toolName: z.string().describe('Name of the tool to inspect (e.g., "search", "calculator", "artifact")'),

    includeCode: z.boolean().default(false).describe('Whether to include the actual source code in the response'),

    focusArea: z.enum(['all', 'parameters', 'processes', 'dependencies', 'summary'])
      .default('all')
      .describe('Focus on a specific aspect of the tool analysis'),
  }),

  execute: async ({ toolName, includeCode, focusArea }) => {
    console.log(`🔍 Inspecting tool: ${toolName} (includeCode=${includeCode}, focus=${focusArea})`);

    try {
      // Check if tool exists
      if (!TOOL_FILE_MAP[toolName]) {
        const availableTools = Object.keys(TOOL_FILE_MAP).sort();
        return {
          success: false,
          error: `Tool "${toolName}" not found`,
          availableTools,
          hint: `Try one of these tools: ${availableTools.slice(0, 10).join(', ')}...`,
        };
      }

      // Get tool code
      const toolData = getToolCode(toolName);
      if (!toolData) {
        return {
          success: false,
          error: `Unable to read source code for tool "${toolName}"`,
        };
      }

      // Analyze the tool
      console.log(`📊 Analyzing tool with AI...`);
      const analysis = await analyzeToolWithAI(toolName, toolData.code, toolData.fileName);

      // Format the analysis
      const formattedAnalysis = formatAnalysis(analysis);

      console.log(`✅ Tool inspection complete for ${toolName}`);

      return {
        success: true,
        toolName,
        fileName: toolData.fileName,
        analysis: formattedAnalysis,
        structuredData: analysis,
        sourceCode: includeCode ? toolData.code : undefined,
        note: includeCode
          ? 'Source code included - use with caution as it may be lengthy'
          : 'Source code not included - set includeCode=true to view it',
      };
    } catch (error) {
      console.error(`❌ Error inspecting tool ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool inspection failed',
      };
    }
  },
});
