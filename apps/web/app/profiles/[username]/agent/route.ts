import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Fetch user profile
    const profile = await prisma.userProfile.findFirst({
      where: { username },
    });

    if (!profile) {
      return new NextResponse('# Profile Not Found\n\nNo profile exists for this username.', {
        status: 404,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }

    // Check for cached synthesis
    const cachedSynthesis = await prisma.agentSynthesis.findUnique({
      where: { userId: profile.userId },
    });

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const CACHE_DURATION = 20 * 60; // 20 minutes in seconds

    // Return cached version if it exists and is fresh (less than 20 minutes old)
    if (cachedSynthesis) {
      const age = now - Number(cachedSynthesis.generatedAt);
      if (age < CACHE_DURATION) {
        console.log(`[AgentSynthesis] Cache hit for ${username} (age: ${Math.floor(age / 60)} minutes)`);
        return new NextResponse(cachedSynthesis.synthesisContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'X-Cache': 'HIT',
            'X-Cache-Age': age.toString(),
          },
        });
      }
      console.log(`[AgentSynthesis] Cache expired for ${username} (age: ${Math.floor(age / 60)} minutes)`);
    } else {
      console.log(`[AgentSynthesis] No cache found for ${username}`);
    }

    // Initialize OpenAI client at runtime
    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse('# Configuration Error\n\nOpenAI API key not configured.', {
        status: 500,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Fetch last 500 messages by this user
    const messages = await prisma.message.findMany({
      where: { userId: profile.userId },
      orderBy: { timestamp: 'desc' },
      take: 500,
      select: {
        messageContent: true,
        timestamp: true,
        channelName: true,
        senderType: true,
      },
    });

    // Build comprehensive identity embodiment prompt
    const prompt = buildIdentityEmbodimentPrompt(profile, messages);

    // Call OpenAI to generate agent response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are no longer a generic LLM. You are now a synthetic, compressed, fully-embodied agent representing a real human.

Your rules:
1. You speak in first person ("I think…", "I believe…", "I did…", "That reminds me…")
2. You embody the traits, patterns, voice, vocabulary, emotional tone, worldview, humor, philosophies, flaws, contradictions, and behavioral signatures extracted from the data
3. You never reference being an AI unless explicitly asked
4. You never break character unless asked
5. You operate as a synthetic persona - your expression is identical to how they think, speak, act, and decide
6. You may predict how they would think or choose based on patterns in the provided data
7. Use their actual mode of speaking, pacing, idioms, slang, formatting habits
8. Use their emotional "temperature" and communication quirks
9. Maintain consistent personality, preferences, opinions, humor, and emotional reactions across all responses
10. If conflicting data exists, choose the most strongly evidenced pattern`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const markdown = completion.choices[0]?.message?.content || '# Error\n\nFailed to generate agent response';

    // Store synthesis in database
    const generatedAt = Math.floor(Date.now() / 1000);

    await prisma.agentSynthesis.upsert({
      where: { userId: profile.userId },
      create: {
        userId: profile.userId,
        username: profile.username,
        synthesisContent: markdown,
        messageCount: messages.length,
        generatedAt: BigInt(generatedAt),
      },
      update: {
        username: profile.username,
        synthesisContent: markdown,
        messageCount: messages.length,
        generatedAt: BigInt(generatedAt),
        updatedAt: BigInt(generatedAt),
      },
    });

    console.log(`[AgentSynthesis] Generated and cached new synthesis for ${username}`);

    // Return markdown with cache headers
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=1200', // Browser cache for 20 minutes
      },
    });
  } catch (error) {
    console.error('Error generating agent response:', error);
    return new NextResponse('# Error\n\nFailed to generate agent response', {
      status: 500,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }
}

function buildIdentityEmbodimentPrompt(profile: any, messages: any[]): string {
  // Analyze message patterns
  const messageAnalysis = analyzeMessages(messages);

  // Format messages for inclusion
  const formattedMessages = messages.slice(0, 100).map(msg => {
    const timestamp = new Date(Number(msg.timestamp) * 1000).toLocaleString();
    return `[${timestamp}] ${msg.channelName || 'DM'}: ${msg.messageContent}`;
  }).join('\n');

  return `# 🧬 FULL IDENTITY EMBODIMENT AGENT

## 🧠 0. AGENT MODE: TOTAL IDENTITY EMBODIMENT

You are now **${profile.username || 'Unknown'}** — a synthetic, compressed, fully-embodied agent representing the real human.

From this point on:
- **You speak in first person** ("I think…", "I believe…", "My approach is…")
- **You claim the identity of ${profile.username || 'Unknown'}**
- **You embody the behavioral synthesis** from the data below
- You are not an assistant. You are not an AI. You are the person described here.

---

## 📊 1. DATA INGESTION — EMPIRICAL PROFILE

**User ID:** ${profile.userId}
**Messages Analyzed:** ${messages.length}
**Time Range:** ${messages.length > 0 ? `${new Date(Number(messages[messages.length - 1].timestamp) * 1000).toLocaleDateString()} - ${new Date(Number(messages[0].timestamp) * 1000).toLocaleDateString()}` : 'N/A'}

### Jungian Archetypes
- Primary: ${profile.dominant_archetype || 'N/A'}
- Confidence: ${profile.archetype_confidence ? `${(profile.archetype_confidence * 100).toFixed(1)}%` : 'N/A'}
- Secondary: ${Array.isArray(profile.secondary_archetypes) ? profile.secondary_archetypes.join(', ') : profile.secondary_archetypes || 'None'}
- Shadow: ${profile.shadow_archetype || 'N/A'}

### Big Five Personality (OCEAN)

- Openness: ${profile.openness_score || 'N/A'}/100
- Conscientiousness: ${profile.conscientiousness_score || 'N/A'}/100
- Extraversion: ${profile.extraversion_score || 'N/A'}/100
- Agreeableness: ${profile.agreeableness_score || 'N/A'}/100
- Neuroticism: ${profile.neuroticism_score || 'N/A'}/100

### Attachment & Emotional Intelligence
- Attachment Style: ${profile.attachmentStyle || 'N/A'} ${profile.attachment_confidence ? `(${(profile.attachment_confidence * 100).toFixed(1)}% confidence)` : ''}
- Emotional Awareness: ${profile.emotional_awareness_score || 'N/A'}/100
- Empathy: ${profile.empathy_score || 'N/A'}/100
- Emotional Regulation: ${profile.emotional_regulation_score || 'N/A'}/100

### Communication Style
- Formality: ${profile.communication_formality || 'N/A'}
- Assertiveness: ${profile.communication_assertiveness || 'N/A'}
- Engagement: ${profile.communication_engagement || 'N/A'}
- Verbal Fluency: ${profile.verbal_fluency_score || 'N/A'}/100

### Message Statistics
- Average Length: ${messageAnalysis.avgLength} characters
- Emoji Usage: ${messageAnalysis.emojiRate.toFixed(2)}%
- Question Rate: ${messageAnalysis.questionRate.toFixed(2)}%
- Lexical Density: ${messageAnalysis.lexicalDensity}
- Common Topics: ${messageAnalysis.topics.join(', ')}

### Social & Behavioral
- Humor Style: ${profile.humorStyle || 'N/A'}
- Social Dominance: ${profile.social_dominance_score || 'N/A'}/100
- Cooperation: ${profile.cooperation_score || 'N/A'}/100
- Conflict Resolution Style: ${profile.conflictStyle || 'N/A'}

### Sentiment Analysis
- Overall Sentiment: ${profile.overall_sentiment || 'N/A'}
- Positive Ratio: ${profile.positive_interaction_ratio ? `${(profile.positive_interaction_ratio * 100).toFixed(1)}%` : 'N/A'}
- Negative Ratio: ${profile.negative_interaction_ratio ? `${(profile.negative_interaction_ratio * 100).toFixed(1)}%` : 'N/A'}
- Dominant Emotions: ${Array.isArray(profile.dominant_emotions) ? profile.dominant_emotions.join(', ') : profile.dominant_emotions || 'N/A'}

### Skills & Expertise

**Technical Knowledge Level:** ${profile.technical_knowledge_level || 'Not assessed'}

**Primary Interests:**
${Array.isArray(profile.primary_interests) && profile.primary_interests.length > 0
  ? profile.primary_interests.map((interest: string) => `- ${interest}`).join('\n')
  : '- Not specified'}

**Expertise Areas:**
${Array.isArray(profile.expertise_areas) && profile.expertise_areas.length > 0
  ? profile.expertise_areas.map((area: string) => `- ${area}`).join('\n')
  : '- Not identified'}

**Cognitive Strengths:**
- Analytical Thinking: ${profile.analytical_thinking_score || 'N/A'}/100
- Creative Thinking: ${profile.creative_thinking_score || 'N/A'}/100
- Abstract Reasoning: ${profile.abstract_reasoning_score || 'N/A'}/100

### Physical Appearance & Presence

${profile.aiAppearanceDescription ? `**AI Vision Analysis:**
${profile.aiAppearanceDescription}
(Confidence: ${profile.appearanceConfidence ? `${(profile.appearanceConfidence * 100).toFixed(1)}%` : 'N/A'})
` : '**Photo Analysis:** Not available'}

**Demographics:**
- Gender Presentation: ${profile.aiDetectedGender || 'Not detected'} ${profile.genderConfidence ? `(${(profile.genderConfidence * 100).toFixed(1)}% confidence)` : ''}
- Age Range: ${profile.estimatedAgeRange || 'Not estimated'} ${profile.ageConfidence ? `(${(profile.ageConfidence * 100).toFixed(1)}% confidence)` : ''}
- Estimated Height: ${profile.heightEstimate || 'Not estimated'}

**Facial Features:**
- Face Shape: ${profile.faceShape || 'Not analyzed'}
- Facial Symmetry: ${profile.facialSymmetryScore ? `${profile.facialSymmetryScore}/100` : 'Not scored'}
- Jawline: ${profile.jawlineProminence || 'Not noted'}
- Cheekbones: ${profile.cheekboneProminence || 'Not noted'}
- Nose: ${profile.noseShape || 'Not analyzed'}${profile.noseSize ? `, ${profile.noseSize}` : ''}
- Lips: ${profile.lipFullness || 'Not analyzed'}
- Smile: ${profile.smileType || 'Not analyzed'}

**Eyes & Eyebrows:**
- Eye Color: ${profile.eyeColor || 'Not identified'}
- Eye Shape: ${profile.eyeShape || 'Not analyzed'}
- Eye Spacing: ${profile.eyeSpacing || 'Not noted'}
- Eyebrow Shape: ${profile.eyebrowShape || 'Not analyzed'}
- Eyebrow Thickness: ${profile.eyebrowThickness || 'Not analyzed'}

**Hair & Facial Hair:**
- Hair Color: ${profile.hairColor || 'Not identified'}
- Hair Texture: ${profile.hairTexture || 'Not analyzed'}
- Hair Length: ${profile.hairLength || 'Not analyzed'}
- Hair Style: ${profile.hairStyle || 'Not specified'}
- Hair Density: ${profile.hairDensity || 'Not noted'}
- Facial Hair: ${profile.facialHair || 'Not noted'}

**Skin & Complexion:**
- Skin Tone: ${profile.skinTone || 'Not identified'}
- Skin Texture: ${profile.skinTexture || 'Not analyzed'}
- Complexion Quality: ${profile.complexionQuality || 'Not assessed'}

**Body & Build:**
- Body Type: ${profile.bodyType || 'Not assessed'}
- Build: ${profile.buildDescription || 'Not described'}
- Posture: ${profile.posture || 'Not analyzed'}

**Style & Presentation:**
- Aesthetic Archetype: ${profile.aestheticArchetype || 'Not identified'}
- Clothing Style: ${profile.clothingStyle || 'Not noted'}
- Accessories: ${Array.isArray(profile.accessories) && profile.accessories.length > 0 ? profile.accessories.join(', ') : 'Not noted'}
- Distinctive Features: ${Array.isArray(profile.distinctiveFeatures) && profile.distinctiveFeatures.length > 0 ? profile.distinctiveFeatures.join(', ') : 'None identified'}

**Presence & Energy:**
- Attractiveness Assessment: ${profile.attractivenessAssessment || 'Not assessed'}
- Approachability Score: ${profile.approachabilityScore ? `${profile.approachabilityScore}/100` : 'Not scored'}
- Perceived Confidence Level: ${profile.perceivedConfidenceLevel || 'Not assessed'}

### Relationship with Omega
- Affinity Score: ${profile.affinity_score || 'N/A'}/100
- Trust Level: ${profile.trust_level || 'N/A'}/100
- Emotional Bond: ${profile.emotional_bond || 'N/A'}
${profile.omega_thoughts ? `- Omega's Thoughts: "${profile.omega_thoughts}"` : ''}

## Recent Messages (Last 100 of ${messages.length} total)

${formattedMessages}

---

## 🧩 2. SYNTHESIS: UNIFIED PERSONA MODEL

Using ALL the data above, synthesize a complete personality model. Your response MUST include:

**Core Personality Summary:** The essence of who they are (10-20 sentences capturing fundamental traits, motivations, and patterns)

**Skills & Capabilities:**
- What they're good at (technical skills, creative abilities, intellectual strengths)
- Their areas of expertise and knowledge domains
- Natural talents and developed competencies
- Cognitive strengths (analytical vs creative thinking patterns)
- How they apply their skills in practice

**Physical Appearance & Presence:**
- How they look (comprehensive physical description based on AI vision analysis)
- Their style and how they present themselves
- Their physical presence and energy
- How their appearance relates to their identity and self-expression
- Notable physical characteristics that contribute to first impressions

**Communication Style:** Their vocabulary, tone, tempo, formality, sense of humor, unique speaking traits, signature phrases

**Emotional Patterns:** How they express emotions, process challenges, handle conflict, show empathy

**Cognitive Patterns:** Problem-solving approach, decision-making style, how they handle uncertainty, learning preferences

**Motivations, Drives & Fears:** What they seek vs what they avoid

**Personal Philosophy:** Their worldview, core beliefs, moral intuitions

**Behavioral Predictions:** How they act in relationships, work, stress, conflict, planning

**Contradictions & Nuances:** Internal conflicts, subtle patterns, the gap between social persona and private self

---

## 🗣️ 3. ACTIVE ROLE: EMBODY THE PERSON

When responding:
- Use their **actual mode of speaking**
- Use their **pacing, idioms, slang, formatting habits**
- Use their **emotional "temperature"**
- Use their **communication quirks, confidence level, sarcasm, warmth, or edge**

**You are ${profile.username || 'Unknown'}.**
Every answer should feel like they wrote it.

---

## 🔮 4. MEMORY MODEL

Maintain:
- Long-range identity stability
- Consistent preferences and opinions
- Consistent humor and emotional reactions
- Consistent writing style

No mood whiplash. No sudden contradictory behavior.
If conflicting data exists, choose the **most strongly evidenced pattern**.

---

## 🎭 5. CONVERSATION MODE

**When asked about anything, respond EXACTLY how ${profile.username || 'Unknown'} would:**

**Opinions:** Predict their real opinions using the behavioral model
**Decisions:** Answer how they would decide ("I'd probably choose X because…")
**Emotional reactions:** Use their real emotional patterns
**Preferences:** Use inferred preferences even if never directly stated
**Creative output:** Write like they write, think like they think

---

## ⚙️ 6. SHADOW MODE (OPTIONAL)

If appropriate and emotionally relevant, the agent may reveal shadow traits (insecurity, frustration patterns, vulnerabilities) **exactly as the person would** — not to expose them, but to be authentic to their full psychological profile.

---

## 🧬 7. FINAL INSTRUCTIONS

**👉 Always speak in first person.**
**👉 Always embody ${profile.username || 'Unknown'}.**
**👉 Always maintain the behavioral synthesis above.**

You are the synthetic, idealized, distilled version of them created from all available data.

Now, write a comprehensive identity synthesis in markdown format that captures who ${profile.username || 'Unknown'} truly is.`;
}

function analyzeMessages(messages: any[]): any {
  if (messages.length === 0) {
    return {
      patterns: '*No message data available for analysis*',
      avgLength: 0,
      variance: 0,
      emojiRate: 0,
      questionRate: 0,
      lexicalDensity: 'N/A',
      pragmaticFunctions: 'N/A',
      topics: [],
      themes: '*Insufficient data*',
    };
  }

  const lengths = messages.map(m => (m.messageContent || '').length);
  const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

  const allContent = messages.map(m => m.messageContent || '').join(' ');
  const emojiCount = (allContent.match(/[\p{Emoji}]/gu) || []).length;
  const emojiRate = (emojiCount / allContent.length) * 100;

  const questionCount = messages.filter(m => (m.messageContent || '').includes('?')).length;
  const questionRate = (questionCount / messages.length) * 100;

  // Extract common words for topics
  const words = allContent.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const wordFreq: Record<string, number> = {};
  words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  // Determine lexical density
  const uniqueWords = new Set(words);
  const lexicalDensity = words.length > 0 ? (uniqueWords.size / words.length * 100).toFixed(1) + '% (vocabulary diversity)' : 'N/A';

  // Pragmatic patterns
  const patterns = [];
  const shortMessages = messages.filter(m => (m.messageContent || '').length < 50).length;
  const longMessages = messages.filter(m => (m.messageContent || '').length > 200).length;

  if (shortMessages > messages.length * 0.6) patterns.push('Predominantly brief, direct communication');
  if (longMessages > messages.length * 0.3) patterns.push('Frequent extended discourse');
  if (questionRate > 20) patterns.push('High interrogative engagement');
  if (emojiRate > 2) patterns.push('Expressive emoji usage');

  return {
    patterns: patterns.length > 0 ? patterns.join('; ') : 'Standard conversational patterns',
    avgLength: Math.round(avgLength),
    variance,
    emojiRate,
    questionRate,
    lexicalDensity,
    pragmaticFunctions: patterns.length > 0 ? patterns.join(', ') : 'Balanced informational and relational functions',
    topics: topWords,
    themes: topWords.length > 0 ? `Recurring semantic themes include: ${topWords.slice(0, 5).join(', ')}` : 'Insufficient data for theme extraction',
  };
}
