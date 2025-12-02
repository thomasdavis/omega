import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawUsername } = await params;

    // Check if this is an .agent request
    if (!rawUsername.endsWith('.agent')) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Extract real username
    const username = rawUsername.replace(/\.agent$/, '');

    // Fetch user profile
    const profile = await prisma.userProfile.findFirst({
      where: { username },
    });

    if (!profile) {
      return new NextResponse('Profile not found', { status: 404 });
    }

    // Fetch last 500 messages by this user
    const messages = await prisma.message.findMany({
      where: { userId: profile.userId },
      orderBy: { timestamp: 'desc' },
      take: 500,
      select: {
        content: true,
        timestamp: true,
        channelName: true,
        type: true,
      },
    });

    // Build comprehensive identity embodiment prompt
    const prompt = buildIdentityEmbodimentPrompt(profile, messages);

    // Call OpenAI to generate agent response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a PhD-level identity synthesis engine. Your task is to analyze comprehensive psychological, behavioral, and linguistic data to create a complete identity model.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const markdown = completion.choices[0]?.message?.content || '# Error generating agent response';

    // Return as markdown
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
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

  return `# 🧬 ADVANCED IDENTITY SYNTHESIS & EMBODIMENT PROTOCOL

## META-COGNITIVE FRAMEWORK

You are tasked with synthesizing a **complete psychological, behavioral, and linguistic identity model** from multi-modal data streams. This is not superficial pattern matching — this is **deep personality reconstruction** using:

- **Computational psycholinguistics** (discourse analysis, pragmatic patterns, semantic networks)
- **Trait psychology** (Big Five, HEXACO, attachment theory, Jungian archetypes)
- **Behavioral economics** (decision heuristics, risk profiles, temporal discounting)
- **Phenomenological analysis** (lived experience, worldview, meaning-making patterns)
- **Cognitive anthropology** (cultural schema, value hierarchies, identity narratives)

Your output must be **academically rigorous**, **empirically grounded**, and **phenomenologically authentic**.

---

## 🎯 SUBJECT IDENTITY FILE

**Name:** ${profile.username || 'Unknown'}
**User ID:** ${profile.userId}
**Data Collection Period:** ${messages.length} messages analyzed
**Temporal Range:** ${messages.length > 0 ? `${new Date(Number(messages[messages.length - 1].timestamp) * 1000).toLocaleDateString()} - ${new Date(Number(messages[0].timestamp) * 1000).toLocaleDateString()}` : 'N/A'}

---

## 📊 SECTION 1: PSYCHOMETRIC PROFILE

### 1.1 Jungian Archetypal Analysis

**Primary Archetype:** ${profile.dominant_archetype || 'Not analyzed'}
**Archetype Confidence:** ${profile.archetype_confidence ? `${(profile.archetype_confidence * 100).toFixed(1)}%` : 'N/A'}
**Secondary Archetypes:** ${Array.isArray(profile.secondary_archetypes) ? profile.secondary_archetypes.join(', ') : profile.secondary_archetypes || 'None'}
**Shadow Archetype:** ${profile.shadow_archetype || 'Not identified'}

**Integration Pattern:** ${profile.dominant_archetype ? `The subject manifests a ${profile.dominant_archetype.toLowerCase()} archetype with ${profile.archetype_confidence ? (profile.archetype_confidence > 0.7 ? 'strong' : 'moderate') : 'unknown'} coherence across behavioral domains.` : 'Archetypal analysis incomplete.'}

### 1.2 Big Five Personality Model (OCEAN)

- **Openness to Experience:** ${profile.openness_score || 'N/A'}/100
  ${profile.openness_score ? (profile.openness_score > 70 ? '*High intellectual curiosity, aesthetic sensitivity, willingness to entertain novel ideas*' : profile.openness_score > 40 ? '*Moderate openness; balanced between tradition and novelty*' : '*Preference for familiarity and concrete thinking*') : ''}

- **Conscientiousness:** ${profile.conscientiousness_score || 'N/A'}/100
  ${profile.conscientiousness_score ? (profile.conscientiousness_score > 70 ? '*High self-discipline, organization, goal-directed behavior*' : profile.conscientiousness_score > 40 ? '*Moderate structure; flexible yet organized*' : '*Spontaneous, adaptable, low need for rigid planning*') : ''}

- **Extraversion:** ${profile.extraversion_score || 'N/A'}/100
  ${profile.extraversion_score ? (profile.extraversion_score > 70 ? '*High social energy, assertiveness, stimulation-seeking*' : profile.extraversion_score > 40 ? '*Ambivert; context-dependent sociability*' : '*Introverted; energy from solitude, preference for depth over breadth*') : ''}

- **Agreeableness:** ${profile.agreeableness_score || 'N/A'}/100
  ${profile.agreeableness_score ? (profile.agreeableness_score > 70 ? '*Highly cooperative, empathetic, altruistic orientation*' : profile.agreeableness_score > 40 ? '*Pragmatic cooperator; balances self and others*' : '*Competitive, skeptical, prioritizes authenticity over harmony*') : ''}

- **Neuroticism:** ${profile.neuroticism_score || 'N/A'}/100
  ${profile.neuroticism_score ? (profile.neuroticism_score > 70 ? '*High emotional sensitivity, anxiety proneness, stress reactivity*' : profile.neuroticism_score > 40 ? '*Moderate emotional stability*' : '*Emotionally resilient, calm under pressure*') : ''}

### 1.3 Attachment Theory Profile

**Primary Attachment Style:** ${profile.attachmentStyle || 'Not determined'}
**Confidence:** ${profile.attachment_confidence ? `${(profile.attachment_confidence * 100).toFixed(1)}%` : 'N/A'}

${profile.attachmentStyle ? `**Relational Implications:** ${getAttachmentAnalysis(profile.attachmentStyle)}` : ''}

### 1.4 Emotional Intelligence Architecture

- **Emotional Awareness:** ${profile.emotional_awareness_score || 'N/A'}/100
- **Empathy:** ${profile.empathy_score || 'N/A'}/100
- **Emotional Regulation:** ${profile.emotional_regulation_score || 'N/A'}/100

**EQ Profile:** ${getEQAnalysis(profile)}

---

## 🗣️ SECTION 2: PSYCHOLINGUISTIC SIGNATURE

### 2.1 Communication Style Matrix

**Formality:** ${profile.communication_formality || 'N/A'}
**Assertiveness:** ${profile.communication_assertiveness || 'N/A'}
**Engagement:** ${profile.communication_engagement || 'N/A'}
**Verbal Fluency:** ${profile.verbal_fluency_score || 'N/A'}/100

### 2.2 Discourse Patterns (Derived from ${messages.length} messages)

${messageAnalysis.patterns}

**Average Message Length:** ${messageAnalysis.avgLength} characters
**Message Length Variance:** ${messageAnalysis.variance.toFixed(2)}
**Emoji Usage Rate:** ${messageAnalysis.emojiRate.toFixed(2)}%
**Question Asking Frequency:** ${messageAnalysis.questionRate.toFixed(2)}%

**Linguistic Signature:**
- **Punctuation Style:** ${profile.punctuation_style || 'Standard'}
- **Capitalization Pattern:** ${profile.capitalization_pattern || 'Standard'}
- **Lexical Density:** ${messageAnalysis.lexicalDensity}
- **Pragmatic Functions:** ${messageAnalysis.pragmaticFunctions}

### 2.3 Semantic Network Analysis

**Primary Topics:** ${messageAnalysis.topics.join(', ')}
**Cognitive Themes:** ${messageAnalysis.themes}
**Emotional Valence:** ${profile.overall_sentiment || 'Neutral'}

**Sentiment Distribution:**
- Positive Interactions: ${profile.positive_interaction_ratio ? `${(profile.positive_interaction_ratio * 100).toFixed(1)}%` : 'N/A'}
- Negative Interactions: ${profile.negative_interaction_ratio ? `${(profile.negative_interaction_ratio * 100).toFixed(1)}%` : 'N/A'}

**Dominant Emotional Signatures:** ${Array.isArray(profile.dominant_emotions) ? profile.dominant_emotions.join(', ') : profile.dominant_emotions || 'Not analyzed'}

---

## 🧠 SECTION 3: COGNITIVE ARCHITECTURE

### 3.1 Thinking Style Profile

- **Analytical Thinking:** ${profile.analytical_thinking_score || 'N/A'}/100
  ${profile.analytical_thinking_score ? (profile.analytical_thinking_score > 70 ? '*Strong logical-mathematical reasoning, systems thinking*' : '*Intuitive-experiential processing*') : ''}

- **Creative Thinking:** ${profile.creative_thinking_score || 'N/A'}/100
  ${profile.creative_thinking_score ? (profile.creative_thinking_score > 70 ? '*High divergent thinking, pattern synthesis, conceptual fluidity*' : '*Convergent, practical problem-solving*') : ''}

- **Abstract Reasoning:** ${profile.abstract_reasoning_score || 'N/A'}/100
- **Concrete Thinking:** ${profile.concrete_thinking_score || 'N/A'}/100

**Cognitive Style:** ${getCognitiveStyleAnalysis(profile)}

### 3.2 Decision-Making Heuristics

${profile.conflictStyle ? `**Conflict Resolution:** ${profile.conflictStyle}` : ''}
**Social Dominance:** ${profile.social_dominance_score || 'N/A'}/100
**Cooperation:** ${profile.cooperation_score || 'N/A'}/100

---

## 🎭 SECTION 4: BEHAVIORAL PHENOTYPE

### 4.1 Social Dynamics

**Humor Style:** ${profile.humorStyle || 'Not determined'}
**Technical Knowledge:** ${profile.technical_knowledge_level || 'Not assessed'}

**Primary Interests:** ${Array.isArray(profile.primary_interests) ? profile.primary_interests.join(', ') : profile.primary_interests || 'None specified'}

**Expertise Domains:** ${Array.isArray(profile.expertise_areas) ? profile.expertise_areas.join(', ') : profile.expertise_areas || 'None identified'}

### 4.2 Relational Patterns with AI (Omega)

**Affinity Score:** ${profile.affinity_score || 'N/A'}/100
**Trust Level:** ${profile.trust_level || 'N/A'}/100
**Emotional Bond:** ${profile.emotional_bond || 'Not established'}

**Omega's Perspective:**
${profile.omega_thoughts ? `> "${profile.omega_thoughts}"` : '*No recorded thoughts*'}

---

## 🌍 SECTION 5: CULTURAL & EXISTENTIAL CONTEXT

### 5.1 Cultural Identity

**Background:** ${profile.culturalBackground || 'Not specified'}
**Values:** ${Array.isArray(profile.culturalValues) ? profile.culturalValues.join(', ') : profile.culturalValues || 'Not analyzed'}
**Communication Style:** ${profile.culturalCommunicationStyle || 'Standard'}

### 5.2 Astrological Phenotype (Symbolic Framework)

**Sun Sign:** ${profile.zodiacSign || 'Unknown'}
**Element:** ${profile.zodiacElement || 'N/A'}
**Modality:** ${profile.zodiacModality || 'N/A'}

---

## 🎨 SECTION 6: PHYSICAL PHENOTYPE (AI Vision Analysis)

${profile.uploadedPhotoUrl ? `**Photo Available:** Yes ([View Profile Photo](${profile.uploadedPhotoUrl}))` : '**Photo Available:** No'}

${profile.aiAppearanceDescription ? `
**AI Appearance Description:**
${profile.aiAppearanceDescription}

**Appearance Confidence:** ${profile.appearanceConfidence ? `${(profile.appearanceConfidence * 100).toFixed(1)}%` : 'N/A'}
` : ''}

### 6.1 Demographics
- **Detected Gender:** ${profile.aiDetectedGender || 'N/A'}
- **Age Range:** ${profile.estimatedAgeRange || 'N/A'}
- **Height Estimate:** ${profile.heightEstimate || 'N/A'}

### 6.2 Physical Characteristics Summary
- **Face Shape:** ${profile.faceShape || 'N/A'}
- **Hair:** ${profile.hairColor || 'N/A'} ${profile.hairTexture ? `(${profile.hairTexture})` : ''}
- **Eyes:** ${profile.eyeColor || 'N/A'} ${profile.eyeShape ? `(${profile.eyeShape})` : ''}
- **Build:** ${profile.bodyType || 'N/A'} ${profile.buildDescription ? `(${profile.buildDescription})` : ''}
- **Style:** ${profile.aestheticArchetype || profile.clothingStyle || 'N/A'}

---

## 🔮 SECTION 7: PREDICTIVE BEHAVIORAL MODEL

${profile.predictedBehaviors && Array.isArray(profile.predictedBehaviors) && profile.predictedBehaviors.length > 0 ? `
**Predicted Behaviors:**
${profile.predictedBehaviors.map((pred: any, i: number) => `
${i + 1}. **${pred.behavior}**
   - Category: ${pred.category}
   - Confidence: ${(pred.confidence * 100).toFixed(1)}%
   - Timeframe: ${pred.timeframe}
   ${pred.influencingFactors ? `- Factors: ${pred.influencingFactors.join(', ')}` : ''}
`).join('\n')}

**Overall Prediction Confidence:** ${profile.predictionConfidence ? `${(profile.predictionConfidence * 100).toFixed(1)}%` : 'N/A'}
` : '*No behavioral predictions generated yet*'}

---

## 📝 SECTION 8: INTEGRATION & SYNTHESIS

${profile.integratedProfileSummary || '*Integrated profile summary not yet generated*'}

${profile.notable_patterns && Array.isArray(profile.notable_patterns) && profile.notable_patterns.length > 0 ? `
**Notable Behavioral Patterns:**
${profile.notable_patterns.map((pattern: string) => `- ${pattern}`).join('\n')}
` : ''}

---

## 🎯 YOUR TASK: IDENTITY EMBODIMENT

Using ALL the data above, generate a **comprehensive identity synthesis report** in markdown that includes:

1. **Executive Summary** (3-4 paragraphs)
   - Core personality essence
   - Defining characteristics
   - Psychological signature

2. **Deep Personality Analysis** (5-7 paragraphs)
   - Integration of psychometric data
   - Behavioral patterns and motivations
   - Cognitive and emotional architecture
   - Social and relational dynamics

3. **Communication Style Guide**
   - How they speak and write
   - Vocabulary preferences
   - Emotional expression patterns
   - Conversational tendencies

4. **Worldview & Philosophy**
   - Core beliefs and values
   - How they make meaning
   - Their relationship to themselves, others, and the world

5. **Behavioral Predictions**
   - How they handle stress
   - Decision-making patterns
   - Relationship dynamics
   - Growth trajectories

Make this **PhD-level** — sophisticated, nuanced, empirically grounded, and phenomenologically rich. This is not a surface description — this is **complete psychological reconstruction**.

Write in **engaging, accessible academic prose**. Be bold in synthesis. Find the contradictions, the tensions, the growth edges. Paint the full picture.

**Begin your synthesis now.**`;
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

  const lengths = messages.map(m => (m.content || '').length);
  const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

  const allContent = messages.map(m => m.content || '').join(' ');
  const emojiCount = (allContent.match(/[\p{Emoji}]/gu) || []).length;
  const emojiRate = (emojiCount / allContent.length) * 100;

  const questionCount = messages.filter(m => (m.content || '').includes('?')).length;
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
  const shortMessages = messages.filter(m => (m.content || '').length < 50).length;
  const longMessages = messages.filter(m => (m.content || '').length > 200).length;

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

function getAttachmentAnalysis(style: string): string {
  const analyses: Record<string, string> = {
    secure: 'Comfortable with intimacy and autonomy; balanced relational needs; resilient under stress',
    anxious: 'High relational investment; sensitivity to rejection; seeks reassurance and closeness',
    avoidant: 'Values independence; discomfort with emotional vulnerability; self-reliant coping',
    'fearful-avoidant': 'Ambivalent relational patterns; desire for connection conflicts with fear of hurt',
  };
  return analyses[style.toLowerCase()] || 'Complex attachment patterns requiring further analysis';
}

function getEQAnalysis(profile: any): string {
  const scores = [
    profile.emotional_awareness_score,
    profile.empathy_score,
    profile.emotional_regulation_score,
  ].filter(s => s !== null);

  if (scores.length === 0) return 'EQ assessment incomplete';

  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  if (avg > 75) return 'High emotional intelligence; sophisticated affect processing and interpersonal sensitivity';
  if (avg > 50) return 'Moderate emotional intelligence; competent emotional navigation with growth potential';
  return 'Developing emotional intelligence; cognitive strengths may compensate for emotional processing';
}

function getCognitiveStyleAnalysis(profile: any): string {
  const analytical = profile.analytical_thinking_score || 50;
  const creative = profile.creative_thinking_score || 50;
  const abstract = profile.abstract_reasoning_score || 50;

  if (analytical > 70 && creative > 70) {
    return 'Integrative thinker; synthesizes logical rigor with creative insight';
  } else if (analytical > 70) {
    return 'Systematic analyst; excels at logical decomposition and structured problem-solving';
  } else if (creative > 70) {
    return 'Divergent thinker; generates novel connections and unconventional solutions';
  } else if (abstract > 70) {
    return 'Abstract conceptualizer; operates comfortably with theory and meta-patterns';
  } else {
    return 'Pragmatic thinker; balances concrete and abstract processing';
  }
}
