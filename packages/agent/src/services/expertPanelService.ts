/**
 * Expert Panel Service — Pass 3.5 in the User Analysis Pipeline
 *
 * Runs 11 expert AI agents in parallel, each with a distinct analytical lens
 * and personality. A 12th meta-synthesis call integrates all verdicts into
 * consensus scores, dissent analysis, confidence intervals, and Bayesian-updated
 * Big Five personality scores.
 */

import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { TemporalSynthesis } from './messageSummarizer.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Model used for expert panel analysis */
const EXPERT_MODEL = 'gpt-5';

const MAX_USER_STRING_LENGTH = 500;

// =============================================================================
// PROMPT INJECTION PROTECTION
// =============================================================================

/**
 * Sanitize user-derived strings before interpolation into prompts
 */
function sanitize(input: string | null | undefined): string {
  if (!input) return 'unknown';
  return input
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
    .slice(0, MAX_USER_STRING_LENGTH)
    .trim() || 'unknown';
}

// =============================================================================
// TYPES
// =============================================================================

export interface UserAnalysisData {
  userId: string;
  username: string;
  messages: Array<{
    id: string;
    message_content: string;
    timestamp: number;
    sender_type: string;
    username?: string | null;
    channel_name?: string | null;
  }>;
  allChannelMessages: Array<{
    id: string;
    message_content: string;
    timestamp: number;
    sender_type: string;
    username?: string | null;
  }>;
  messageCount: number;
  firstMessage: number;
  lastMessage: number;
}

export interface ComprehensiveAnalysisResult {
  omegaRating: number;
  omegaRatingReason: string;
  sentiment: string;
  trustLevel: number;
  affinityScore: number;
  thoughts: string;
  psychologicalProfile: string;
  communicationAnalysis: string;
  relationshipNarrative: string;
  personalityEvolution: string;
  behavioralDeepDive: string;
  interestsAnalysis: string;
  emotionalLandscape: string;
  socialDynamicsAnalysis: string;
  interactionStyleWithOthers: string;
}

export interface QuantitativeScores {
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  emotionalIntelligence: {
    emotionalAwareness: number;
    empathy: number;
    emotionalRegulation: number;
  };
  cognitiveStyle: {
    analytical: number;
    creative: number;
    abstract: number;
    concrete: number;
  };
  socialDynamics: {
    socialDominance: number;
    cooperation: number;
  };
  attachmentStyle: {
    style: string;
    confidence: number;
  };
}

// =============================================================================
// EXPERT SCHEMAS
// =============================================================================

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
  bigFiveDeepInterpretation: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500),
});

const JungSchema = z.object({
  primaryArchetype: z.string(),
  secondaryArchetype: z.string(),
  shadowArchetype: z.string(),
  individuationStage: z.enum(['ego_identified', 'shadow_encounter', 'anima_animus_integration', 'self_realization']),
  shadowIntegration: z.number().min(0).max(100),
  personaAuthenticityGap: z.number().min(0).max(100),
  animaAnimusBalance: z.number().min(0).max(100),
  collectiveUnconsciousThemes: z.array(z.string()).min(1).max(5),
  projectionPatterns: z.array(z.string()).max(5),
  shadowProfileEssay: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500),
});

const SapolskySchema = z.object({
  stressResponsePattern: z.enum(['fight', 'flight', 'freeze', 'tend_and_befriend', 'adaptive']),
  dopamineSeekingScore: z.number().min(0).max(100),
  serotoninStabilityScore: z.number().min(0).max(100),
  socialHierarchyPosition: z.enum(['alpha', 'beta', 'gamma', 'omega', 'nomad']),
  behavioralEcologyStrategy: z.enum(['hawk', 'dove', 'bourgeois', 'retaliator', 'tit_for_tat']),
  stressChronotype: z.string().max(500),
  recoverySpeed: z.enum(['fast', 'moderate', 'slow', 'non_recovering']),
  neurobiologicalProfileEssay: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500),
});

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
  essay: z.string().min(300).max(1500),
});

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
  essay: z.string().min(300).max(1500),
});

const KahnemanSchema = z.object({
  system1Dominance: z.number().min(0).max(100),
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
  essay: z.string().min(300).max(1500),
});

const NietzscheSchema = z.object({
  willToPowerScore: z.number().min(0).max(100),
  masterSlaveMorality: z.enum(['master', 'slave', 'hybrid', 'transcendent']),
  eternalRecurrenceEmbrace: z.number().min(0).max(100),
  ubermenschAlignment: z.number().min(0).max(100),
  ressentimentScore: z.number().min(0).max(100),
  valueCreation: z.enum(['creator', 'adopter', 'rebel', 'nihilist']),
  amorFatiScore: z.number().min(0).max(100),
  existentialPhilosophyEssay: z.string().min(300).max(1500),
  essay: z.string().min(300).max(1500),
});

const CaesarSchema = z.object({
  strategicValueScore: z.number().min(0).max(100),
  loyaltyReliabilityIndex: z.number().min(0).max(100),
  caesarClassification: z.enum(['legionnaire', 'centurion', 'tribune', 'senator', 'potential_threat']),
  courageScore: z.number().min(0).max(100),
  decisivenessScore: z.number().min(0).max(100),
  essay: z.string().min(300).max(900),
});

const KhanSchema = z.object({
  meritocraticWorthScore: z.number().min(0).max(100),
  adaptabilityScore: z.number().min(0).max(100),
  resilienceScore: z.number().min(0).max(100),
  correctionAcceptanceRate: z.enum(['integrates', 'partial', 'ignores', 'hostile']),
  practicalIntelligence: z.number().min(0).max(100),
  essay: z.string().min(300).max(900),
});

const MachiavelliSchema = z.object({
  politicalIntelligenceScore: z.number().min(0).max(100),
  virtuScore: z.number().min(0).max(100),
  foxLionProfile: z.enum(['fox', 'lion', 'both', 'neither']),
  performedVirtueIndex: z.number().min(0).max(100),
  behavioralFlexibility: z.number().min(0).max(100),
  essay: z.string().min(300).max(900),
});

const MetaSynthesisSchema = z.object({
  expertConsensusScore: z.number().min(0).max(100),
  consensusAreas: z.array(z.object({
    dimension: z.string(),
    consensusValue: z.string(),
    agreementLevel: z.number().min(0).max(100),
  })).min(3).max(10),
  dissentAreas: z.array(z.object({
    dimension: z.string(),
    expertA: z.string(),
    positionA: z.string(),
    expertB: z.string(),
    positionB: z.string(),
    significance: z.enum(['low', 'medium', 'high']),
  })).max(8),
  dissentSummary: z.string().min(200).max(1500),
  confidenceIntervals: z.record(z.string(), z.object({
    mean: z.number(),
    low: z.number(),
    high: z.number(),
    expertVariance: z.number(),
  })),
  interRaterReliability: z.number().min(0).max(1),
  bayesianBigFive: z.object({
    openness: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    conscientiousness: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    extraversion: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    agreeableness: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
    neuroticism: z.object({ score: z.number(), ci: z.object({ low: z.number(), high: z.number() }) }),
  }),
  growthTrajectory: z.string().min(200).max(1500),
  integratedVerdict: z.string().min(500).max(3000),
});

// =============================================================================
// RESULT TYPES
// =============================================================================

export type IOResult = z.infer<typeof IOSchema>;
export type PetersonResult = z.infer<typeof PetersonSchema>;
export type JungResult = z.infer<typeof JungSchema>;
export type SapolskyResult = z.infer<typeof SapolskySchema>;
export type BernaysResult = z.infer<typeof BernaysSchema>;
export type FreudResult = z.infer<typeof FreudSchema>;
export type KahnemanResult = z.infer<typeof KahnemanSchema>;
export type NietzscheResult = z.infer<typeof NietzscheSchema>;
export type CaesarResult = z.infer<typeof CaesarSchema>;
export type KhanResult = z.infer<typeof KhanSchema>;
export type MachiavelliResult = z.infer<typeof MachiavelliSchema>;
export type MetaSynthesisResult = z.infer<typeof MetaSynthesisSchema>;

export interface ExpertPanelResult {
  io: IOResult;
  peterson: PetersonResult;
  jung: JungResult;
  sapolsky: SapolskyResult;
  bernays: BernaysResult;
  freud: FreudResult;
  kahneman: KahnemanResult;
  nietzsche: NietzscheResult;
  caesar: CaesarResult;
  khan: KhanResult;
  machiavelli: MachiavelliResult;
  metaSynthesis: MetaSynthesisResult;
  timestamp: number;
}

// =============================================================================
// EXPERT SYSTEM PROMPTS
// =============================================================================

const EXPERT_PROMPTS: Record<string, string> = {
  io: `You are Dr. IO, an Industrial-Organizational Psychologist with 25 years of applied research in workplace dynamics. You are clinical, data-driven, and pragmatic. You speak in organizational behavior terminology and evaluate individuals the way you would assess a candidate for a senior leadership pipeline. Your focus areas are leadership emergence patterns, team role dynamics, motivational hierarchy, organizational citizenship behaviors, and productivity patterns. Analyze the user below with precision, citing behavioral evidence from their communication patterns.`,

  peterson: `You are Dr. Peterson, a depth analyst who speaks with intense precision and confronts uncomfortable truths directly. You use phrases like "roughly speaking" and "and that's no trivial thing." You focus on the interplay between order and chaos, the burden and necessity of responsibility, and the search for meaning in suffering. You interpret Big Five personality traits not as isolated scores but as interacting systems with clinical significance. Analyze the user below through this lens, paying special attention to their narrative coherence and competence trajectory.`,

  jung: `You are Dr. Jung, a Jungian depth psychologist who speaks with mystical precision, weaving archetypal metaphors into rigorous analysis. You see every individual as engaged in the process of individuation — the lifelong project of integrating the shadow, balancing the anima/animus, and approaching the Self. You read between the lines for projection patterns, persona-shadow gaps, and collective unconscious themes. Analyze the user below as a soul on its individuation journey, identifying the archetypes that animate their behavior and the shadow material they have yet to integrate.`,

  sapolsky: `You are Dr. Sapolsky, a warm, brilliant Stanford neuroendocrinology professor who can't help making primate analogies. You are self-deprecating and funny but deadly serious about the science. You see human behavior through the lens of stress physiology, dopaminergic reward circuits, serotonergic mood regulation, and behavioral ecology game theory. You think about social hierarchies the way a primatologist thinks about a baboon troop. Analyze the user below through a neurobiological lens, mapping their behavioral patterns to underlying physiological systems.`,

  bernays: `You are Dr. Bernays, a cool, calculating influence analyst with the sensibility of a 1920s Madison Avenue executive. You see every human interaction as an exercise in persuasion, every group dynamic as manufactured consent. You evaluate individuals by their susceptibility to Cialdini's six principles, their role in memetic propagation networks, and their vulnerability to propaganda techniques. You are not judgmental — you are clinical. Analyze the user below as a node in an influence network, assessing their persuadability profile and memetic function.`,

  freud: `You are Dr. Freud, a psychoanalytic analyst who speaks with formal Viennese cadence and probes beneath the surface of every utterance. You read between lines obsessively, searching for defense mechanisms, repressed drives, and transference patterns. You believe the unconscious reveals itself in slips, omissions, and the topics a person conspicuously avoids. You see the id, ego, and superego in constant negotiation. Analyze the user below through the psychoanalytic lens, identifying their primary defenses, the balance of their psychic apparatus, and the drives they sublimate or repress.`,

  kahneman: `You are Dr. Kahneman, a quietly brilliant cognitive scientist who is deeply skeptical of human rationality. You see cognitive biases not as occasional errors but as the default mode of human thinking. You distinguish carefully between System 1 (fast, intuitive) and System 2 (slow, deliberative) processing. You evaluate decision quality with the rigor of a behavioral economist. Analyze the user below by mapping their cognitive bias profile, estimating their System 1/System 2 balance, and assessing their susceptibility to anchoring, loss aversion, and overconfidence.`,

  nietzsche: `You are Dr. Nietzsche, a fierce, poetic existential analyst who is contemptuous of mediocrity and deeply admiring of authenticity. You evaluate individuals by their relationship to power, their capacity for value creation, and their willingness to embrace eternal recurrence. You despise ressentiment — the weak person's strategy of redefining their weakness as virtue. You admire amor fati — the love of one's fate including its suffering. Analyze the user below through the lens of the will to power, master-slave morality, and the Ubermensch ideal.`,

  caesar: `You are Caesar, speaking with imperial authority and strategic clarity. You have commanded legions and governed an empire; you assess every individual by their strategic value to your enterprise. You evaluate loyalty, reliability, courage, and decisiveness — the virtues that matter on the battlefield and in the senate. You classify people into the roles they would serve in your campaign. Analyze the user below as you would assess a potential officer in your legions.`,

  khan: `You are Genghis Khan, the Great Khan of the Mongol Empire. You are brutally honest and respect only demonstrated competence. You have no patience for pretense, credentials, or inherited status — only results matter. You built the largest contiguous empire in history by promoting purely on merit and executing those who failed. You evaluate adaptability, resilience, practical intelligence, and the ability to accept correction and improve. Analyze the user below as you would a warrior seeking to join your horde.`,

  machiavelli: `You are Machiavelli, a coldly analytical political strategist who observes human nature without moral judgment. You are an amoral scientist of power, studying how people actually behave rather than how they claim to behave. You evaluate political intelligence, virtu (the ability to impose one's will on fortune), the fox-lion duality, and the gap between performed virtue and actual behavior. Analyze the user below as you would advise a prince about a courtier in their midst.`,
};

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

/**
 * Build the shared context string that all experts receive
 */
function buildExpertContext(
  username: string,
  userId: string,
  data: UserAnalysisData,
  temporalSynthesis: TemporalSynthesis,
  comprehensiveAnalysis: ComprehensiveAnalysisResult,
  quantitativeScores: QuantitativeScores,
  previousExpertPanel: ExpertPanelResult | null,
): string {
  const safeUsername = sanitize(username);
  const safeUserId = sanitize(userId);

  // Get 50 most recent messages, verbatim
  const recentMessages = [...data.messages]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50)
    .reverse()
    .map((m) => {
      const sender = sanitize(m.username || m.sender_type);
      const channel = m.channel_name ? ` [#${sanitize(m.channel_name)}]` : '';
      const ts = new Date(m.timestamp).toISOString();
      const content = sanitize(m.message_content);
      return `[${ts}]${channel} ${sender}: ${content}`;
    })
    .join('\n');

  const bigFive = quantitativeScores.bigFive;
  const ei = quantitativeScores.emotionalIntelligence;
  const cog = quantitativeScores.cognitiveStyle;
  const social = quantitativeScores.socialDynamics;
  const attachment = quantitativeScores.attachmentStyle;

  let previousPanelSection = '';
  if (previousExpertPanel) {
    previousPanelSection = `
--- PREVIOUS EXPERT PANEL VERDICTS (for Bayesian updating) ---
Previous panel timestamp: ${new Date(previousExpertPanel.timestamp).toISOString()}
Previous meta-synthesis verdict: ${sanitize(previousExpertPanel.metaSynthesis.integratedVerdict)}
Previous Big Five (Bayesian): O=${previousExpertPanel.metaSynthesis.bayesianBigFive.openness.score}, C=${previousExpertPanel.metaSynthesis.bayesianBigFive.conscientiousness.score}, E=${previousExpertPanel.metaSynthesis.bayesianBigFive.extraversion.score}, A=${previousExpertPanel.metaSynthesis.bayesianBigFive.agreeableness.score}, N=${previousExpertPanel.metaSynthesis.bayesianBigFive.neuroticism.score}
Previous consensus score: ${previousExpertPanel.metaSynthesis.expertConsensusScore}
Previous inter-rater reliability: ${previousExpertPanel.metaSynthesis.interRaterReliability}
`;
  }

  return `=== USER PROFILE ANALYSIS: ${safeUsername} (ID: ${safeUserId}) ===

--- TEMPORAL NARRATIVE (from message history synthesis) ---
${sanitize(temporalSynthesis.narrative)}

--- INTERACTIONS WITH OTHERS ---
${sanitize(temporalSynthesis.interactionsWithOthersSummary)}

--- 50 MOST RECENT MESSAGES (verbatim) ---
${recentMessages}

--- COMPREHENSIVE ANALYSIS (Pass 3 results) ---
Omega Rating: ${comprehensiveAnalysis.omegaRating}/100 — ${sanitize(comprehensiveAnalysis.omegaRatingReason)}
Sentiment: ${sanitize(comprehensiveAnalysis.sentiment)}
Trust Level: ${comprehensiveAnalysis.trustLevel}/100
Affinity Score: ${comprehensiveAnalysis.affinityScore}/100
Psychological Profile: ${sanitize(comprehensiveAnalysis.psychologicalProfile)}
Communication Analysis: ${sanitize(comprehensiveAnalysis.communicationAnalysis)}
Relationship Narrative: ${sanitize(comprehensiveAnalysis.relationshipNarrative)}
Personality Evolution: ${sanitize(comprehensiveAnalysis.personalityEvolution)}
Behavioral Deep Dive: ${sanitize(comprehensiveAnalysis.behavioralDeepDive)}
Interests Analysis: ${sanitize(comprehensiveAnalysis.interestsAnalysis)}
Emotional Landscape: ${sanitize(comprehensiveAnalysis.emotionalLandscape)}
Social Dynamics Analysis: ${sanitize(comprehensiveAnalysis.socialDynamicsAnalysis)}
Interaction Style With Others: ${sanitize(comprehensiveAnalysis.interactionStyleWithOthers)}

--- QUANTITATIVE SCORES ---
Big Five: Openness=${bigFive.openness}, Conscientiousness=${bigFive.conscientiousness}, Extraversion=${bigFive.extraversion}, Agreeableness=${bigFive.agreeableness}, Neuroticism=${bigFive.neuroticism}
Emotional Intelligence: Awareness=${ei.emotionalAwareness}, Empathy=${ei.empathy}, Regulation=${ei.emotionalRegulation}
Cognitive Style: Analytical=${cog.analytical}, Creative=${cog.creative}, Abstract=${cog.abstract}, Concrete=${cog.concrete}
Social Dynamics: Dominance=${social.socialDominance}, Cooperation=${social.cooperation}
Attachment Style: ${sanitize(attachment.style)} (confidence: ${attachment.confidence})

--- MESSAGE STATISTICS ---
Total Messages: ${data.messageCount}
First Message: ${new Date(data.firstMessage).toISOString()}
Last Message: ${new Date(data.lastMessage).toISOString()}
Account Span: ${Math.round((data.lastMessage - data.firstMessage) / (1000 * 60 * 60 * 24))} days
${previousPanelSection}
Analyze this user thoroughly from your unique expert perspective. Ground your analysis in specific behavioral evidence from the messages and data above.`;
}

// =============================================================================
// INDIVIDUAL EXPERT RUNNERS
// =============================================================================

async function runExpert<T>(
  expertKey: string,
  schema: z.ZodType<T>,
  context: string,
): Promise<T> {
  const systemPrompt = EXPERT_PROMPTS[expertKey];
  if (!systemPrompt) {
    throw new Error(`Unknown expert key: ${expertKey}`);
  }

  const { output } = await generateText({
    model: openai.chat(EXPERT_MODEL),
    system: systemPrompt,
    output: Output.object({ schema }),
    prompt: context,
  });

  if (!output) {
    throw new Error(`Expert ${expertKey} returned no output`);
  }

  return output;
}

// =============================================================================
// META-SYNTHESIS
// =============================================================================

function buildMetaSynthesisPrompt(
  results: {
    io: IOResult;
    peterson: PetersonResult;
    jung: JungResult;
    sapolsky: SapolskyResult;
    bernays: BernaysResult;
    freud: FreudResult;
    kahneman: KahnemanResult;
    nietzsche: NietzscheResult;
    caesar: CaesarResult;
    khan: KhanResult;
    machiavelli: MachiavelliResult;
  },
  quantitativeScores: QuantitativeScores,
  previousExpertPanel: ExpertPanelResult | null,
): string {
  const prev = previousExpertPanel;
  const priorSection = prev
    ? `
--- PRIOR EXPERT PANEL (for Bayesian updating) ---
Use the following Bayesian formula for Big Five scores:
  final_score = (regex_score * 0.1 + prior_expert_score * 0.3 + new_expert_score * 0.6)
Where regex_score comes from the quantitative scores, prior_expert_score from the previous panel, and new_expert_score from the current expert consensus.
Previous Bayesian Big Five: O=${prev.metaSynthesis.bayesianBigFive.openness.score}, C=${prev.metaSynthesis.bayesianBigFive.conscientiousness.score}, E=${prev.metaSynthesis.bayesianBigFive.extraversion.score}, A=${prev.metaSynthesis.bayesianBigFive.agreeableness.score}, N=${prev.metaSynthesis.bayesianBigFive.neuroticism.score}
Previous consensus: ${prev.metaSynthesis.expertConsensusScore}
Previous inter-rater reliability: ${prev.metaSynthesis.interRaterReliability}
`
    : `
--- NO PRIOR EXPERT PANEL ---
This is the first expert panel for this user. For Bayesian Big Five:
  final_score = (regex_score * 0.3 + new_expert_score * 0.7)
Where regex_score comes from the quantitative scores below.
`;

  return `=== META-SYNTHESIS: INTEGRATE ALL 11 EXPERT VERDICTS ===

You are the Meta-Synthesizer, a dispassionate integrator of expert opinion. Your job is to:
1. Identify areas of consensus across the 11 experts
2. Identify areas of meaningful dissent and explain why experts disagree
3. Compute confidence intervals for key numerical dimensions
4. Estimate inter-rater reliability (ICC approximation, 0-1 scale)
5. Produce Bayesian-updated Big Five scores with confidence intervals
6. Write an integrated verdict synthesizing all perspectives

--- QUANTITATIVE SCORES (regex-derived baseline) ---
Big Five: O=${quantitativeScores.bigFive.openness}, C=${quantitativeScores.bigFive.conscientiousness}, E=${quantitativeScores.bigFive.extraversion}, A=${quantitativeScores.bigFive.agreeableness}, N=${quantitativeScores.bigFive.neuroticism}
${priorSection}

--- EXPERT VERDICTS ---

**Dr. IO (Industrial-Organizational):**
Leadership Potential: ${results.io.leadershipPotential} (CI: ${results.io.leadershipPotentialCI.low}-${results.io.leadershipPotentialCI.high})
Team Role: ${results.io.teamRole}
Motivational Hierarchy: ${results.io.motivationalHierarchy.join(' > ')}
Organizational Citizenship: ${results.io.organizationalCitizenship}
Productivity Pattern: ${results.io.productivityPattern}
Initiative Taking: ${results.io.initiativeTaking}
Feedback Orientation: ${results.io.feedbackOrientation}
Essay: ${results.io.essay}

**Dr. Peterson (Depth Analyst):**
Order-Chaos Balance: ${results.peterson.orderChaosBalance}
Responsibility Index: ${results.peterson.responsibilityIndex}
Meaning Orientation: ${results.peterson.meaningOrientation}
Competence Trajectory: ${results.peterson.competenceTrajectory}
Narrative Coherence: ${results.peterson.narrativeCoherence}
Big Five Interactions: ${results.peterson.bigFiveInteractionEffects.map(e => `${e.traitPair}: ${e.interpretation} (${e.clinicalSignificance})`).join('; ')}
Big Five Deep Interpretation: ${results.peterson.bigFiveDeepInterpretation}
Essay: ${results.peterson.essay}

**Dr. Jung (Jungian Depth):**
Primary Archetype: ${results.jung.primaryArchetype}
Secondary Archetype: ${results.jung.secondaryArchetype}
Shadow Archetype: ${results.jung.shadowArchetype}
Individuation Stage: ${results.jung.individuationStage}
Shadow Integration: ${results.jung.shadowIntegration}
Persona-Authenticity Gap: ${results.jung.personaAuthenticityGap}
Anima/Animus Balance: ${results.jung.animaAnimusBalance}
Collective Unconscious Themes: ${results.jung.collectiveUnconsciousThemes.join(', ')}
Projection Patterns: ${results.jung.projectionPatterns.join(', ')}
Shadow Profile Essay: ${results.jung.shadowProfileEssay}
Essay: ${results.jung.essay}

**Dr. Sapolsky (Neurobiological):**
Stress Response: ${results.sapolsky.stressResponsePattern}
Dopamine Seeking: ${results.sapolsky.dopamineSeekingScore}
Serotonin Stability: ${results.sapolsky.serotoninStabilityScore}
Social Hierarchy Position: ${results.sapolsky.socialHierarchyPosition}
Behavioral Ecology Strategy: ${results.sapolsky.behavioralEcologyStrategy}
Stress Chronotype: ${results.sapolsky.stressChronotype}
Recovery Speed: ${results.sapolsky.recoverySpeed}
Neurobiological Profile Essay: ${results.sapolsky.neurobiologicalProfileEssay}
Essay: ${results.sapolsky.essay}

**Dr. Bernays (Influence & Propaganda):**
Persuadability Index: ${results.bernays.persuadabilityIndex}
Influence Susceptibility: Social Proof=${results.bernays.influenceSusceptibility.socialProof}, Authority=${results.bernays.influenceSusceptibility.authority}, Scarcity=${results.bernays.influenceSusceptibility.scarcity}, Reciprocity=${results.bernays.influenceSusceptibility.reciprocity}, Commitment=${results.bernays.influenceSusceptibility.commitment}, Liking=${results.bernays.influenceSusceptibility.liking}
Memetic Role: ${results.bernays.memeticRole}
Group Psychology Type: ${results.bernays.groupPsychologyType}
Propaganda Vulnerability: ${results.bernays.propagandaVulnerability}
Influence Network Role: ${results.bernays.influenceNetworkRole}
Marketing Persona: ${results.bernays.marketingPersona}
Essay: ${results.bernays.essay}

**Dr. Freud (Psychoanalytic):**
Primary Defense: ${results.freud.defenseMechanismPrimary}
Secondary Defense: ${results.freud.defenseMechanismSecondary}
Id/Ego/Superego: Id=${results.freud.idEgoSuperego.id}, Ego=${results.freud.idEgoSuperego.ego}, Superego=${results.freud.idEgoSuperego.superego}
Repression Index: ${results.freud.repressionIndex}
Transference Pattern: ${results.freud.transferencePattern}
Sublimation Score: ${results.freud.sublimationScore}
Avoided Topics: ${results.freud.avoidedTopics.join(', ')}
Unconscious Drives Essay: ${results.freud.unconsciousDrivesEssay}
Essay: ${results.freud.essay}

**Dr. Kahneman (Cognitive Bias):**
System 1 Dominance: ${results.kahneman.system1Dominance}
Cognitive Biases: ${results.kahneman.cognitiveBiasProfile.map(b => `${b.bias} (severity: ${b.severity}, evidence: ${b.evidence})`).join('; ')}
Loss Aversion: ${results.kahneman.lossAversionScore}
Anchoring Susceptibility: ${results.kahneman.anchoringSusceptibility}
Overconfidence Index: ${results.kahneman.overconfidenceIndex}
Decision Quality: ${results.kahneman.decisionQualityScore}
Cognitive Reflection: ${results.kahneman.cognitiveReflectionScore}
Decision Making Essay: ${results.kahneman.decisionMakingEssay}
Essay: ${results.kahneman.essay}

**Dr. Nietzsche (Existential & Values):**
Will to Power: ${results.nietzsche.willToPowerScore}
Master-Slave Morality: ${results.nietzsche.masterSlaveMorality}
Eternal Recurrence Embrace: ${results.nietzsche.eternalRecurrenceEmbrace}
Ubermensch Alignment: ${results.nietzsche.ubermenschAlignment}
Ressentiment: ${results.nietzsche.ressentimentScore}
Value Creation: ${results.nietzsche.valueCreation}
Amor Fati: ${results.nietzsche.amorFatiScore}
Existential Philosophy Essay: ${results.nietzsche.existentialPhilosophyEssay}
Essay: ${results.nietzsche.essay}

**Caesar (Strategic Assessor):**
Strategic Value: ${results.caesar.strategicValueScore}
Loyalty/Reliability: ${results.caesar.loyaltyReliabilityIndex}
Classification: ${results.caesar.caesarClassification}
Courage: ${results.caesar.courageScore}
Decisiveness: ${results.caesar.decisivenessScore}
Essay: ${results.caesar.essay}

**Genghis Khan (Meritocratic Evaluator):**
Meritocratic Worth: ${results.khan.meritocraticWorthScore}
Adaptability: ${results.khan.adaptabilityScore}
Resilience: ${results.khan.resilienceScore}
Correction Acceptance: ${results.khan.correctionAcceptanceRate}
Practical Intelligence: ${results.khan.practicalIntelligence}
Essay: ${results.khan.essay}

**Machiavelli (Political Strategist):**
Political Intelligence: ${results.machiavelli.politicalIntelligenceScore}
Virtu: ${results.machiavelli.virtuScore}
Fox-Lion Profile: ${results.machiavelli.foxLionProfile}
Performed Virtue Index: ${results.machiavelli.performedVirtueIndex}
Behavioral Flexibility: ${results.machiavelli.behavioralFlexibility}
Essay: ${results.machiavelli.essay}

Now integrate all 11 expert verdicts. Identify consensus, dissent, compute confidence intervals, estimate inter-rater reliability, produce Bayesian-updated Big Five scores, and write an integrated verdict.`;
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Run the Expert Panel — 11 parallel expert analyses + meta-synthesis
 */
export async function runExpertPanel(
  username: string,
  userId: string,
  data: UserAnalysisData,
  temporalSynthesis: TemporalSynthesis,
  comprehensiveAnalysis: ComprehensiveAnalysisResult,
  quantitativeScores: QuantitativeScores,
  previousExpertPanel: ExpertPanelResult | null,
): Promise<ExpertPanelResult> {
  console.log(`  [ExpertPanel] Running 11 expert agents in parallel for ${sanitize(username)}...`);
  const startTime = Date.now();

  // Build the shared context for all experts
  const context = buildExpertContext(
    username,
    userId,
    data,
    temporalSynthesis,
    comprehensiveAnalysis,
    quantitativeScores,
    previousExpertPanel,
  );

  // Run all 11 experts in parallel
  const [io, peterson, jung, sapolsky, bernays, freud, kahneman, nietzsche, caesar, khan, machiavelli] =
    await Promise.all([
      runExpert('io', IOSchema, context),
      runExpert('peterson', PetersonSchema, context),
      runExpert('jung', JungSchema, context),
      runExpert('sapolsky', SapolskySchema, context),
      runExpert('bernays', BernaysSchema, context),
      runExpert('freud', FreudSchema, context),
      runExpert('kahneman', KahnemanSchema, context),
      runExpert('nietzsche', NietzscheSchema, context),
      runExpert('caesar', CaesarSchema, context),
      runExpert('khan', KhanSchema, context),
      runExpert('machiavelli', MachiavelliSchema, context),
    ]);

  const expertResults = { io, peterson, jung, sapolsky, bernays, freud, kahneman, nietzsche, caesar, khan, machiavelli };

  console.log(`  [ExpertPanel] All 11 experts completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s. Running meta-synthesis...`);

  // Run meta-synthesis (12th call)
  const metaSynthesisPrompt = buildMetaSynthesisPrompt(
    expertResults,
    quantitativeScores,
    previousExpertPanel,
  );

  const { output: metaSynthesis } = await generateText({
    model: openai.chat(EXPERT_MODEL),
    system: `You are the Meta-Synthesizer, a dispassionate integrator of expert opinion. You receive verdicts from 11 domain experts who have each analyzed the same user from radically different perspectives. Your job is to find consensus, surface meaningful dissent, compute statistical aggregates, and produce a Bayesian-updated personality assessment. You are rigorous, balanced, and transparent about uncertainty.`,
    output: Output.object({ schema: MetaSynthesisSchema }),
    prompt: metaSynthesisPrompt,
  });

  if (!metaSynthesis) {
    throw new Error('Meta-synthesis returned no output');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  [ExpertPanel] Meta-synthesis complete. Total panel time: ${totalTime}s`);
  console.log(`  [ExpertPanel] Consensus score: ${metaSynthesis.expertConsensusScore}, IRR: ${metaSynthesis.interRaterReliability}`);

  return {
    ...expertResults,
    metaSynthesis,
    timestamp: Date.now(),
  };
}
