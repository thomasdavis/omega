/**
 * Generate Marketing Copy Tool - Creates engaging marketing content for product releases
 *
 * Features:
 * - AI-generated marketing copy tailored for product releases
 * - Multiple content types (press release, email, social media, landing page)
 * - Tone customization (professional, casual, enthusiastic, technical)
 * - Highlights key features, benefits, and call-to-actions
 * - Perfect for announcements, promotions, and launches
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '@repo/shared';

// Available content types
const CONTENT_TYPES = [
  'press_release',
  'email',
  'social_media',
  'landing_page',
  'blog_post',
  'product_description',
] as const;

type ContentType = typeof CONTENT_TYPES[number];

// Available tones
const TONES = [
  'professional',
  'casual',
  'enthusiastic',
  'technical',
  'conversational',
  'executive',
] as const;

type Tone = typeof TONES[number];

/**
 * Generate marketing copy using AI
 */
async function generateMarketingCopy(
  productName: string,
  contentType: ContentType,
  tone: Tone,
  keyFeatures?: string[],
  targetAudience?: string,
  callToAction?: string,
  additionalContext?: string
): Promise<{
  title: string;
  copy: string;
  contentType: string;
  tone: string;
  analysis: string;
}> {
  // Build content-type specific guidance
  const contentTypeGuidance: Record<ContentType, string> = {
    press_release: `Create a professional press release following these guidelines:
- Start with a compelling headline and dateline
- Lead paragraph: Who, What, When, Where, Why
- Body paragraphs: Expand on key features and benefits
- Include a quote from a company spokesperson or executive
- Add boilerplate company information at the end
- Professional, newsworthy tone
- Focus on the story and significance
- 300-500 words typical length`,

    email: `Create an engaging email announcement following these guidelines:
- Compelling subject line (include this separately)
- Personalized greeting
- Hook: Grab attention in the first sentence
- Clear value proposition in the opening
- Highlight 2-4 key benefits with brief explanations
- Social proof or credibility elements if applicable
- Strong, clear call-to-action
- Professional but conversational tone
- Easy to scan with short paragraphs
- Sign-off and contact information`,

    social_media: `Create punchy social media copy following these guidelines:
- Multiple versions for different platforms (Twitter/X, LinkedIn, Facebook)
- Twitter/X: Concise, impactful (280 characters max)
- LinkedIn: Professional but engaging (up to 3000 characters, but aim for 150-300)
- Facebook: Conversational and visual (up to 500 characters)
- Include relevant hashtags for each platform
- Call-to-action that drives engagement
- Emoji usage appropriate to platform and tone
- Link placement suggestions`,

    landing_page: `Create compelling landing page copy following these guidelines:
- Attention-grabbing headline (H1) that communicates core benefit
- Subheadline that elaborates or adds urgency
- Opening paragraph: Clear value proposition
- Features section: 3-5 key features with benefits-focused descriptions
- Benefits section: How it solves problems or improves life
- Social proof placeholder (testimonials, stats, logos)
- Clear, prominent call-to-action (multiple placements)
- FAQs or objection handling
- Urgency or scarcity element if appropriate
- Structured for conversion optimization`,

    blog_post: `Create an engaging blog post announcement following these guidelines:
- SEO-friendly headline that includes key terms
- Engaging introduction that sets context
- Problem/solution framework
- Detailed feature explanations with real-world applications
- Use cases and examples
- Visuals/media suggestions (screenshots, diagrams)
- Personal or company insights
- Clear next steps and call-to-action
- Internal/external link suggestions
- Conversational yet informative tone
- 500-800 words typical length`,

    product_description: `Create a compelling product description following these guidelines:
- Short, benefit-driven opening hook (1-2 sentences)
- Core value proposition
- Key features list with benefit explanations
- Technical specifications (if applicable)
- Use cases and who it's for
- What makes it unique/different
- Trust signals (quality, support, guarantees)
- Clear call-to-action
- SEO-friendly but natural language
- Scannable format with bullet points
- 150-300 words typical length`,
  };

  // Build tone-specific guidance
  const toneGuidance: Record<Tone, string> = {
    professional: `Professional tone characteristics:
- Formal, polished language
- Industry-standard terminology
- Authoritative and credible
- Focus on facts, data, and proven benefits
- Third-person perspective where appropriate
- Avoid slang, emoji, or overly casual phrasing
- Emphasis on expertise and reliability`,

    casual: `Casual tone characteristics:
- Friendly, approachable language
- Use "you" and "your" to speak directly to reader
- Conversational phrasing
- Simple, clear explanations
- Light humor or personality when appropriate
- Relatable examples and analogies
- Warm and accessible`,

    enthusiastic: `Enthusiastic tone characteristics:
- Energetic, exciting language
- Strong, positive adjectives
- Exclamation points (used strategically)
- Emphasis on innovation and transformation
- Paint the vision of what's possible
- Create sense of opportunity and momentum
- Contagious excitement without being pushy`,

    technical: `Technical tone characteristics:
- Precise, accurate terminology
- Specific technical details and specifications
- Focus on how it works, not just what it does
- Detailed feature explanations
- Industry-specific language appropriate for expert audience
- Data-driven benefits
- Clear, logical structure`,

    conversational: `Conversational tone characteristics:
- Natural, speaking-voice style
- Questions and answers format
- Direct address to reader
- Short sentences and paragraphs
- Contractions and informal phrasing
- Story-telling elements
- Like talking to a friend or colleague`,

    executive: `Executive tone characteristics:
- Strategic, big-picture focus
- Business impact and ROI emphasis
- Concise, high-level messaging
- Focus on outcomes and bottom-line benefits
- Professional authority
- Data and results-oriented
- Respect for reader's time`,
  };

  // Build feature context
  let featureContext = '';
  if (keyFeatures && keyFeatures.length > 0) {
    featureContext = `\n\nKey Features to Highlight:
${keyFeatures.map((feature, idx) => `${idx + 1}. ${feature}`).join('\n')}

For each feature:
- Explain the benefit, not just the feature
- Use specific, concrete language
- Connect to user needs and pain points`;
  }

  // Build audience context
  let audienceContext = '';
  if (targetAudience) {
    audienceContext = `\n\nTarget Audience: ${targetAudience}
- Tailor language and examples to this audience
- Address their specific needs, pain points, and goals
- Use terminology and references they relate to
- Focus on benefits most relevant to them`;
  }

  // Build CTA context
  let ctaContext = '';
  if (callToAction) {
    ctaContext = `\n\nDesired Call-to-Action: ${callToAction}
- Make this the clear next step
- Create urgency or motivation to act
- Remove friction and make it easy to take action`;
  }

  // Build additional context
  let additionalGuidance = '';
  if (additionalContext) {
    additionalGuidance = `\n\nAdditional Context and Requirements:
${additionalContext}
- Incorporate this information naturally into the copy
- Ensure all specific requirements are met`;
  }

  const prompt = `Generate professional marketing copy for a product release.

Product Name: ${productName}
Content Type: ${contentType}
Tone: ${tone}

${contentTypeGuidance[contentType]}

${toneGuidance[tone]}${featureContext}${audienceContext}${ctaContext}${additionalGuidance}

Best Practices for Marketing Copy:
- Lead with benefits, not features
- Use power words and emotional triggers appropriately
- Create clear hierarchy and structure
- Use active voice and strong verbs
- Be specific and concrete, avoid vague claims
- Address objections proactively
- Create urgency or scarcity when appropriate
- Make the value proposition crystal clear
- Use social proof and credibility signals
- Focus on the customer, not the company
- Remove jargon unless appropriate for technical audience
- Use numbers and data to build credibility
- Paint a picture of the transformation or outcome

Requirements:
- Generate polished, ready-to-use copy
- Ensure consistency with specified tone
- Make it compelling and persuasive
- Include all key elements for the content type
- Professional quality suitable for public distribution

Respond in JSON format:
{
  "title": "A compelling headline or subject line for the content",
  "copy": "The complete marketing copy (use \\n\\n for paragraph breaks)",
  "analysis": "A brief 1-2 sentence explanation of the approach and key persuasive elements used"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      title: parsed.title,
      copy: parsed.copy,
      contentType,
      tone,
      analysis: parsed.analysis,
    };
  } catch (error) {
    console.error('Error generating marketing copy:', error);
    // Fallback copy in case of error
    return {
      title: `Introducing ${productName}`,
      copy: `We're excited to announce ${productName}, a game-changing solution designed to transform the way you work.\n\nKey highlights:\n- Innovative features that save time and increase productivity\n- Intuitive design for seamless adoption\n- Built with your needs in mind\n\nDiscover how ${productName} can make a difference for you. Learn more today.`,
      contentType,
      tone,
      analysis: "Fallback copy generated due to an error in the primary generation process.",
    };
  }
}

export const generateMarketingCopyTool = tool({
  description: 'Generate professional marketing copy for product releases and announcements. Creates engaging, persuasive content tailored to specific formats (press releases, emails, social media, landing pages, blog posts, product descriptions). Customize tone (professional, casual, enthusiastic, technical, conversational, executive) and highlight key features, benefits, and call-to-actions. Perfect for product launches, updates, and promotional campaigns.',
  inputSchema: z.object({
    productName: z.string().describe('Name of the product or feature being released'),
    contentType: z.enum(['press_release', 'email', 'social_media', 'landing_page', 'blog_post', 'product_description']).optional().describe('Type of marketing content to generate (default: press_release). Each type follows industry best practices and format conventions.'),
    tone: z.enum(['professional', 'casual', 'enthusiastic', 'technical', 'conversational', 'executive']).optional().describe('Desired tone of the marketing copy (default: professional). Determines language style, formality, and approach.'),
    keyFeatures: z.array(z.string()).optional().describe('Array of key features or benefits to highlight in the copy. Each should be a concise description of a feature or benefit.'),
    targetAudience: z.string().optional().describe('Description of the target audience (e.g., "enterprise developers", "small business owners", "tech-savvy consumers"). Used to tailor language and messaging.'),
    callToAction: z.string().optional().describe('Desired call-to-action or next step (e.g., "Sign up for free trial", "Download now", "Schedule a demo"). Will be prominently featured in the copy.'),
    additionalContext: z.string().optional().describe('Any additional context, requirements, or information to incorporate into the copy (e.g., launch date, pricing, unique selling points, competitive advantages).'),
  }),
  execute: async ({
    productName,
    contentType = 'press_release',
    tone = 'professional',
    keyFeatures,
    targetAudience,
    callToAction,
    additionalContext,
  }) => {
    try {
      console.log(`📢 Generate Marketing Copy: Creating ${contentType} for "${productName}"...`);
      console.log(`   🎯 Tone: ${tone}`);
      if (keyFeatures && keyFeatures.length > 0) {
        console.log(`   ✨ Features: ${keyFeatures.length} key features`);
      }
      if (targetAudience) {
        console.log(`   👥 Audience: ${targetAudience}`);
      }
      if (callToAction) {
        console.log(`   🎬 CTA: ${callToAction}`);
      }

      const copyData = await generateMarketingCopy(
        productName,
        contentType,
        tone,
        keyFeatures,
        targetAudience,
        callToAction,
        additionalContext
      );

      console.log(`   ✅ Generated: "${copyData.title}"`);

      return {
        success: true,
        title: copyData.title,
        copy: copyData.copy,
        contentType: copyData.contentType,
        tone: copyData.tone,
        analysis: copyData.analysis,
        productName,
        featuresHighlighted: keyFeatures?.length || 0,
        targetAudience: targetAudience || 'general',
        callToAction: callToAction || 'none specified',
        availableContentTypes: Array.from(CONTENT_TYPES),
        availableTones: Array.from(TONES),
        formattedOutput: `**${copyData.title}**\n\n${copyData.copy}\n\n---\n*${copyData.analysis}*\n\n*Type: ${contentType} | Tone: ${tone}${targetAudience ? ` | Audience: ${targetAudience}` : ''}*`,
      };
    } catch (error) {
      console.error('Error generating marketing copy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate marketing copy',
      };
    }
  },
});
