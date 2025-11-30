/**
 * Generate Legal Disclaimer Tool - Creates formal legal-style disclaimers from prompts
 *
 * Features:
 * - AI-generated legal disclaimers tailored to specific contexts
 * - Multiple disclaimer types (liability, privacy, terms, warranty, medical, financial, etc.)
 * - Tone customization (formal, standard, simplified)
 * - Clear, appropriately worded legal language
 * - Customizable scope and specific requirements
 * - Perfect for websites, products, services, communications
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

// Available disclaimer types
const DISCLAIMER_TYPES = [
  'general_liability',
  'privacy_notice',
  'terms_of_use',
  'warranty',
  'medical_advice',
  'financial_advice',
  'educational_content',
  'professional_services',
  'affiliate_disclosure',
  'user_generated_content',
  'accuracy_completeness',
  'external_links',
] as const;

type DisclaimerType = typeof DISCLAIMER_TYPES[number];

// Available tones
const TONES = [
  'formal',
  'standard',
  'simplified',
] as const;

type Tone = typeof TONES[number];

/**
 * Generate legal disclaimer using AI
 */
async function generateLegalDisclaimer(
  disclaimerType: DisclaimerType,
  tone: Tone,
  scope?: string,
  specificRequirements?: string[],
  jurisdiction?: string,
  entityType?: string,
  additionalContext?: string
): Promise<{
  title: string;
  disclaimer: string;
  disclaimerType: string;
  tone: string;
  analysis: string;
}> {
  // Build disclaimer-type specific guidance
  const disclaimerTypeGuidance: Record<DisclaimerType, string> = {
    general_liability: `Create a general liability disclaimer following these guidelines:
- Clearly state limitation of liability
- Disclaim warranties (express and implied)
- Address use of information/content "as is"
- Specify that content is for general information only
- Disclaim responsibility for decisions made based on content
- Include standard limitation language
- Cover potential damages and losses
- Professional but accessible language
- Appropriate scope limitation
- Clear statement of no guarantees`,

    privacy_notice: `Create a privacy notice/disclaimer following these guidelines:
- Describe information collection practices
- Explain how data is used and protected
- Address third-party sharing (if applicable)
- Include cookie policy references if relevant
- State compliance intentions (e.g., GDPR, CCPA awareness)
- User rights and choices
- Contact information for privacy concerns
- Updates and changes to privacy practices
- Data security measures overview
- Clear, transparent language`,

    terms_of_use: `Create terms of use disclaimer following these guidelines:
- Define acceptable use of service/website/product
- State prohibited activities
- Intellectual property rights
- User responsibilities and obligations
- Account terms (if applicable)
- Termination rights
- Modification of terms notice
- Governing law and jurisdiction
- Dispute resolution approach
- Severability clause
- Entire agreement statement`,

    warranty: `Create a warranty disclaimer following these guidelines:
- Clearly disclaim implied warranties
- State "as is" and "as available" terms
- Disclaim merchantability and fitness for purpose
- Address no guarantee of results
- Cover accuracy and completeness limitations
- Include scope of any express warranties (if provided)
- State remedy limitations
- Specify what is NOT covered
- Compliance with consumer protection laws
- Clear, prominent disclaimer language`,

    medical_advice: `Create a medical advice disclaimer following these guidelines:
- Explicitly state not a substitute for professional medical advice
- Recommend consulting qualified healthcare providers
- Disclaim diagnosis or treatment provision
- State content is for informational purposes only
- Address emergency situations (seek immediate help)
- Disclaim liability for medical decisions
- Mention need for professional medical evaluation
- Reference not establishing doctor-patient relationship
- Include urgency for serious symptoms
- Comply with healthcare regulatory standards`,

    financial_advice: `Create a financial advice disclaimer following these guidelines:
- State not professional financial advice
- Recommend consulting qualified financial advisors
- Disclaim responsibility for investment decisions
- Note content is for educational/informational purposes
- Address market risks and volatility
- Disclaim guarantee of returns or results
- State past performance doesn't guarantee future results
- Reference regulatory compliance intentions
- Recommend independent research
- Clarify not establishing advisory relationship`,

    educational_content: `Create an educational content disclaimer following these guidelines:
- State content is for educational purposes only
- Disclaim professional advice (legal, medical, financial, etc.)
- Recommend seeking qualified professionals for specific situations
- Address accuracy efforts but no guarantees
- Mention content may become outdated
- Encourage verification and independent research
- Limit liability for application of information
- Reference general nature of content
- Include currency of information notice
- Clear learning vs. professional advice distinction`,

    professional_services: `Create a professional services disclaimer following these guidelines:
- Define scope of services provided
- Disclaim guarantees of specific outcomes
- State professional standards adherence
- Address limitations of service scope
- Reference credentials and qualifications
- Mention client responsibility requirements
- Include confidentiality parameters
- Address termination conditions
- Specify what services do NOT include
- Professional liability limitations`,

    affiliate_disclosure: `Create an affiliate disclosure following these guidelines:
- Clearly state affiliate relationship existence
- Explain compensation for referrals/purchases
- Maintain transparency and honesty
- State recommendations are honest opinions
- Address FTC compliance
- Mention potential bias disclosure
- Reference independent research recommendation
- Include no additional cost statement (if true)
- Maintain credibility and trust
- Clear, upfront disclosure`,

    user_generated_content: `Create a user-generated content disclaimer following these guidelines:
- Disclaim responsibility for user-posted content
- State views expressed are users', not entity's
- Address monitoring and moderation approach
- Reference right to remove inappropriate content
- Disclaim accuracy of user information
- Include intellectual property infringement process
- State reporting mechanism for violations
- Limit liability for user interactions
- Compliance with platform responsibilities
- Clear delineation of responsibility`,

    accuracy_completeness: `Create an accuracy and completeness disclaimer following these guidelines:
- Disclaim guarantee of accuracy or completeness
- State reasonable effort to ensure accuracy
- Address possibility of errors or omissions
- Mention currency of information
- Recommend verification from official sources
- Disclaim liability for reliance on information
- Include update frequency (if applicable)
- Reference changing nature of information
- State corrections approach
- User responsibility for verification`,

    external_links: `Create an external links disclaimer following these guidelines:
- Disclaim control over external websites
- State no endorsement of linked content
- Address no responsibility for external site content
- Mention links for convenience only
- Recommend reviewing external site policies
- Disclaim accuracy of linked information
- Address broken or changed links
- Note no partnership with external sites
- Limit liability for external site use
- User caution and independent review`,
  };

  // Build tone-specific guidance
  const toneGuidance: Record<Tone, string> = {
    formal: `Formal legal tone characteristics:
- Highly professional, traditional legal language
- Precise legal terminology and phrasing
- May include terms like "herein", "thereof", "aforementioned"
- Full sentences with complex structure
- Authoritative voice
- Complete legal formality
- Suitable for legal documents and contracts
- Comprehensive coverage`,

    standard: `Standard legal tone characteristics:
- Professional but accessible legal language
- Clear, direct communication
- Balance between legal precision and readability
- Standard legal terms but explained clearly
- Professional formality without excessive complexity
- Suitable for most business contexts
- User-friendly while maintaining legal adequacy
- Straightforward structure`,

    simplified: `Simplified legal tone characteristics:
- Plain language approach
- Short sentences and paragraphs
- Minimal legal jargon
- Clear explanations over technical terms
- Conversational but professional
- Easy to understand for general audience
- Maintain legal sufficiency with accessibility
- Focus on clarity and comprehension`,
  };

  // Build scope context
  let scopeContext = '';
  if (scope) {
    scopeContext = `\n\nScope and Context: ${scope}
- Tailor disclaimer to this specific scope
- Address relevant aspects of this context
- Include appropriate limitations for this use case
- Ensure coverage is adequate for described scope`;
  }

  // Build requirements context
  let requirementsContext = '';
  if (specificRequirements && specificRequirements.length > 0) {
    requirementsContext = `\n\nSpecific Requirements to Include:
${specificRequirements.map((req, idx) => `${idx + 1}. ${req}`).join('\n')}

Ensure each requirement is adequately addressed in the disclaimer.`;
  }

  // Build jurisdiction context
  let jurisdictionContext = '';
  if (jurisdiction) {
    jurisdictionContext = `\n\nJurisdiction: ${jurisdiction}
- Consider legal standards and requirements for this jurisdiction
- Include governing law reference if appropriate
- Ensure compliance-oriented language for this location
- Address jurisdiction-specific legal considerations`;
  }

  // Build entity type context
  let entityContext = '';
  if (entityType) {
    entityContext = `\n\nEntity Type: ${entityType}
- Tailor language appropriate for this type of entity
- Consider entity-specific liability concerns
- Use appropriate terminology for this entity type
- Address relevant regulatory considerations`;
  }

  // Build additional context
  let additionalGuidance = '';
  if (additionalContext) {
    additionalGuidance = `\n\nAdditional Context and Requirements:
${additionalContext}
- Incorporate this information into the disclaimer
- Ensure all additional requirements are met
- Address any special circumstances noted`;
  }

  const prompt = `Generate a professional legal-style disclaimer based on the following specifications.

Disclaimer Type: ${disclaimerType}
Tone: ${tone}

${disclaimerTypeGuidance[disclaimerType]}

${toneGuidance[tone]}${scopeContext}${requirementsContext}${jurisdictionContext}${entityContext}${additionalGuidance}

Best Practices for Legal Disclaimers:
- Use clear, unambiguous language
- Be comprehensive but concise
- Ensure prominent display considerations
- Use capital letters or bold for key sections (note in text with **bold**)
- Include "as is" and "as available" where relevant
- Disclaim specific warranties appropriately
- Limit liability clearly
- Address assumption of risk where applicable
- Reference compliance intentions without guarantees
- Recommend professional advice for specific situations
- Include severability concepts if appropriate
- Ensure conspicuous presentation in final use
- Cover reasonably foreseeable issues
- Maintain professional credibility
- Balance legal protection with user understanding

IMPORTANT LEGAL CONSIDERATIONS:
- This tool generates draft disclaimers for informational purposes
- Generated disclaimers should be reviewed by qualified legal counsel
- Legal requirements vary by jurisdiction and specific circumstances
- This is NOT a substitute for professional legal advice
- Compliance with applicable laws is user's responsibility
- Effectiveness depends on proper implementation and display

Requirements:
- Generate a complete, ready-to-use disclaimer
- Ensure consistency with specified tone and type
- Make it legally coherent and appropriately worded
- Include all necessary elements for the disclaimer type
- Professional quality suitable for actual use (after legal review)
- Clear structure with logical flow
- Appropriate level of detail

Respond in JSON format:
{
  "title": "A descriptive title for the disclaimer (e.g., 'Liability Disclaimer', 'Privacy Notice')",
  "disclaimer": "The complete disclaimer text (use \\n\\n for paragraph breaks, **text** for bold/emphasis)",
  "analysis": "A brief 2-3 sentence explanation of the disclaimer's key protections and coverage, plus reminder to seek legal review"
}`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());

    return {
      title: parsed.title,
      disclaimer: parsed.disclaimer,
      disclaimerType,
      tone,
      analysis: parsed.analysis,
    };
  } catch (error) {
    console.error('Error generating legal disclaimer:', error);
    // Fallback disclaimer in case of error
    return {
      title: 'General Disclaimer',
      disclaimer: `**DISCLAIMER**\n\nThe information provided is for general informational purposes only. While we strive to ensure accuracy, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the information.\n\nAny reliance you place on such information is strictly at your own risk. In no event will we be liable for any loss or damage arising from the use of this information.\n\n**IMPORTANT:** This disclaimer was generated automatically. For legal matters specific to your situation, please consult with a qualified legal professional.`,
      disclaimerType,
      tone,
      analysis: "Fallback disclaimer generated due to an error. This generic disclaimer provides basic protection but should be reviewed and customized by legal counsel for your specific needs.",
    };
  }
}

export const generateLegalDisclaimerTool = tool({
  description: 'Generate formal legal-style disclaimers based on user prompts and requirements. Creates clear, appropriately worded legal disclaimers for various contexts including liability, privacy, terms of use, warranties, medical/financial advice, educational content, professional services, affiliate disclosure, user-generated content, accuracy statements, and external links. Supports customization for different tones (formal, standard, simplified), jurisdictions, and specific requirements. Perfect for websites, products, services, and communications. Generated disclaimers should be reviewed by qualified legal counsel before use.',
  inputSchema: z.object({
    disclaimerType: z.enum([
      'general_liability',
      'privacy_notice',
      'terms_of_use',
      'warranty',
      'medical_advice',
      'financial_advice',
      'educational_content',
      'professional_services',
      'affiliate_disclosure',
      'user_generated_content',
      'accuracy_completeness',
      'external_links',
    ]).describe('Type of legal disclaimer to generate. Each type follows legal best practices and industry standards for that specific disclaimer category.'),
    tone: z.enum(['formal', 'standard', 'simplified']).optional().describe('Desired tone of the disclaimer (default: standard). Formal uses traditional legal language, standard balances professionalism with readability, simplified uses plain language.'),
    scope: z.string().optional().describe('Description of the scope and context where the disclaimer will be used (e.g., "personal blog about technology", "e-commerce website selling clothing", "financial education YouTube channel"). Helps tailor the disclaimer appropriately.'),
    specificRequirements: z.array(z.string()).optional().describe('Array of specific requirements or elements that must be included in the disclaimer (e.g., "mention GDPR compliance", "include arbitration clause", "reference professional licensing").'),
    jurisdiction: z.string().optional().describe('Jurisdiction or region where the disclaimer will be used (e.g., "United States", "European Union", "California", "United Kingdom"). Helps ensure compliance-oriented language.'),
    entityType: z.string().optional().describe('Type of entity using the disclaimer (e.g., "individual blogger", "LLC", "corporation", "non-profit", "professional practice"). Affects appropriate terminology and liability language.'),
    additionalContext: z.string().optional().describe('Any additional context, special circumstances, or custom requirements for the disclaimer. This information will be incorporated into the generated disclaimer.'),
  }),
  execute: async ({
    disclaimerType,
    tone = 'standard',
    scope,
    specificRequirements,
    jurisdiction,
    entityType,
    additionalContext,
  }) => {
    try {
      console.log(`⚖️ Generate Legal Disclaimer: Creating ${disclaimerType} disclaimer...`);
      console.log(`   📜 Tone: ${tone}`);
      if (scope) {
        console.log(`   🎯 Scope: ${scope}`);
      }
      if (jurisdiction) {
        console.log(`   🌍 Jurisdiction: ${jurisdiction}`);
      }
      if (specificRequirements && specificRequirements.length > 0) {
        console.log(`   📋 Requirements: ${specificRequirements.length} specific requirements`);
      }

      const disclaimerData = await generateLegalDisclaimer(
        disclaimerType,
        tone,
        scope,
        specificRequirements,
        jurisdiction,
        entityType,
        additionalContext
      );

      console.log(`   ✅ Generated: "${disclaimerData.title}"`);

      return {
        success: true,
        title: disclaimerData.title,
        disclaimer: disclaimerData.disclaimer,
        disclaimerType: disclaimerData.disclaimerType,
        tone: disclaimerData.tone,
        analysis: disclaimerData.analysis,
        scope: scope || 'general use',
        jurisdiction: jurisdiction || 'not specified',
        entityType: entityType || 'not specified',
        requirementsIncluded: specificRequirements?.length || 0,
        availableDisclaimerTypes: Array.from(DISCLAIMER_TYPES),
        availableTones: Array.from(TONES),
        legalNotice: 'IMPORTANT: This disclaimer is generated for informational purposes only and should be reviewed by qualified legal counsel before use. Legal requirements vary by jurisdiction and specific circumstances.',
        formattedOutput: `**${disclaimerData.title}**\n\n${disclaimerData.disclaimer}\n\n---\n*${disclaimerData.analysis}*\n\n*Type: ${disclaimerType} | Tone: ${tone}${jurisdiction ? ` | Jurisdiction: ${jurisdiction}` : ''}*\n\n⚠️ **Legal Notice:** This disclaimer should be reviewed by qualified legal counsel before use.`,
      };
    } catch (error) {
      console.error('Error generating legal disclaimer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate legal disclaimer',
      };
    }
  },
});
