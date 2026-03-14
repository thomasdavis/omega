# PRD: Expert Panel Personality Profiling System

> **Version:** 1.0
> **Date:** 2026-03-15
> **Status:** Draft
> **Author:** Claude Code (synthesized from 11-expert panel analysis)
> **Depends on:** `docs/EXPERT_PANEL_ANALYSIS.md` (expert findings)

---

## 1. Problem Statement

Omega's current user profiling system has a sophisticated 3-pass architecture (batch summarization → temporal synthesis → GPT-5 comprehensive analysis) but rests on a fundamentally broken measurement foundation. An independent review by 11 expert agents unanimously identified the same core deficiencies:

1. **Big Five trait scoring uses regex word-counting** (`calculateBigFiveScores`, line 1147 of `userProfileAnalysis.ts`). Baseline 50 + word frequency bonuses capped at 100. Cannot distinguish discussing a trait from exhibiting it. Confounds vocabulary with disposition.

2. **No unconscious/depth layer.** The system only measures conscious self-presentation. Defense mechanisms, shadow content, projection, repression, and performed virtue are invisible.

3. **No relational/dyadic analysis.** Profiles exist in isolation. The system never models how users affect each other — no influence graph, no coalition detection, no grooming networks.

4. **Predictions have zero feedback loop.** `prediction_accuracy_score` (schema line 173) exists but is never populated. No Brier scores, no base rates, no verification.

5. **Static snapshots, not temporal dynamics.** No state-vs-trait distinction. A 2 AM stress spiral and a Saturday morning message are treated as equally weighted samples from a stable distribution.

---

## 2. Goals

### Primary
- **G1:** Replace regex-based trait scoring with AI-powered contextual extraction using the existing GPT-5 pipeline
- **G2:** Add an 11-agent expert panel as Pass 3.5, each independently evaluating the user through a distinct analytical lens
- **G3:** Add depth psychology layer: defense mechanisms, shadow detection, unconscious drives, topic avoidance
- **G4:** Add relational analysis: influence susceptibility, coalition detection, behavioral ecology strategies
- **G5:** Build prediction feedback loop with accuracy tracking and Brier scores
- **G6:** Overhaul the web UI with Recharts visualizations, tabbed layout, and a comparison page

### Non-Goals
- Real-time analysis (batch scheduled analysis is fine)
- Breaking backwards compatibility (all new fields nullable)
- Replacing the existing 3-pass architecture (augment it with Pass 3.5)
- Mobile-first UI (desktop-first is acceptable)
- Photo/appearance analysis changes (out of scope)

---

## 3. Current System Architecture

### 3.1 Analysis Pipeline (`packages/agent/src/services/userProfileAnalysis.ts`)

```
Entry: analyzeUser(userId, username) — line 330
  │
  ├─ Data Collection: collectUserData() — line 587
  │   ├─ Fetch up to 5000 user messages (MESSAGE_COLLECTION_CONFIG.MAX_MESSAGES_TO_FETCH)
  │   ├─ Fetch channel context from top 10 channels, 500 msgs each
  │   └─ Compute behavioral metrics (message length, emoji rate, timing, etc.)
  │
  ├─ Pass 1: batchSummarizeMessages() — messageSummarizer.ts:61
  │   ├─ Split messages into 100-msg batches
  │   └─ Summarize 5 batches concurrently (CONCURRENCY_LIMIT: 5)
  │
  ├─ Pass 2: synthesizeTemporalNarrative() — messageSummarizer.ts:198
  │   └─ Feed all batch summaries → single AI call → ~1000-word temporal narrative
  │
  ├─ Pass 3: generateComprehensiveAnalysis() — line 857
  │   ├─ Model: gpt-5 (PROFILE_ANALYSIS_MODEL)
  │   ├─ Input: temporal synthesis + 50 raw messages + existing profile + quantitative scores
  │   ├─ Output: ComprehensiveAnalysisSchema (17 fields, lines 255-273)
  │   │   ├─ omegaRating (1-100), omegaRatingReason
  │   │   ├─ sentiment, trustLevel, affinityScore, thoughts
  │   │   ├─ facets[], notablePatterns[]
  │   │   └─ 9 long-form essays (200-5000 chars each):
  │   │       psychologicalProfile, communicationAnalysis, relationshipNarrative,
  │   │       personalityEvolution, behavioralDeepDive, interestsAnalysis,
  │   │       emotionalLandscape, socialDynamicsAnalysis, interactionStyleWithOthers
  │   └─ Uses: generateText() + Output.object() with openai.chat(PROFILE_ANALYSIS_MODEL)
  │
  ├─ Quantitative Scoring (regex-based, runs before Pass 3):
  │   ├─ calculateBigFiveScores() — line 1147 (baseline 50 + word freq bonuses, max 100)
  │   ├─ analyzeAttachmentStyle() — line 1203 (heuristic: vulnerability words + timing gaps)
  │   ├─ analyzeEmotionalIntelligence() — line 1246 (emotion word count × 300 multiplier)
  │   ├─ analyzeCognitiveStyle() — line 1318 (word count × 250 multiplier)
  │   └─ analyzeSocialDynamics() — line 1339 (directive/cooperative word counting)
  │
  ├─ Profile Update: updateUserProfile() — stores all scores + essays
  ├─ History Snapshot: saveAnalysisHistory() — immutable snapshot to user_analysis_history
  └─ Predictions: updateUserPredictions() — behavioralPredictionService.ts:237
```

### 3.2 Database Schema (`packages/database/prisma/schema.prisma`)

- **UserProfile model:** 230 columns (lines 100-235)
- **UserAnalysisHistory model:** ~20 snapshot fields (lines 238-269)
- Key field groups: Big Five (5), Archetypes (4), Attachment (2), EI (3), Cognitive (4), Social (4), Predictions (5), Deep essays (9)
- All timestamps: BigInt Unix seconds
- All scores: Int 0-100 or Float 0-1

### 3.3 Behavioral Predictions (`packages/agent/src/services/behavioralPredictionService.ts`)

- Model: `gpt-5` (line 22)
- Generates 3-5 predictions with confidence 0.3-0.8 (hardcoded in Zod schema, line 43)
- Categories: communication, emotional, social, cognitive, interests
- Timeframes: 7, 14, or 30 days
- **No feedback loop.** `prediction_accuracy_score` field exists but is never written.

### 3.4 Web UI (`apps/web/app/profiles/[username]/page.tsx`)

- 1213 lines, single-file page component
- 11 inline UI components: ScoreBar, Pills, Badge, TextField, PredictionCard, DataField, Section, OmegaRatingBar, EssaySection, NumberDiff, TextDiff, AnalysisHistoryViewer
- 25+ sections rendered sequentially (no tabs)
- No charting library — all text, bars, badges
- Dark theme: zinc-950/900/800, teal-400 accents

### 3.5 Message Collection Config (`packages/agent/src/services/messageSummarizer.ts`)

```typescript
MESSAGE_COLLECTION_CONFIG = {
  MAX_MESSAGES_TO_FETCH: 5000,    // Total messages per user
  BATCH_SIZE: 100,                // Pass 1 batch size
  RECENT_RAW_MESSAGES: 50,        // Verbatim messages sent to Pass 3
  MAX_CHANNELS_TO_FETCH: 10,      // Channel context breadth
  MESSAGES_PER_CHANNEL: 500,      // Channel context depth
  CONCURRENCY_LIMIT: 5,           // Parallel batch summarization
}
```

---

## 4. Technical Design

### 4.1 Pass 3.5: Expert Panel Service

**New file:** `packages/agent/src/services/expertPanelService.ts`

#### 4.1.1 Architecture

11 expert agents run in parallel via `Promise.all()`, each as a separate `generateText()` + `Output.object()` call. A 12th meta-synthesis call integrates all verdicts. Total: 12 parallel-then-sequential AI calls per user analysis.

```typescript
// Entry point
export async function runExpertPanel(
  username: string,
  userId: string,
  data: UserAnalysisData,
  temporalSynthesis: TemporalSynthesis,
  comprehensiveAnalysis: ComprehensiveAnalysisResult,
  quantitativeScores: QuantitativeScores,
  previousExpertPanel: ExpertPanelResult | null,
): Promise<ExpertPanelResult>
```

#### 4.1.2 Expert Input Context (shared by all 11)

Each expert receives the same data package:
1. **Temporal synthesis narrative** (~1000 words, from Pass 2)
2. **50 recent raw messages** (verbatim, from `RECENT_RAW_MESSAGES` config)
3. **Comprehensive analysis result** (17 fields from Pass 3)
4. **Quantitative scores** (Big Five, EI, cognitive, social — from regex functions)
5. **Previous expert panel verdicts** (if re-analysis, for Bayesian updating)

#### 4.1.3 The 11 Experts — System Prompts and Output Schemas

Each expert has: a system prompt defining their personality/perspective, and a Zod output schema for structured extraction.

**Expert 1: Dr. IO — Industrial-Organizational Psychologist**
```
Personality: Clinical, data-driven, pragmatic. Speaks in organizational behavior terminology.
Focus: Leadership emergence, team role, motivational hierarchy, organizational citizenship, productivity patterns.
```
```typescript
const IOSchema = z.object({
  leadershipPotential: z.number().min(0).max(100),
  leadershipPotentialCI: z.object({ low: z.number(), high: z.number() }),
  teamRole: z.enum(['driver', 'analyst', 'collaborator', 'supporter', 'innovator', 'mediator']),
  motivationalHierarchy: z.array(z.enum(['belonging', 'esteem', 'self_actualization', 'safety', 'autonomy', 'competence'])),
  organizationalCitizenship: z.number().min(0).max(100),
  productivityPattern: z.enum(['consistent_performer', 'burst_worker', 'social_focused', 'lurker', 'deadline_driven']),
  initiativeTaking: z.number().min(0).max(100),
  feedbackOrientation: z.enum(['seeking', 'giving', 'avoidant', 'balanced']),
  essay: z.string().min(300).max(1500).describe('Workplace behavior assessment in IO voice'),
});
```

**Expert 2: Dr. Peterson — Petersonian Depth Analyst**
```
Personality: Intense, precise, confronts uncomfortable truths. Uses "roughly speaking." Focuses on meaning.
Focus: Big Five interaction effects, meaning vs nihilism, order-chaos balance, responsibility, narrative coherence, competence trajectory.
```
```typescript
const PetersonSchema = z.object({
  orderChaosBalance: z.number().min(0).max(100),
  responsibilityIndex: z.number().min(0).max(100),
  meaningOrientation: z.enum(['meaning_seeking', 'nihilistic', 'hedonistic', 'duty_bound', 'purpose_driven']),
  competenceTrajectory: z.enum(['ascending', 'plateau', 'descending', 'disengaged']),
  narrativeCoherence: z.number().min(0).max(100),
  bigFiveInteractionEffects: z.array(z.object({
    traitPair: z.string(),
    interpretation: z.string(),
    clinicalSignificance: z.enum(['low', 'medium', 'high']),
  })).min(3).max(8),
  bigFiveDeepInterpretation: z.string().min(300).max(1500).describe('What the Big Five COMBINATION means, not individual scores'),
  essay: z.string().min(300).max(1500).describe('Assessment in Peterson voice'),
});
```

**Expert 3: Dr. Jung — Jungian Depth Psychologist**
```
Personality: Mystical yet precise. Speaks in archetypal metaphors. Sees symbolic meaning in mundane communication.
Focus: Archetypes (primary/secondary/shadow), individuation stage, shadow integration, persona-self gap, anima/animus.
```
```typescript
const JungSchema = z.object({
  primaryArchetype: z.string(),
  secondaryArchetype: z.string(),
  shadowArchetype: z.string(),
  individuationStage: z.enum(['ego_identified', 'shadow_encounter', 'anima_animus_integration', 'self_realization']),
  shadowIntegration: z.number().min(0).max(100),
  personaAuthenticityGap: z.number().min(0).max(100),
  animaAnimusBalance: z.number().min(0).max(100),
  collectiveUnconsciousThemes: z.array(z.string()).min(1).max(5),
  projectionPatterns: z.array(z.string()).max(5).describe('Qualities this person projects onto others'),
  shadowProfileEssay: z.string().min(300).max(1500).describe('What the user represses, avoids, projects'),
  essay: z.string().min(300).max(1500).describe('Archetypal analysis in Jung voice'),
});
```

**Expert 4: Dr. Sapolsky — Neurobiological Analyst**
```
Personality: Warm Stanford professor. Primate analogies. Self-deprecating humor. Connects behavior to biology accessibly.
Focus: Stress response, dopamine/serotonin patterns, primate hierarchy, behavioral ecology, state vs trait.
```
```typescript
const SapolskySchema = z.object({
  stressResponsePattern: z.enum(['fight', 'flight', 'freeze', 'tend_and_befriend', 'adaptive']),
  dopamineSeekingScore: z.number().min(0).max(100),
  serotoninStabilityScore: z.number().min(0).max(100),
  socialHierarchyPosition: z.enum(['alpha', 'beta', 'gamma', 'omega', 'nomad']),
  behavioralEcologyStrategy: z.enum(['hawk', 'dove', 'bourgeois', 'retaliator', 'tit_for_tat']),
  stressChronotype: z.string().max(500).describe('Temporal signature of stress behavior'),
  recoverySpeed: z.enum(['fast', 'moderate', 'slow', 'non_recovering']),
  neurobiologicalProfileEssay: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500).describe('Assessment in Sapolsky voice'),
});
```

**Expert 5: Dr. Bernays — Influence & Propaganda Analyst**
```
Personality: Cool, calculating, 1920s Madison Avenue exec. Sees every interaction as influence dynamics.
Focus: Cialdini's 6 principles, persuadability, memetic role, group psychology, propaganda vulnerability.
```
```typescript
const BernaysSchema = z.object({
  persuadabilityIndex: z.number().min(0).max(100),
  influenceSusceptibility: z.object({
    socialProof: z.number().min(0).max(100),
    authority: z.number().min(0).max(100),
    scarcity: z.number().min(0).max(100),
    reciprocity: z.number().min(0).max(100),
    commitment: z.number().min(0).max(100),
    liking: z.number().min(0).max(100),
  }),
  memeticRole: z.enum(['originator', 'amplifier', 'curator', 'passive_consumer', 'contrarian']),
  groupPsychologyType: z.enum(['leader', 'early_adopter', 'follower', 'contrarian', 'observer']),
  propagandaVulnerability: z.number().min(0).max(100),
  influenceNetworkRole: z.enum(['hub', 'bridge', 'peripheral', 'isolate']),
  marketingPersona: z.string().max(500),
  essay: z.string().min(300).max(1500).describe('Influence analysis in Bernays voice'),
});
```

**Expert 6: Dr. Freud — Psychoanalytic Analyst**
```
Personality: Probing, formal Viennese cadence. Reads between lines. Focused on what people DON'T say.
Focus: Defense mechanisms, id/ego/superego, unconscious drives, transference, repression, sublimation.
```
```typescript
const FreudSchema = z.object({
  defenseMechanismPrimary: z.enum(['denial', 'projection', 'rationalization', 'displacement', 'sublimation', 'reaction_formation', 'regression', 'intellectualization']),
  defenseMechanismSecondary: z.enum(['denial', 'projection', 'rationalization', 'displacement', 'sublimation', 'reaction_formation', 'regression', 'intellectualization']),
  idEgoSuperego: z.object({
    id: z.number().min(0).max(100),
    ego: z.number().min(0).max(100),
    superego: z.number().min(0).max(100),
  }),
  repressionIndex: z.number().min(0).max(100),
  transferencePattern: z.enum(['idealizing', 'mirroring', 'twinship', 'adversarial', 'none']),
  sublimationScore: z.number().min(0).max(100),
  avoidedTopics: z.array(z.string()).max(5),
  unconsciousDrivesEssay: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500).describe('Psychoanalytic assessment in Freud voice'),
});
```

**Expert 7: Dr. Kahneman — Cognitive Bias & Decision Analyst**
```
Personality: Quietly brilliant. Skeptical of human rationality including his own. Probability language. Humble but devastating.
Focus: System 1/2, cognitive biases, loss aversion, overconfidence, decision quality, calibration.
```
```typescript
const KahnemanSchema = z.object({
  system1Dominance: z.number().min(0).max(100).describe('0=deliberate, 100=intuitive'),
  cognitiveBiasProfile: z.array(z.object({
    bias: z.string(),
    severity: z.number().min(0).max(100),
    evidence: z.string().max(200),
  })).min(3).max(5),
  lossAversionScore: z.number().min(0).max(100),
  anchoringSusceptibility: z.number().min(0).max(100),
  overconfidenceIndex: z.number().min(0).max(100),
  decisionQualityScore: z.number().min(0).max(100),
  cognitiveReflectionScore: z.number().min(0).max(100),
  decisionMakingEssay: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500).describe('Cognitive analysis in Kahneman voice'),
});
```

**Expert 8: Dr. Nietzsche — Existential & Values Analyst**
```
Personality: Fierce, poetic, contemptuous of mediocrity, admiring of authenticity. Aphoristic.
Focus: Will to power, master/slave morality, eternal recurrence, ressentiment, amor fati, value creation.
```
```typescript
const NietzscheSchema = z.object({
  willToPowerScore: z.number().min(0).max(100),
  masterSlaveMorality: z.enum(['master', 'slave', 'hybrid', 'transcendent']),
  eternalRecurrenceEmbrace: z.number().min(0).max(100),
  ubermenschAlignment: z.number().min(0).max(100),
  ressentimentScore: z.number().min(0).max(100),
  valueCreation: z.enum(['creator', 'adopter', 'rebel', 'nihilist']),
  amorFatiScore: z.number().min(0).max(100),
  existentialPhilosophyEssay: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500).describe('Assessment in Nietzsche voice'),
});
```

**Expert 9: Caesar — Strategic Assessor**
```
Personality: Imperial authority. Strategic. Evaluates people as assets or threats.
Focus: Strategic value, loyalty, leadership vs followership, behavior under duress, decisiveness.
```
```typescript
const CaesarSchema = z.object({
  strategicValueScore: z.number().min(0).max(100),
  loyaltyReliabilityIndex: z.number().min(0).max(100),
  caesarClassification: z.enum(['legionnaire', 'centurion', 'tribune', 'senator', 'potential_threat']),
  courageScore: z.number().min(0).max(100),
  decisivenessScore: z.number().min(0).max(100),
  essay: z.string().min(300).max(900).describe('Strategic assessment in Caesar voice'),
});
```

**Expert 10: Genghis Khan — Meritocratic Evaluator**
```
Personality: Brutally honest. Respects only competence. Contemptuous of soft metrics.
Focus: Raw capability, adaptability, resilience, correction acceptance, practical vs academic intelligence.
```
```typescript
const KhanSchema = z.object({
  meritocraticWorthScore: z.number().min(0).max(100),
  adaptabilityScore: z.number().min(0).max(100),
  resilienceScore: z.number().min(0).max(100),
  correctionAcceptanceRate: z.enum(['integrates', 'partial', 'ignores', 'hostile']),
  practicalIntelligence: z.number().min(0).max(100),
  essay: z.string().min(300).max(900).describe('Assessment in Khan voice'),
});
```

**Expert 11: Machiavelli — Political Strategist**
```
Personality: Coldly analytical, amoral observer. Sees through pretension.
Focus: Political intelligence, virtù, fox vs lion, performed virtue detection, alliance patterns.
```
```typescript
const MachiavelliSchema = z.object({
  politicalIntelligenceScore: z.number().min(0).max(100),
  virtuScore: z.number().min(0).max(100),
  foxLionProfile: z.enum(['fox', 'lion', 'both', 'neither']),
  performedVirtueIndex: z.number().min(0).max(100).describe('0=genuine, 100=pure performance'),
  behavioralFlexibility: z.number().min(0).max(100),
  essay: z.string().min(300).max(900).describe('Political analysis in Machiavelli voice'),
});
```

#### 4.1.4 Meta-Synthesis (12th Call)

After all 11 experts return, a meta-analyst synthesizes:

```typescript
const MetaSynthesisSchema = z.object({
  // Consensus
  expertConsensusScore: z.number().min(0).max(100).describe('How much the experts agree overall'),
  consensusAreas: z.array(z.object({
    dimension: z.string(),
    consensusValue: z.string(),
    agreementLevel: z.number().min(0).max(100),
  })).min(3).max(10),

  // Dissent
  dissentAreas: z.array(z.object({
    dimension: z.string(),
    expertA: z.string(),
    positionA: z.string(),
    expertB: z.string(),
    positionB: z.string(),
    significance: z.enum(['low', 'medium', 'high']),
  })).max(8),
  dissentSummary: z.string().min(200).max(1500),

  // Confidence intervals (derived from inter-expert variance)
  confidenceIntervals: z.record(z.string(), z.object({
    mean: z.number(),
    low: z.number(),
    high: z.number(),
    expertVariance: z.number(),
  })),

  // Inter-rater reliability
  interRaterReliability: z.number().min(0).max(1).describe('ICC approximation'),

  // Bayesian-updated Big Five (fuses regex baseline with expert assessments)
  bayesianBigFive: z.object({
    openness: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    conscientiousness: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    extraversion: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    agreeableness: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    neuroticism: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
  }),

  // Growth trajectory
  growthTrajectory: z.string().min(200).max(1500),

  // Integrated verdict
  integratedVerdict: z.string().min(500).max(3000).describe('2-3 paragraph synthesis from all 11 perspectives'),
});
```

#### 4.1.5 Bayesian Updating

When prior expert panel data exists (`previousExpertPanel`), scores are fused:

```
final_score = (regex_score × 0.1 + prior_expert_score × 0.3 + new_expert_score × 0.6)
```

This gives strong weight to fresh expert assessment, moderate weight to prior expert assessment (continuity), and minimal weight to regex baseline (backwards compatibility seed).

#### 4.1.6 Integration Point

**File:** `packages/agent/src/services/userProfileAnalysis.ts`
**Location:** After line 395 (after `generateComprehensiveAnalysis()`)

```typescript
// Pass 3.5: Expert Panel Analysis
console.log('   Pass 3.5: Running Expert Panel analysis (11 agents)...');
const expertPanel = await runExpertPanel(
  username,
  userId,
  data,
  temporalSynthesis,
  comprehensive,
  { bigFive, emotionalIntelligence, cognitiveStyle, socialDynamics, attachmentStyle },
  existingProfile?.expert_panel_json ?? null,
);
```

Expert panel results stored via the existing `updateUserProfile()` call (lines 439-535) — individual scalar fields for queryable scores + `expert_panel_json` for full raw output.

### 4.2 Prediction Feedback Loop

**File:** `packages/agent/src/services/behavioralPredictionService.ts`

#### 4.2.1 Prediction Tracking

Add a new function `evaluatePredictions()` that runs before generating new predictions:

```typescript
export async function evaluatePredictions(userId: string): Promise<{
  evaluated: number;
  accurate: number;
  brierScore: number;
}>
```

Logic:
1. Load existing predictions where `last_prediction_at + timeframe_days < now`
2. For each expired prediction, use GPT-5 to evaluate whether the behavior occurred (analyzing recent messages)
3. Compute Brier score: `BS = (1/N) * Σ(confidence - outcome)²` where outcome = 0 or 1
4. Store result in `prediction_accuracy_score`
5. Feed accuracy history into next prediction generation as calibration context

#### 4.2.2 Remove Hardcoded Confidence Range

Change Zod schema from `z.number().min(0.3).max(0.8)` to `z.number().min(0.05).max(0.95)` — let the model express genuine confidence. Add instruction in system prompt to use base rates and historical accuracy.

---

### 4.3 Database Schema Changes

**File:** `packages/database/prisma/schema.prisma`
**Migration:** `packages/database/scripts/add-expert-panel-fields.sh`

All new fields are **nullable** for backwards compatibility. Existing profiles are unaffected.

#### 4.3.1 New Fields on UserProfile Model

```prisma
// ─── Expert Panel Core ───
expert_panel_json             Json?    @map("expert_panel_json")
expert_panel_version          Int?     @default(0) @map("expert_panel_version")
expert_panel_timestamp        BigInt?  @map("expert_panel_timestamp")

// ─── IO Psychologist ───
leadership_potential          Int?     @map("leadership_potential")
leadership_potential_ci_low   Int?     @map("leadership_potential_ci_low")
leadership_potential_ci_high  Int?     @map("leadership_potential_ci_high")
team_role                     String?  @map("team_role")
motivational_hierarchy        Json?    @map("motivational_hierarchy")
organizational_citizenship    Int?     @map("organizational_citizenship")
productivity_pattern          String?  @map("productivity_pattern")
initiative_taking_score       Int?     @map("initiative_taking_score")
feedback_orientation          String?  @map("feedback_orientation")

// ─── Peterson ───
order_chaos_balance           Int?     @map("order_chaos_balance")
responsibility_index          Int?     @map("responsibility_index")
meaning_orientation           String?  @map("meaning_orientation")
competence_trajectory         String?  @map("competence_trajectory")
narrative_coherence_score     Int?     @map("narrative_coherence_score")
big_five_deep_interpretation  String?  @map("big_five_deep_interpretation") @db.Text
big_five_interaction_effects  Json?    @map("big_five_interaction_effects")

// ─── Jung ───
individuation_stage           String?  @map("individuation_stage")
shadow_integration_score      Int?     @map("shadow_integration_score")
persona_authenticity_gap      Int?     @map("persona_authenticity_gap")
anima_animus_balance          Int?     @map("anima_animus_balance")
collective_unconscious_themes Json?    @map("collective_unconscious_themes")
projection_patterns           Json?    @map("projection_patterns")
archetype_constellation_essay String?  @map("archetype_constellation_essay") @db.Text
shadow_profile_essay          String?  @map("shadow_profile_essay") @db.Text

// ─── Sapolsky ───
stress_response_pattern       String?  @map("stress_response_pattern")
dopamine_seeking_score        Int?     @map("dopamine_seeking_score")
serotonin_stability_score     Int?     @map("serotonin_stability_score")
social_hierarchy_position     String?  @map("social_hierarchy_position")
behavioral_ecology_strategy   String?  @map("behavioral_ecology_strategy")
stress_chronotype             String?  @map("stress_chronotype")
recovery_speed                String?  @map("recovery_speed")
neurobiological_profile       String?  @map("neurobiological_profile") @db.Text

// ─── Bernays ───
persuadability_index          Int?     @map("persuadability_index")
influence_susceptibility      Json?    @map("influence_susceptibility")
memetic_role                  String?  @map("memetic_role")
group_psychology_type         String?  @map("group_psychology_type")
propaganda_vulnerability      Int?     @map("propaganda_vulnerability")
influence_network_role        String?  @map("influence_network_role")

// ─── Freud ───
defense_mechanism_primary     String?  @map("defense_mechanism_primary")
defense_mechanism_secondary   String?  @map("defense_mechanism_secondary")
id_ego_superego_balance       Json?    @map("id_ego_superego_balance")
repression_index              Int?     @map("repression_index")
transference_pattern          String?  @map("transference_pattern")
sublimation_score             Int?     @map("sublimation_score")
avoided_topics                Json?    @map("avoided_topics")
unconscious_drives_essay      String?  @map("unconscious_drives_essay") @db.Text

// ─── Kahneman ───
system1_dominance             Int?     @map("system1_dominance")
cognitive_bias_profile        Json?    @map("cognitive_bias_profile")
loss_aversion_score           Int?     @map("loss_aversion_score")
anchoring_susceptibility      Int?     @map("anchoring_susceptibility")
overconfidence_index          Int?     @map("overconfidence_index")
decision_quality_score        Int?     @map("decision_quality_score")
cognitive_reflection_score    Int?     @map("cognitive_reflection_score")
decision_making_essay         String?  @map("decision_making_essay") @db.Text

// ─── Nietzsche ───
will_to_power_score           Int?     @map("will_to_power_score")
master_slave_morality         String?  @map("master_slave_morality")
eternal_recurrence_embrace    Int?     @map("eternal_recurrence_embrace")
ubermensch_alignment          Int?     @map("ubermensch_alignment")
ressentiment_score            Int?     @map("ressentiment_score")
value_creation_orientation    String?  @map("value_creation_orientation")
amor_fati_score               Int?     @map("amor_fati_score")
existential_philosophy_essay  String?  @map("existential_philosophy_essay") @db.Text

// ─── Caesar ───
strategic_value_score         Int?     @map("strategic_value_score")
loyalty_reliability_index     Int?     @map("loyalty_reliability_index")
caesar_classification         String?  @map("caesar_classification")
courage_score                 Int?     @map("courage_score")
decisiveness_score            Int?     @map("decisiveness_score")
caesar_verdict_essay          String?  @map("caesar_verdict_essay") @db.Text

// ─── Genghis Khan ───
meritocratic_worth_score      Int?     @map("meritocratic_worth_score")
adaptability_score            Int?     @map("adaptability_score")
resilience_score              Int?     @map("resilience_score")
correction_acceptance_rate    String?  @map("correction_acceptance_rate")
practical_intelligence_score  Int?     @map("practical_intelligence_score")
khan_verdict_essay            String?  @map("khan_verdict_essay") @db.Text

// ─── Machiavelli ───
political_intelligence_score  Int?     @map("political_intelligence_score")
virtu_score                   Int?     @map("virtu_score")
fox_lion_profile              String?  @map("fox_lion_profile")
performed_virtue_index        Int?     @map("performed_virtue_index")
behavioral_flexibility_score  Int?     @map("behavioral_flexibility_score")
machiavelli_verdict_essay     String?  @map("machiavelli_verdict_essay") @db.Text

// ─── Meta-Synthesis ───
expert_consensus_score        Float?   @map("expert_consensus_score") @db.Real
expert_dissent_summary        String?  @map("expert_dissent_summary") @db.Text
inter_rater_reliability       Float?   @map("inter_rater_reliability") @db.Real
confidence_intervals_json     Json?    @map("confidence_intervals_json")
bayesian_big_five             Json?    @map("bayesian_big_five")
growth_trajectory             String?  @map("growth_trajectory") @db.Text
expert_integrated_verdict     String?  @map("expert_integrated_verdict") @db.Text
compatibility_vector          Json?    @map("compatibility_vector")
```

**Total new columns: ~80**

#### 4.3.2 New Field on UserAnalysisHistory

```prisma
expert_panel_snapshot         Json?    @map("expert_panel_snapshot")
```

#### 4.3.3 Migration Script

`packages/database/scripts/add-expert-panel-fields.sh` — idempotent SQL using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for each field. Following existing migration patterns.

---

### 4.4 Web UI Overhaul

#### 4.4.1 Install Recharts

```bash
pnpm --filter web add recharts
```

#### 4.4.2 New Chart Components

**Directory:** `apps/web/components/charts/`

All components are `'use client'` and accept typed props matching the profile data shapes.

| Component | Recharts Type | Props | Purpose |
|-----------|--------------|-------|---------|
| `BigFiveRadar.tsx` | `RadarChart` | `scores: {trait, value, ci?}[]`, `compareTo?: scores[]` | OCEAN with optional overlay for comparison + CI bands |
| `CognitiveStyleRadar.tsx` | `RadarChart` | `scores: {axis, value}[]` | 4-axis: analytical/creative/abstract/concrete |
| `InfluenceRadar.tsx` | `RadarChart` | `susceptibility: {principle, score}[]` | 6-axis Cialdini dimensions |
| `IdEgoSuperego.tsx` | `RadarChart` | `balance: {id, ego, superego}` | 3-axis Freudian triangle |
| `NietzscheRadar.tsx` | `RadarChart` | `scores: {dimension, value}[]` | Will to power, amor fati, ressentiment, etc. |
| `CognitiveBiasBar.tsx` | `BarChart` (horizontal) | `biases: {name, severity, evidence}[]` | Top 5 biases with severity |
| `TraitTimeline.tsx` | `LineChart` | `history: {date, traits: Record<string, number>}[]` | Trait evolution across analysis versions |
| `ExpertComparisonBar.tsx` | `BarChart` (grouped) | `experts: {name, scores: Record<string, number>}[]` | Key scores from all 11 experts side-by-side |
| `CompatibilityHeatmap.tsx` | Custom `div` grid | `matrix: {userA, userB, score}[]` | Pairwise compatibility |
| `BehavioralForecast.tsx` | `AreaChart` | `forecast: {day, predicted, confidence}[]` | 30-day behavioral forecast |

**Design system:**
- Background: `#09090b` (zinc-950), chart bg: `#18181b` (zinc-900)
- Expert colors: IO=`#60a5fa`, Peterson=`#f87171`, Jung=`#c084fc`, Sapolsky=`#34d399`, Bernays=`#fbbf24`, Freud=`#fb7185`, Kahneman=`#22d3ee`, Nietzsche=`#fb923c`, Caesar=`#facc15`, Khan=`#a3e635`, Machiavelli=`#a78bfa`
- Fills: 0.3 opacity, solid strokes
- Tooltip: `#27272a` bg, white text, `font-mono`
- Responsive: full width on mobile, constrained `max-w` on desktop

#### 4.4.3 Profile Detail Page Rewrite

**File:** `apps/web/app/profiles/[username]/page.tsx`

Restructure from 25+ sequential sections into **8 tabs** with sticky navigation:

```
[Overview] [Expert Panel] [Psychology] [Cognition] [Behavior] [Influence] [Appearance] [History]
```

**Tab 1: Overview** (default)
- Hero section: photo + name + Omega rating bar + message count + integrated summary
- Expert panel summary: 11 compact cards in a grid (icon, name, 1-line headline, key metric, accent color)
- Big Five Radar Chart (replacing 5 individual score bars)
- Key metrics grid: trust, affinity, emotional bond

**Tab 2: Expert Panel**
- 11 full expert cards, each with distinct accent color:
  - Icon + expert name + specialty tagline
  - Key scores as ScoreBars with CI bracket overlays
  - Collapsible essay (default collapsed, expand on click)
  - Consensus/dissent highlight (green border = agrees with majority, amber = dissents)
- Bottom section: Expert Consensus vs Dissent summary
- Inter-rater reliability display
- Integrated verdict (meta-synthesis, 2-3 paragraphs)

**Tab 3: Psychology**
- Existing long-form essays (keep: psychologicalProfile, communicationAnalysis, etc.)
- Cognitive Style Radar Chart (4-axis)
- Attachment style with confidence
- Emotional Intelligence scores
- Jung's shadow profile essay
- Freud's Id/Ego/Superego triangle chart
- Unconscious drives essay
- Defense mechanisms display

**Tab 4: Cognition & Decisions**
- Kahneman's cognitive bias bar chart (top 5)
- System 1 vs System 2 balance bar
- Loss aversion, anchoring, overconfidence scores
- Decision making essay
- Nietzsche's values radar (5-axis)
- Existential philosophy essay
- Peterson's Big Five interaction effects (clinically significant pairs)

**Tab 5: Behavior & Predictions**
- Existing behavioral prediction cards
- Prediction accuracy / Brier score display (new)
- Growth trajectory essay
- Sapolsky's neurobiological profile + stress response
- Behavioral ecology strategy badge
- Recovery speed indicator
- Temporal patterns (peak hours, weekend ratio)

**Tab 6: Influence & Social**
- Bernays' Influence Susceptibility Radar (6-axis Cialdini)
- Persuadability index, memetic role, group psychology type
- Social dynamics (dominance, cooperation, conflict/humor style)
- Caesar's classification badge + essay
- Khan's meritocratic assessment + essay
- Machiavelli's political analysis + fox/lion badge + essay
- Interaction style with others essay

**Tab 7: Appearance** (existing physical phenotype section, moved to own tab)

**Tab 8: History**
- Existing Analysis Evolution Viewer (enhanced with expert panel version tracking)
- Trait Timeline Chart (multi-trait line chart across analysis versions)
- Prediction accuracy history

**Reuse existing components:** ScoreBar (enhanced with CI brackets), Section, Badge, Pills, EssaySection, OmegaRatingBar, AnalysisHistoryViewer (enhanced)

#### 4.4.4 New: Comparison Page

**File:** `apps/web/app/profiles/compare/page.tsx`
**API:** `apps/web/app/api/profiles/compare/route.ts`
**URL:** `/profiles/compare?users=username1,username2[,username3]`

**Layout:**
1. Multi-select user dropdown (populated from all profiles)
2. Overview table: photo, Omega rating, messages, sentiment side-by-side
3. Big Five overlay radar (one polygon per user, different colors)
4. Expert scores comparison (grouped bar chart)
5. Compatibility score (Euclidean distance across ~25 normalized trait dimensions, inverted to 0-100)
6. Archetype matchup (each user's Jung archetypes + predicted interaction dynamics)
7. Communication style matrix
8. Historical strategist verdicts side-by-side (Caesar/Khan/Machiavelli per user)

**Compatibility computation:**
```typescript
function computeCompatibility(a: UserProfile, b: UserProfile): number {
  const dims = [
    'openness_score', 'conscientiousness_score', 'extraversion_score',
    'agreeableness_score', 'neuroticism_score', 'emotional_awareness_score',
    'empathy_score', 'analytical_thinking_score', 'creative_thinking_score',
    'cooperation_score', 'social_dominance_score', 'order_chaos_balance',
    'responsibility_index', 'dopamine_seeking_score', 'serotonin_stability_score',
    'persuadability_index', 'will_to_power_score', 'system1_dominance',
    'shadow_integration_score', 'persona_authenticity_gap', 'resilience_score',
    'adaptability_score', 'sublimation_score', 'decision_quality_score',
    'narrative_coherence_score',
  ];
  const vecA = dims.map(d => normalize(a[d]));
  const vecB = dims.map(d => normalize(b[d]));
  const distance = Math.sqrt(vecA.reduce((sum, v, i) => sum + (v - vecB[i]) ** 2, 0));
  const maxDist = Math.sqrt(dims.length);
  return Math.round((1 - distance / maxDist) * 100);
}
```

#### 4.4.5 Enhanced Gallery Page

**File:** `apps/web/app/profiles/page.tsx`

Additions:
- **Compare mode toggle:** Checkbox on each card, "Compare Selected" button (2-3 max)
- **Sort dropdown:** Omega Rating, Leadership, Persuadability, Will to Power, Shadow Integration, Resilience, Message Count
- **Archetype badge:** Mini label on each card showing primary Jungian archetype
- **Expert headline:** One-line below name: e.g., "The Sage | Alpha | Master morality"

---

## 5. Implementation Plan

### Phase 1: Database + Backend Foundation
1. Add ~80 new columns to `schema.prisma` (all nullable)
2. Write and run idempotent migration script
3. `prisma generate` to update Prisma client
4. Verify existing profiles unaffected

### Phase 2: Expert Panel Service
1. Create `expertPanelService.ts` with all 11 expert prompts + schemas
2. Implement meta-synthesis logic (consensus, dissent, CI, ICC, Bayesian fusion)
3. Integrate into `userProfileAnalysis.ts` as Pass 3.5
4. Build and typecheck: `pnpm --filter @repo/agent build`

### Phase 3: Prediction Feedback Loop
1. Add `evaluatePredictions()` to `behavioralPredictionService.ts`
2. Remove hardcoded 0.3-0.8 confidence range
3. Populate `prediction_accuracy_score` with Brier scores
4. Feed accuracy history into prediction generation prompt

### Phase 4: UI — Charts + Profile Page
1. `pnpm --filter web add recharts`
2. Create 10 chart components in `apps/web/components/charts/`
3. Rewrite profile detail page with 8-tab layout
4. Build and typecheck: `pnpm --filter web build`

### Phase 5: UI — Comparison + Gallery
1. Create comparison API route
2. Create comparison page
3. Enhance gallery page with compare mode + sort/filter
4. Build and test

### Phase 6: Verification
1. Run analysis on test user, verify expert panel populates all fields
2. Verify existing profiles still render (null-safe for all new fields)
3. Test comparison page with 2-3 users
4. Test analysis history with expert panel snapshots
5. Full build: `pnpm build`

---

## 6. Cost and Performance Estimates

### API Calls Per User Analysis (with Expert Panel)

| Pass | Calls | Model | Est. Tokens/Call | Est. Cost |
|------|-------|-------|-----------------|-----------|
| Pass 1 (batch summarize) | ~50 (5000 msgs / 100 batch) | gpt-5 | ~2K in + 500 out | ~$0.50 |
| Pass 2 (temporal synthesis) | 1 | gpt-5 | ~5K in + 1K out | ~$0.05 |
| Pass 3 (comprehensive) | 1 | gpt-5 | ~8K in + 5K out | ~$0.15 |
| **Pass 3.5 (11 experts)** | **11** | **gpt-5** | **~6K in + 1.5K out each** | **~$1.50** |
| Pass 3.5 (meta-synthesis) | 1 | gpt-5 | ~15K in + 3K out | ~$0.20 |
| Predictions | 1 | gpt-5 | ~4K in + 1K out | ~$0.05 |

**Total estimated cost per user analysis: ~$2.45** (up from ~$0.75 without expert panel)

### Wall-Clock Time
- Pass 3.5 experts run in parallel: ~15-25 seconds (same as a single call)
- Meta-synthesis: ~10-15 seconds
- Total added time: ~25-40 seconds per user analysis

### Storage
- `expert_panel_json`: ~15-25 KB per user (11 expert responses + meta-synthesis)
- ~80 new scalar columns: ~1 KB per user
- Marginal per-user storage increase: ~25 KB

---

## 7. Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|---------------|
| Profile dimensions | ~30 scored fields | ~110 scored fields | Count non-null fields per analyzed user |
| Big Five validity | Regex word-counting | AI-powered + Bayesian-fused | Compare against self-report surveys (if available) |
| Prediction accuracy | Unknown (never measured) | Brier score < 0.25 | `prediction_accuracy_score` populated and tracked |
| Expert panel coverage | 0% of users | 100% of analyzed users | `expert_panel_version > 0` |
| UI chart components | 0 | 10 | Deployed chart count |
| Profile page load time | ~500ms | < 2s (with charts) | Lighthouse performance audit |
| User comparison capability | None | Support 2-3 user comparison | Comparison page functional |

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GPT-5 cost increase (~3x per user) | Budget | Expert panel can be gated behind minimum message threshold (e.g., 50+ messages). Run on schedule, not per-message. |
| Expert panel latency (~30s added) | Analysis time | All 11 experts run in parallel. Analysis is batch/scheduled, not blocking. |
| Schema migration on production DB | Downtime | All `ADD COLUMN IF NOT EXISTS`. Nullable fields. Zero-downtime migration. |
| Recharts bundle size (~300KB) | Page load | Dynamic import with `next/dynamic`. Only load chart components when tab is active. |
| Expert prompts produce inconsistent quality | Data quality | Zod schemas enforce structure. Retry with fallback on parse failure. Meta-synthesis filters outliers. |
| Backwards compatibility | Existing users | All new fields nullable. Profile page null-checks every new field before rendering. |

---

## 9. Files Changed / Created

| File | Action | Lines Est. |
|------|--------|-----------|
| `packages/database/prisma/schema.prisma` | Edit | +80 lines |
| `packages/database/scripts/add-expert-panel-fields.sh` | Create | ~120 lines |
| `packages/agent/src/services/expertPanelService.ts` | Create | ~1200 lines |
| `packages/agent/src/services/userProfileAnalysis.ts` | Edit | +30 lines (Pass 3.5 integration) |
| `packages/agent/src/services/behavioralPredictionService.ts` | Edit | +80 lines (feedback loop) |
| `apps/web/package.json` | Edit | +1 dep |
| `apps/web/components/charts/BigFiveRadar.tsx` | Create | ~80 lines |
| `apps/web/components/charts/CognitiveStyleRadar.tsx` | Create | ~60 lines |
| `apps/web/components/charts/InfluenceRadar.tsx` | Create | ~70 lines |
| `apps/web/components/charts/IdEgoSuperego.tsx` | Create | ~60 lines |
| `apps/web/components/charts/NietzscheRadar.tsx` | Create | ~70 lines |
| `apps/web/components/charts/CognitiveBiasBar.tsx` | Create | ~70 lines |
| `apps/web/components/charts/TraitTimeline.tsx` | Create | ~100 lines |
| `apps/web/components/charts/ExpertComparisonBar.tsx` | Create | ~90 lines |
| `apps/web/components/charts/CompatibilityHeatmap.tsx` | Create | ~100 lines |
| `apps/web/components/charts/BehavioralForecast.tsx` | Create | ~80 lines |
| `apps/web/app/profiles/[username]/page.tsx` | Rewrite | ~2000 lines |
| `apps/web/app/profiles/page.tsx` | Edit | +150 lines |
| `apps/web/app/profiles/compare/page.tsx` | Create | ~600 lines |
| `apps/web/app/api/profiles/compare/route.ts` | Create | ~120 lines |

**Total estimated new/changed code: ~5,200 lines**

---

## 10. Open Questions

1. **Should expert panel run on every analysis cycle or only when message count crosses thresholds (50, 200, 500)?** Running on every cycle costs ~$2.45/user. Threshold-based would reduce costs.

2. **Should the 11 expert essays be user-facing or internal-only?** They are written in distinctive voices (Nietzsche's is poetic, Caesar's is imperial). Could be entertaining but might confuse users expecting clinical output.

3. **Should the comparison page require a minimum number of expert-analyzed profiles?** Comparing two profiles where one has expert data and one doesn't would show asymmetric information.

4. **How should the system handle expert disagreement in the meta-synthesis?** Options: weighted average (simple), majority vote (categorical), or preserve all dissenting views (most informative but complex UI).
