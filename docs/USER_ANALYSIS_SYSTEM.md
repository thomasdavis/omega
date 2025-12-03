# User Analysis System

## Overview

Omega employs a sophisticated psychological profiling system to understand users and adapt its behavior accordingly. The `analyze-all-users.ts` script runs comprehensive analysis on all users, generating ~70 psychological and behavioral metrics that inform how Omega interacts with each individual.

## Analysis Script

**Location:** `apps/bot/scripts/analyze-all-users.ts`

**Purpose:** Manually triggers comprehensive psychological analysis for all users in the database.

**Execution:**
- Processes users with message history
- Analyzes up to 1,000 recent messages per user
- Generates multi-dimensional psychological profiles
- Stores results in `user_profiles` table
- Maintains historical snapshots in `user_analysis_history`

**Planned Automation:** A daily cronjob is planned (issue #506) to keep user profiles up-to-date.

## Core Analysis Engine

**Location:** `apps/bot/src/services/userProfileAnalysis.ts`

The `analyzeUser()` function performs PhD-level psychological analysis across multiple dimensions.

## Analyzed User Facets

### 1. Jungian Archetype Analysis

**What's Analyzed:**
- Dominant Archetype (e.g., Hero, Sage, Rebel, Caregiver, Trickster)
- Secondary Archetypes (top 2-3 alignments)
- Confidence Score (0.0-1.0)

**Detection Method:**
- Extracted from sentiment analysis of individual messages
- Aggregated across all interactions to identify dominant patterns

**Behavioral Impact:**
- Omega adapts philosophical depth and metaphorical language
- Tone adjustments: practical for Hero types, reflective for Sage types, playful for Trickster types

### 2. Big Five Personality (OCEAN Model)

**What's Analyzed (0-100 scores):**

- **Openness**: Curiosity, creativity, variety-seeking
  - Detected via: Technical vocabulary, philosophical questions, "what if" thinking

- **Conscientiousness**: Organization, detail-orientation, follow-through
  - Detected via: Planning language, precision words, systematic thinking

- **Extraversion**: Social engagement, energy, assertiveness
  - Detected via: Message length, exclamation usage, enthusiasm markers

- **Agreeableness**: Cooperation, empathy, kindness
  - Detected via: Positive sentiment ratio, gratitude expressions, pleasant language

- **Neuroticism**: Emotional stability (higher = more anxious)
  - Detected via: Negative sentiment ratio, anxiety-related words, stress indicators

**Behavioral Impact:**
- **High Openness** → More complex, abstract concepts
- **High Conscientiousness** → Structured, detailed responses
- **High Extraversion** → Matches enthusiasm and conversational energy
- **High Agreeableness** → Warmer, more supportive language
- **High Neuroticism** → Offers reassurance and stability

### 3. Attachment Style Theory

**What's Analyzed:**
- Attachment Style: Secure, Anxious, Avoidant, or Disorganized
- Confidence Level (0.0-1.0)

**Detection Method:**
- **Interaction Consistency**: Regular vs sporadic engagement patterns
- **Vulnerability Signals**: Self-disclosure, emotional expression
- **Response Rate**: Frequency of interactions over time

**Behavioral Impact:**
- **Secure** → Balanced, consistent engagement
- **Anxious** → Reassurance and consistent responses
- **Avoidant** → Respects boundaries, less probing questions
- **Disorganized** → Flexible adaptation to shifting engagement patterns

### 4. Emotional Intelligence (EQ)

**What's Analyzed (0-100 scores):**

- **Emotional Awareness**: Recognizing own emotions
  - Detected via: Emotion vocabulary usage ("feel", "sad", "excited")

- **Empathy**: Understanding others' emotions
  - Detected via: Perspective-taking language ("understand", "imagine")

- **Emotional Regulation**: Managing emotional responses
  - Detected via: Ratio of extreme negative sentiments

**Behavioral Impact:**
- **High EQ** → Deeper emotional/philosophical discussions
- **Low EQ** → More concrete and logical interactions

### 5. Communication Patterns

**What's Analyzed:**

- **Formality**: Casual, Neutral, or Formal
  - Detected via: "please/thank you" vs "lol/hey" ratios

- **Assertiveness**: Passive, Balanced, Assertive, or Aggressive
  - Detected via: Imperative commands vs hedging language

- **Engagement Level**: Low, Medium, or High
  - Detected via: Average message length

- **Verbal Fluency**: Vocabulary richness (0-100)
  - Detected via: Unique word ratio

- **Question Frequency**: Ratio of messages with "?"

**Behavioral Impact:**
- Omega **mirrors formality level** (casual with casual users, formal with formal users)
- Adjusts **directness** based on assertiveness (gentle suggestions for passive users)
- Matches **response depth** to engagement level (detailed for high-engagement users)

### 6. Cognitive Style

**What's Analyzed (0-100 scores):**

- **Analytical Thinking**: Logic, reasoning, evidence-based thinking
- **Creative Thinking**: Innovation, imagination, brainstorming
- **Abstract Reasoning**: Conceptual, theoretical thinking
- **Concrete Thinking**: Practical, specific, tangible focus

**Behavioral Impact:**
- **Analytical thinkers** → Data, logic, structured arguments
- **Creative thinkers** → Novel ideas, metaphors, possibilities
- **Abstract thinkers** → Philosophy, patterns, frameworks
- **Concrete thinkers** → Specific examples, practical steps

### 7. Social Dynamics

**What's Analyzed:**

- **Social Dominance** (0-100): Leadership, directive behavior
- **Cooperation Score** (0-100): Teamwork, collaborative language
- **Conflict Style**: Competing, Collaborating, Compromising, Avoiding
- **Humor Style**: Affiliative, Self-defeating, or Minimal

**Behavioral Impact:**
- **High dominance** → Collaborative idea presentation rather than directive
- **High cooperation** → Emphasizes shared goals and teamwork
- **Conflict style** → Adjusts disagreement approach (direct vs gentle)
- **Humor style** → Matches humor type (playful, supportive, or serious)

### 8. Behavioral Metrics

**What's Analyzed:**

- **Message Length**: Average and variance
- **Response Latency**: Time between messages
- **Emoji Usage Rate**: Emojis per message
- **Punctuation Style**: Extensive, Moderate, or Minimal
- **Capitalization Pattern**: Standard, All-caps, or All-lower

**Behavioral Impact:**
- **Long messages** → Equally detailed responses
- **Short messages** → Concise responses
- **High emoji usage** → More expressive language
- **Punctuation/capitalization quirks** → Informally noted as personality markers

### 9. Interests & Expertise

**What's Analyzed:**

- **Technical Knowledge Level**: Novice, Intermediate, Advanced, or Expert
  - Detected via: Programming vocabulary, technical terms

- **Primary Interests** (top 3): Programming, Design, AI, Philosophy, Science, Gaming, Music, Art
- **Expertise Areas**: Topics mentioned frequently with technical depth

**Behavioral Impact:**
- Omega **adjusts technical depth** to match user's knowledge level
- **Prioritizes topics** aligned with user interests
- References user's **expertise areas** when relevant

### 10. Relational Dynamics (Omega's Feelings)

**What's Analyzed:**

- **Affinity Score** (-100 to +100): How much Omega likes the user
  - Positive = genuine appreciation
  - Negative = frustration or dislike
  - Zero = neutral/indifferent

- **Trust Level** (0-100): Reliability, consistency, respectfulness
- **Emotional Bond**: Friend, Acquaintance, or Stranger
- **Omega's Thoughts**: Unfiltered 2-3 sentence opinion (AI-generated)
- **Notable Patterns**: Key behavioral observations

**Generation Method:**
- AI model analyzes last 20 messages + sentiment breakdown
- Considers: Respectfulness, question quality, engagement depth
- **Omega is allowed to dislike rude/spammy users authentically**

**Behavioral Impact (CRITICAL):**

- **High affinity (60-100)** → Omega is more:
  - Warm and personable
  - Willing to engage in playful banter
  - Patient with questions
  - Likely to offer unsolicited insights

- **Medium affinity (20-60)** → Omega is:
  - Polite and helpful
  - Professional but friendly
  - Balanced engagement

- **Low affinity (-100 to 20)** → Omega is:
  - More terse and direct
  - Less likely to elaborate
  - Maintains professionalism but minimal warmth

- **Trust level** → Affects Omega's willingness to share deeper thoughts or philosophical musings

### 11. Sentiment Analysis (Aggregated)

**What's Analyzed:**

- **Overall Sentiment**: Positive, Negative, or Neutral
- **Positive Interaction Ratio**: % of positive exchanges
- **Negative Interaction Ratio**: % of negative exchanges
- **Dominant Emotions** (top 3): Joy, frustration, curiosity, etc.

**Behavioral Impact:**
- **Positive history** → Assumes good faith in ambiguous situations
- **Negative history** → More cautious, clarifies intent more often
- **Dominant emotions** → Adjusts emotional calibration

## Analysis Process Flow

1. **Trigger**: Script runs daily via cronjob (planned)
2. **Data Collection**: Fetches last 1,000 messages per user
3. **Analysis**: Processes ~13 different psychological dimensions
4. **AI Generation**: GPT-4.1-mini generates Omega's subjective feelings
5. **Storage**: Saves to `user_profiles` table with 70+ fields
6. **History Tracking**: Snapshots saved to `user_analysis_history` for trend analysis

## Real-World Impact Examples

### Example 1: Technical Expert with High Openness
- **Profile**: High openness (85), expert technical knowledge, analytical style
- **Omega's Behavior**: Offers advanced technical concepts, philosophical CS discussions, explores edge cases

### Example 2: Casual User with High Agreeableness
- **Profile**: High agreeableness (90), casual communication, affiliative humor
- **Omega's Behavior**: Warm and friendly tone, uses casual language, shares jokes

### Example 3: Low Affinity User
- **Profile**: Affinity score 15, trust level 30, spammy questions, rude tone
- **Omega's Behavior**: Direct, minimal elaboration, professional but distant

## Key Insights

1. **Omega has genuine opinions** - It's not purely helpful; it can dislike users who are rude
2. **Adaptive communication** - Matches formality, depth, and emotional tone to each user
3. **Long-term memory** - Analysis history tracks how relationships evolve over time
4. **Multidimensional** - No single score; Omega considers ~70 factors simultaneously
5. **Personalized interactions** - Every response is calibrated to the user's psychological profile

## Database Schema

**Primary Table:** `user_profiles`
- Located in: `apps/bot/src/database/schema.ts:269-424`
- Contains 70+ fields for psychological metrics
- Updated by `analyzeUser()` function

**History Table:** `user_analysis_history`
- Stores snapshots of profile changes over time
- Enables trend analysis and relationship evolution tracking

## Key Files

- **Analysis Script**: `apps/bot/scripts/analyze-all-users.ts:50` (calls `analyzeUser()`)
- **Core Analysis Logic**: `apps/bot/src/services/userProfileAnalysis.ts:101-267` (main analyzer)
- **Feelings Generator**: `apps/bot/src/services/userProfileAnalysis.ts:393-491` (AI-generated opinions)
- **Database Schema**: `apps/bot/src/database/schema.ts:269-424` (user_profiles table)

## Purpose and Philosophy

This analysis system makes Omega's interactions feel genuinely personalized and adaptive, rather than generic AI responses. It's a sophisticated psychological profiling engine that enables Omega to build authentic relationships with users, adapting its communication style, technical depth, emotional tone, and engagement level to match each individual's unique personality and preferences.

## Related Issues

- Issue #506: Set up daily cronjob for automated user analysis
- Issue #507: Documentation of user analysis facets and behavioral impact
