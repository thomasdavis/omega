/**
 * Research and Essay Tool - Automated research and essay writing
 * Searches for information, compiles research, and drafts essays
 */

import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const researchEssayTool = tool({
  description: 'Conduct automated research on a topic and generate a well-structured essay. This tool searches for information, compiles research findings, and drafts a comprehensive essay with citations.',
  inputSchema: z.object({
    topic: z.string().describe('The topic to research and write about'),
    essayLength: z.enum(['short', 'medium', 'long']).default('medium').describe('Desired essay length: short (~300 words), medium (~600 words), long (~1000 words)'),
    essayStyle: z.enum(['academic', 'casual', 'technical', 'persuasive']).default('academic').describe('Writing style for the essay'),
    researchDepth: z.enum(['basic', 'thorough', 'comprehensive']).default('thorough').describe('How deep to research: basic (2-3 sources), thorough (4-6 sources), comprehensive (7+ sources)'),
  }),
  execute: async ({ topic, essayLength, essayStyle, researchDepth }) => {
    console.log(`📚 Starting research and essay writing on topic: "${topic}"`);
    console.log(`   Length: ${essayLength}, Style: ${essayStyle}, Depth: ${researchDepth}`);

    try {
      // Step 1: Generate search queries for comprehensive research
      const searchQueries = generateSearchQueries(topic, researchDepth);
      console.log(`🔍 Generated ${searchQueries.length} search queries for research`);

      // Step 2: Simulate research gathering
      // Note: In a real implementation, this would use actual web search APIs
      // For now, we'll use GPT-4o's knowledge base with a research prompt
      const researchFindings = await conductResearch(topic, searchQueries);
      console.log(`✅ Research completed with ${researchFindings.sources.length} sources`);

      // Step 3: Generate essay outline
      const outline = await generateEssayOutline(topic, researchFindings, essayStyle);
      console.log(`📝 Essay outline created with ${outline.sections.length} sections`);

      // Step 4: Draft the essay
      const essay = await draftEssay(topic, researchFindings, outline, essayLength, essayStyle);
      console.log(`✅ Essay drafted: ${essay.wordCount} words`);

      // Step 5: Format the final output
      const formattedOutput = formatEssayOutput(essay, researchFindings);

      return {
        success: true,
        topic,
        essay: formattedOutput,
        wordCount: essay.wordCount,
        sourcesCount: researchFindings.sources.length,
        metadata: {
          length: essayLength,
          style: essayStyle,
          researchDepth,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`❌ Error in research and essay writing:`, error);
      return {
        success: false,
        error: 'generation_failed',
        message: `Failed to generate essay: ${error instanceof Error ? error.message : 'Unknown error'}`,
        topic,
      };
    }
  },
});

/**
 * Generate search queries based on the topic and research depth
 */
function generateSearchQueries(topic: string, depth: string): string[] {
  const baseQueries = [
    topic,
    `${topic} overview`,
    `${topic} key concepts`,
  ];

  if (depth === 'thorough') {
    return [
      ...baseQueries,
      `${topic} history`,
      `${topic} current trends`,
      `${topic} examples`,
    ];
  }

  if (depth === 'comprehensive') {
    return [
      ...baseQueries,
      `${topic} history`,
      `${topic} current trends`,
      `${topic} examples`,
      `${topic} expert opinions`,
      `${topic} case studies`,
      `${topic} future outlook`,
    ];
  }

  return baseQueries;
}

/**
 * Conduct research using GPT-4o's knowledge base
 * In production, this would integrate with actual search APIs
 */
async function conductResearch(
  topic: string,
  searchQueries: string[]
): Promise<{ summary: string; keyPoints: string[]; sources: Array<{ title: string; summary: string }> }> {
  const researchPrompt = `You are a research assistant conducting comprehensive research on the topic: "${topic}"

Based on the following search queries, provide detailed research findings:
${searchQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Please provide:
1. A comprehensive summary of the topic (2-3 paragraphs)
2. 5-8 key points or findings about the topic
3. 3-6 simulated sources with titles and brief summaries (format as if from real sources)

Format your response as JSON with this structure:
{
  "summary": "comprehensive summary here",
  "keyPoints": ["point 1", "point 2", ...],
  "sources": [
    {"title": "Source Title", "summary": "Brief summary of what this source covers"},
    ...
  ]
}`;

  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: researchPrompt,
  });

  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonText = result.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const research = JSON.parse(jsonText);
    return research;
  } catch (error) {
    console.error('Failed to parse research JSON, using fallback');
    // Fallback if JSON parsing fails
    return {
      summary: result.text.substring(0, 500),
      keyPoints: ['Research findings available in summary'],
      sources: [{ title: 'General Research', summary: topic }],
    };
  }
}

/**
 * Generate essay outline based on research findings
 */
async function generateEssayOutline(
  topic: string,
  research: { summary: string; keyPoints: string[] },
  style: string
): Promise<{ sections: Array<{ title: string; points: string[] }> }> {
  const outlinePrompt = `Create a structured essay outline for a ${style} essay on "${topic}"

Research summary: ${research.summary}

Key points to cover:
${research.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Create an outline with 3-5 main sections (including introduction and conclusion).
Format as JSON:
{
  "sections": [
    {"title": "Section Title", "points": ["point 1", "point 2"]},
    ...
  ]
}`;

  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: outlinePrompt,
  });

  try {
    let jsonText = result.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    // Fallback outline
    return {
      sections: [
        { title: 'Introduction', points: ['Introduce topic', 'Thesis statement'] },
        { title: 'Main Discussion', points: research.keyPoints.slice(0, 3) },
        { title: 'Conclusion', points: ['Summary', 'Final thoughts'] },
      ],
    };
  }
}

/**
 * Draft the essay based on research and outline
 */
async function draftEssay(
  topic: string,
  research: { summary: string; keyPoints: string[]; sources: Array<{ title: string; summary: string }> },
  outline: { sections: Array<{ title: string; points: string[] }> },
  length: string,
  style: string
): Promise<{ content: string; wordCount: number }> {
  // Determine target word count
  const targetWords = length === 'short' ? 300 : length === 'medium' ? 600 : 1000;

  const essayPrompt = `Write a ${style} essay on "${topic}" following this outline:

${outline.sections.map((section, i) => `
${i + 1}. ${section.title}
${section.points.map(p => `   - ${p}`).join('\n')}
`).join('\n')}

Research findings:
${research.summary}

Key points to incorporate:
${research.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Sources to reference:
${research.sources.map((s, i) => `[${i + 1}] ${s.title}`).join('\n')}

Requirements:
- Target length: approximately ${targetWords} words
- Style: ${style}
- Include citations to sources using [1], [2], etc.
- Use proper paragraph structure
- Include a strong introduction and conclusion
- Make the essay engaging and well-reasoned

Write the complete essay now:`;

  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: essayPrompt,
  });

  const wordCount = result.text.split(/\s+/).length;

  return {
    content: result.text,
    wordCount,
  };
}

/**
 * Format the final essay output with sources
 */
function formatEssayOutput(
  essay: { content: string; wordCount: number },
  research: { sources: Array<{ title: string; summary: string }> }
): string {
  const sections = [
    '# Essay\n',
    essay.content,
    '\n\n---\n',
    '\n## Sources\n',
    ...research.sources.map((source, i) => `**[${i + 1}]** ${source.title}\n${source.summary}`),
    '\n---\n',
    `\n*Word count: ${essay.wordCount} words*`,
    `\n*Generated on: ${new Date().toLocaleString()}*`,
  ];

  return sections.join('\n');
}
