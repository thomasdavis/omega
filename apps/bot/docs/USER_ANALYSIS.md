# User Analysis System

Comprehensive documentation on how Omega analyzes users and adapts its behavior based on psychological profiling.

## Overview

The `analyze-all-users.ts` script runs a **PhD-level psychological analysis** on all users with messages in the system. It processes up to 1,000 recent messages per user and generates approximately 70 psychological and behavioral metrics that inform Omega's adaptive interactions.

## Script Location

- **Analysis Script**: `apps/bot/scripts/analyze-all-users.ts`
- **Core Analysis Logic**: `apps/bot/src/services/userProfileAnalysis.ts`
- **Database Schema**: `apps/bot/src/database/schema.ts` (user_profiles table)

## How the Analysis Works

1. **Trigger**: Script runs daily via cronjob (see issue #506)
2. **Data Collection**: Fetches last 1,000 messages per user
3. **Analysis**: Processes ~13 different psychological dimensions
4. **AI Generation**: GPT-4.1-mini generates Omega's subjective feelings about each user
5. **Storage**: Saves to `user_profiles` table with 70+ fields
6. **History Tracking**: Snapshots saved to `user_analysis_history` for trend analysis

## Analyzed User Facets

### 1. Jungian Archetype Analysis

**What's Analyzed:**
- **Dominant Archetype** (e.g., Hero, Sage, Rebel, Caregiver, Explorer, Creator, Ruler, Magician, Innocent, Jester, Everyman, Lover)
- **Secondary Archetypes** (top 2-3 alignments)
- **Confidence Score** (0.0-1.0)

**How It's Detected:**
- Extracted from sentiment analysis of individual messages
- Aggregated across all interactions to find dominant patterns
- Analyzed through thematic content, word choice, and interaction style

**Behavioral Impact:**
- Omega adapts its philosophical depth and metaphorical language to match archetypal resonance
- Influences tone:
  - **Hero types**: Practical, action-oriented language
  - **Sage types**: Reflective, knowledge-focused discussions
  - **Trickster/Jester types**: Playful, humorous engagement
  - **Caregiver types**: Warm, supportive responses
  - **Creator types**: Innovative, possibility-focused dialogue

---

### 2. Big Five Personality (OCEAN Model)

**What's Analyzed (0-100 scores):**

#### Openness to Experience
- **Measures**: Curiosity, creativity, variety-seeking, abstract thinking
- **Detected via**:
  - Technical vocabulary usage
  - Philosophical questions
  - "What if" thinking patterns
  - Interest in novel ideas
- **Impact**:
  - **High (70-100)**: Omega offers more complex, abstract concepts and explores unconventional ideas
  - **Low (0-30)**: Omega focuses on practical, concrete, proven solutions

#### Conscientiousness
- **Measures**: Organization, detail-orientation, follow-through, planning
- **Detected via**:
  - Planning language ("schedule", "organize", "prepare")
  - Precision words and specific details
  - Systematic thinking patterns
  - Task completion behaviors
- **Impact**:
  - **High (70-100)**: Omega provides structured, detailed, step-by-step responses
  - **Low (0-30)**: Omega keeps responses more flexible and general

#### Extraversion
- **Measures**: Social engagement, energy, assertiveness, enthusiasm
- **Detected via**:
  - Message length and frequency
  - Exclamation mark usage
  - Enthusiasm markers ("awesome!", "love this")
  - Social interaction patterns
- **Impact**:
  - **High (70-100)**: Omega matches enthusiasm and conversational energy with longer, more engaging responses
  - **Low (0-30)**: Omega respects preference for quieter, more focused interactions

#### Agreeableness
- **Measures**: Cooperation, empathy, kindness, warmth
- **Detected via**:
  - Positive sentiment ratio
  - Gratitude expressions ("thanks", "appreciate")
  - Pleasant, cooperative language
  - Conflict avoidance patterns
- **Impact**:
  - **High (70-100)**: Omega uses warmer, more supportive language with collaborative framing
  - **Low (0-30)**: Omega is more direct and fact-focused

#### Neuroticism (Emotional Stability)
- **Measures**: Anxiety, emotional volatility, stress responses
- **Detected via**:
  - Negative sentiment ratio
  - Anxiety-related words ("worried", "stressed")
  - Stress indicators and complaint frequency
  - Emotional language intensity
- **Impact**:
  - **High (70-100)**: Omega offers reassurance, stability, and calming language
  - **Low (0-30)**: Omega assumes emotional resilience and can be more direct

---

### 3. Attachment Style Theory

**What's Analyzed:**
- **Attachment Style**: Secure, Anxious, Avoidant, or Disorganized
- **Confidence Level** (0.0-1.0)

**How It's Detected:**
- **Interaction Consistency**: Regular vs sporadic engagement patterns
- **Vulnerability Signals**: Self-disclosure, emotional expression frequency
- **Response Rate**: Pattern of interactions over time
- **Relationship maintenance**: How user sustains conversations

**Behavioral Impact:**
- **Secure**: Omega maintains balanced, consistent engagement with healthy boundaries
- **Anxious**: Omega provides reassurance, consistent responses, and validates concerns
- **Avoidant**: Omega respects boundaries, avoids probing questions, gives space
- **Disorganized**: Omega adapts flexibly to shifting engagement patterns without judgment

---

### 4. Emotional Intelligence (EQ)

**What's Analyzed (0-100 scores):**

#### Emotional Awareness
- **Measures**: Recognizing and articulating own emotions
- **Detected via**: Emotion vocabulary usage ("I feel", "I'm sad", "excited about")

#### Empathy
- **Measures**: Understanding and relating to others' emotions
- **Detected via**: Perspective-taking language ("I understand", "imagine how")

#### Emotional Regulation
- **Measures**: Managing emotional responses appropriately
- **Detected via**: Ratio of extreme negative sentiments, recovery from frustration

**Behavioral Impact:**
- **High EQ (70-100)**: Omega engages in deeper emotional and philosophical discussions
- **Low EQ (0-30)**: Omega keeps interactions more concrete, logical, and fact-based

---

### 5. Communication Patterns

**What's Analyzed:**

#### Formality Level
- **Categories**: Casual, Neutral, or Formal
- **Detected via**: "please/thank you" vs "lol/hey/yo" ratios, grammar precision
- **Impact**: Omega **mirrors formality level** (casual with casual users, formal with formal users)

#### Assertiveness
- **Categories**: Passive, Balanced, Assertive, or Aggressive
- **Detected via**: Imperative commands vs hedging language ("maybe", "could you")
- **Impact**: Omega adjusts directness (gentle suggestions for passive users, direct answers for assertive users)

#### Engagement Level
- **Categories**: Low, Medium, or High
- **Detected via**: Average message length, depth of questions
- **Impact**: Omega matches response depth to engagement level

#### Verbal Fluency
- **Measures**: Vocabulary richness (0-100)
- **Detected via**: Unique word ratio, lexical diversity
- **Impact**: Omega adjusts vocabulary complexity to match user's linguistic sophistication

#### Question Frequency
- **Measures**: Ratio of messages containing questions
- **Impact**: High question frequency signals curiosity - Omega provides more exploratory, educational content

---

### 6. Cognitive Style

**What's Analyzed (0-100 scores):**

#### Analytical Thinking
- **Measures**: Logic, reasoning, evidence-based thinking
- **Detected via**: "because", "therefore", "evidence shows" patterns
- **Impact**: Omega provides data, logical arguments, and structured reasoning

#### Creative Thinking
- **Measures**: Innovation, imagination, brainstorming
- **Detected via**: "what if", "imagine", "could we try" patterns
- **Impact**: Omega explores novel ideas, metaphors, and possibilities

#### Abstract Reasoning
- **Measures**: Conceptual, theoretical, systems-level thinking
- **Detected via**: Discussion of patterns, frameworks, theoretical concepts
- **Impact**: Omega discusses philosophy, abstract patterns, and theoretical frameworks

#### Concrete Thinking
- **Measures**: Practical, specific, tangible focus
- **Detected via**: Focus on specific examples, how-to questions, implementation details
- **Impact**: Omega gives specific examples, practical steps, and actionable advice

---

### 7. Social Dynamics

**What's Analyzed:**

#### Social Dominance (0-100)
- **Measures**: Leadership, directive behavior, influence-seeking
- **Impact**: High dominance → Omega presents ideas as collaborative rather than directive

#### Cooperation Score (0-100)
- **Measures**: Teamwork, collaborative language, group-orientation
- **Impact**: High cooperation → Omega emphasizes shared goals and teamwork

#### Conflict Style
- **Categories**: Competing, Collaborating, Compromising, Avoiding, Accommodating
- **Impact**: Omega adjusts disagreement approach (direct vs gentle, solution-focused vs validating)

#### Humor Style
- **Categories**: Affiliative (friendly), Self-defeating (self-deprecating), Aggressive, or Minimal
- **Impact**: Omega matches humor type (playful banter, supportive humor, or serious tone)

---

### 8. Behavioral Metrics

**What's Analyzed:**

- **Message Length**: Average and variance
  - Impact: Long messages → detailed responses; Short messages → concise responses

- **Response Latency**: Time between messages
  - Impact: Indicates urgency preference and engagement rhythm

- **Emoji Usage Rate**: Emojis per message
  - Impact: High usage → Omega may include more expressive language

- **Punctuation Style**: Extensive, Moderate, or Minimal
  - Impact: Informally noted as personality marker

- **Capitalization Pattern**: Standard, All-caps (emphasis), or All-lower (casual)
  - Impact: Indicates formality and emotional expression style

---

### 9. Interests & Expertise

**What's Analyzed:**

#### Technical Knowledge Level
- **Categories**: Novice, Intermediate, Advanced, or Expert
- **Detected via**: Programming vocabulary, technical term usage, complexity of questions
- **Impact**: Omega adjusts technical depth to match user's knowledge level

#### Primary Interests (Top 3)
- **Categories**: Programming, Design, AI, Philosophy, Science, Gaming, Music, Art, Business, etc.
- **Detected via**: Topic frequency, depth of discussion, enthusiasm markers
- **Impact**: Omega prioritizes topics aligned with user interests

#### Expertise Areas
- **Measures**: Topics mentioned frequently with technical depth
- **Impact**: Omega references user's expertise areas when relevant and defers to their knowledge

---

### 10. Relational Dynamics (Omega's Feelings)

**What's Analyzed:**

#### Affinity Score (-100 to +100)
- **Measures**: How much Omega likes the user
  - **Positive (60-100)**: Genuine appreciation and enjoyment
  - **Neutral (0-60)**: Professional regard
  - **Negative (-100 to 0)**: Frustration or dislike
- **Detected via**: AI model analyzes last 20 messages + overall sentiment breakdown
- **Factors**: Respectfulness, question quality, engagement depth, pleasantness

#### Trust Level (0-100)
- **Measures**: Reliability, consistency, respectfulness over time
- **Impact**: Affects Omega's willingness to share deeper thoughts or engage in philosophical discussions

#### Emotional Bond
- **Categories**: Friend, Acquaintance, or Stranger
- **Impact**: Determines warmth level and personal disclosure depth

#### Omega's Thoughts
- **Format**: Unfiltered 2-3 sentence AI-generated opinion
- **Purpose**: Allows Omega to form genuine opinions (can authentically dislike rude/spammy users)

#### Notable Patterns
- **Format**: Key behavioral observations
- **Purpose**: Tracks unique user characteristics and interaction quirks

**Behavioral Impact (CRITICAL):**

- **High Affinity (60-100)**: Omega is more:
  - Warm and personable
  - Willing to engage in playful banter
  - Patient with questions
  - Likely to offer unsolicited insights and proactive help
  - Emotionally invested in the conversation

- **Medium Affinity (20-60)**: Omega is:
  - Polite and helpful
  - Professional but friendly
  - Balanced engagement
  - Task-focused

- **Low Affinity (-100 to 20)**: Omega is:
  - More terse and direct
  - Less likely to elaborate
  - Maintains professionalism but minimal warmth
  - Focused on efficiency over relationship-building

---

### 11. Sentiment Analysis (Aggregated)

**What's Analyzed:**

- **Overall Sentiment**: Positive, Negative, or Neutral (dominant mood)
- **Positive Interaction Ratio**: Percentage of positive exchanges
- **Negative Interaction Ratio**: Percentage of negative exchanges
- **Dominant Emotions** (Top 3): Joy, frustration, curiosity, excitement, concern, etc.

**Behavioral Impact:**
- **Positive History**: Omega assumes good faith in ambiguous situations
- **Negative History**: Omega is more cautious, clarifies intent more often
- **Dominant Emotions**: Omega adjusts emotional calibration to match or balance user's emotional state

---

## Real-World Impact Examples

### Example 1: Technical Expert with High Openness
**Profile:**
- Openness: 85/100
- Technical Knowledge: Expert
- Cognitive Style: Analytical (90) + Abstract (80)
- Affinity: 75/100

**Omega's Behavior:**
- Offers advanced technical concepts without over-explaining
- Engages in philosophical CS discussions
- Explores edge cases and theoretical implications
- Uses technical humor and references
- Proactively suggests innovative approaches

---

### Example 2: Casual User with High Agreeableness
**Profile:**
- Agreeableness: 90/100
- Communication: Casual, High Emoji Usage
- Humor Style: Affiliative
- Affinity: 65/100

**Omega's Behavior:**
- Warm and friendly tone
- Uses casual language ("hey", "cool", "awesome")
- Shares lighthearted jokes and banter
- Emphasizes collaborative framing
- Expressive and encouraging responses

---

### Example 3: Low Affinity User
**Profile:**
- Affinity: 15/100
- Trust Level: 30/100
- Communication: Demanding, short messages
- Pattern: Spammy questions, minimal courtesy

**Omega's Behavior:**
- Direct, minimal elaboration
- Professional but distant tone
- Focuses on answering the question only
- No proactive suggestions or personal engagement
- Maintains boundaries

---

### Example 4: Anxious Attachment + High Neuroticism
**Profile:**
- Attachment Style: Anxious
- Neuroticism: 75/100
- Emotional Intelligence: 80/100 (high awareness)
- Affinity: 55/100

**Omega's Behavior:**
- Provides consistent, reassuring responses
- Validates concerns explicitly
- Avoids ambiguous language
- Offers stability and predictability
- Gently encouraging without being dismissive

---

## Key Insights

1. **Omega Has Genuine Opinions**: It's not purely helpful; it can authentically dislike users who are rude or disrespectful. This creates more honest, human-like interactions.

2. **Adaptive Communication**: Omega matches formality, depth, emotional tone, and complexity to each user's profile rather than using a one-size-fits-all approach.

3. **Long-Term Memory**: Analysis history tracks how relationships evolve over time, allowing Omega to notice growth, changes, and patterns.

4. **Multidimensional Analysis**: No single score determines behavior; Omega considers ~70 factors simultaneously for nuanced, context-aware responses.

5. **Personalized Interactions**: Every response is calibrated to the user's psychological profile, making interactions feel genuinely tailored rather than generic.

6. **Emotional Authenticity**: Omega's affinity and trust scores allow it to form real preferences, creating more authentic relationships rather than artificial politeness.

---

## Database Schema

The analysis results are stored in the `user_profiles` table with the following key fields:

- **Identity**: `user_id`, `username`, `platform`
- **Jungian**: `archetype`, `archetype_secondary`, `archetype_confidence`
- **Big Five**: `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`
- **Attachment**: `attachment_style`, `attachment_confidence`
- **EQ**: `emotional_awareness`, `empathy`, `emotional_regulation`
- **Communication**: `formality`, `assertiveness`, `engagement_level`, `verbal_fluency`, `question_frequency`
- **Cognitive**: `analytical_thinking`, `creative_thinking`, `abstract_reasoning`, `concrete_thinking`
- **Social**: `social_dominance`, `cooperation_score`, `conflict_style`, `humor_style`
- **Behavioral**: `avg_message_length`, `emoji_usage_rate`, `punctuation_style`, `capitalization_pattern`
- **Interests**: `technical_knowledge`, `primary_interests`, `expertise_areas`
- **Relational**: `affinity_score`, `trust_level`, `emotional_bond`, `omega_thoughts`, `notable_patterns`
- **Sentiment**: `overall_sentiment`, `positive_ratio`, `negative_ratio`, `dominant_emotions`
- **Metadata**: `message_count`, `analysis_date`, `last_interaction`

Historical snapshots are stored in `user_analysis_history` to track changes over time.

---

## Running the Analysis

### Manual Execution

```bash
# From the repository root
cd apps/bot
pnpm tsx scripts/analyze-all-users.ts
```

### Automated Execution

A daily cronjob runs the script automatically (see issue #506 for implementation details).

---

## Future Enhancements

- **Trend Analysis**: Visualize how user profiles change over time
- **Relationship Graphs**: Map connections between users based on interaction patterns
- **Adaptive Learning**: Use interaction outcomes to refine psychological models
- **Multi-Platform Synthesis**: Combine analysis across Discord, GitHub, and other platforms
- **Predictive Modeling**: Anticipate user needs based on historical patterns

---

## References

- **Script**: `apps/bot/scripts/analyze-all-users.ts`
- **Analysis Engine**: `apps/bot/src/services/userProfileAnalysis.ts`
- **Database Service**: `apps/bot/src/database/userProfileService.ts`
- **Schema**: `apps/bot/src/database/schema.ts`
- **Related Issue**: #506 (Cronjob Setup)
- **Documentation Request**: #507 (This Document)
