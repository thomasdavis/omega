/**
 * Evolution Engine Module
 * Self-evolution system for Omega
 */

export { runEvolutionEngine, triggerEvolutionNow } from './EvolutionEngine.js';
export { observe } from './Observer.js';
export { orient } from './Orienter.js';
export { decide } from './Decider.js';
export { act } from './Actor.js';

export type { ObservationData } from './Observer.js';
export type { Proposal } from './Orienter.js';
export type { SelectedProposal, DecisionResult } from './Decider.js';
export type { SanityCheckResult, ActorResult } from './Actor.js';
export type { EvolutionRunResult } from './EvolutionEngine.js';
