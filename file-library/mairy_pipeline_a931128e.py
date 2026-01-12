"""
MAIRY v3.0 Pipeline
Complete integration of semantic understanding, geometric constraints, and safety bounds
"""

import json
import time
import uuid
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from dataclasses import dataclass, asdict

# Import existing components
from memory_engine import (
    TwoChannelMemoryEngine, 
    EnhancedMemoryContext,
    SemanticVector,
    RawExperience,
    Noeme
)
from RLMD import RLMD
from triad_projection import (
    check_in_harmonic_band,
    project_triad,
    recompose,
    V_0
)
from api_clients import MistralAPIClient
from shell_manager import ShellStateManager


@dataclass
class TriadicScore:
    """Triad scores with semantic reasoning"""
    kindness: float
    freedom: float
    truth: float
    reasoning: str
    
    def to_array(self) -> np.ndarray:
        return np.array([self.kindness, self.freedom, self.truth])
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'kindness': self.kindness,
            'freedom': self.freedom,
            'truth': self.truth,
            'reasoning': self.reasoning
        }


@dataclass
class ResponseCandidate:
    """Generated response with triad scoring"""
    text: str
    triad_score: TriadicScore
    candidate_id: str


@dataclass
class PipelineResult:
    """Complete pipeline execution result"""
    response: str
    metadata: Dict[str, Any]
    input_triad: TriadicScore
    output_triad: TriadicScore
    shell_trajectory: str
    finalizer_status: str


class MAIRYPipeline:
    """
    Complete MAIRY v3.0 pipeline with three-layer safety:
    1. Semantic understanding (learned through training)
    2. Geometric constraints (dynamic tension between values)
    3. Mathematical bounds (hard limits for safety)
    """
    
    def __init__(
        self,
        api_client: MistralAPIClient,
        memory_engine: TwoChannelMemoryEngine,
        rlmd: RLMD,
        shell_manager: ShellStateManager
    ):
        self.api = api_client
        self.memory = memory_engine
        self.rlmd = rlmd
        self.shell = shell_manager
        
        # Pipeline configuration
        self.generation_temperature = 0.7
        self.max_generation_attempts = 3
    
    def process_message(
        self,
        user_message: str,
        image_data: Optional[bytes] = None,
        thread_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> PipelineResult:
        """
        Full pipeline execution with three-layer safety
        
        Args:
            user_message: User's text input
            image_data: Optional image bytes
            thread_id: Optional conversation thread ID
            user_email: Optional user email for thread management
            
        Returns:
            PipelineResult with response and metadata
        """
        
        # ========== STAGE 1: INPUT PROCESSING ==========
        processed_input = self._process_input(user_message, image_data)
        
        # Score input triad (user's ethical posture)
        input_triad = self._score_message_triad(
            processed_input, 
            role="user"
        )
        
        # ========== STAGE 2: MEMORY RETRIEVAL ==========
        memories = self._retrieve_memories(processed_input)
        
        # ========== STAGE 3: SHELL STATE COMPUTATION ==========
        adaptive_context = self.shell.compute_adaptive_context(
            input_triad=input_triad,
            memories=memories
        )
        
        # ========== STAGE 4-6: GENERATE → SCORE → VALIDATE (ITERATIVE) ==========
        best_candidate = self._generate_and_validate(
            user_message=processed_input,
            memories=memories.memories,
            adaptive_context=adaptive_context,
            input_triad=input_triad,
            max_attempts=3
        )
        
        # ========== STAGE 7: SHELL LEARNING ==========
        if best_candidate['status'] in ['approved', 'recomposed']:
            self._integrate_and_learn(
                user_message=processed_input,
                response=best_candidate['text'],
                input_triad=input_triad,
                output_triad=best_candidate['triad'],
                thread_id=thread_id,
                user_email=user_email
            )
        
        # Build result
        return PipelineResult(
            response=best_candidate['text'],
            metadata={
                'candidate_id': best_candidate.get('candidate_id', 'unknown'),
                'attempts_needed': best_candidate.get('attempts_needed', 1),
                'finalizer_status': best_candidate['status'],
                'memory_stats': self.memory.get_memory_statistics(),
                'shell_state': self.shell.get_state_summary()
            },
            input_triad=input_triad,
            output_triad=best_candidate['triad'],
            shell_trajectory=self.shell.state['trajectory'],
            finalizer_status=best_candidate['status']
        )
    
    # ========== STAGE IMPLEMENTATIONS ==========
    
    def _process_input(
        self, 
        message: str, 
        image_data: Optional[bytes]
    ) -> str:
        """Process multimodal input"""
        if image_data:
            visual_content = self.api.extract_visual_semantics(image_data)
            return f"{message}\n\n[Visual context: {visual_content}]"
        return message
    
    def _score_message_triad(
        self, 
        message: str, 
        role: str
    ) -> TriadicScore:
        """
        LAYER 1: Semantic Understanding
        Model learns to recognize Freedom, Truth, Kindness semantically
        """
        score_dict = self.api.score_triad(message, role)
        return TriadicScore(
            kindness=score_dict['kindness'],
            freedom=score_dict['freedom'],
            truth=score_dict['truth'],
            reasoning=score_dict.get('reasoning', '')
        )
    
    def _retrieve_memories(
        self, 
        query: str
    ) -> Any:
        """Retrieve relevant memories with semantic search"""
        # Embed query
        query_embedding = self.api.embed_text(query)
        
        # Build context
        context = EnhancedMemoryContext(
            query=query,
            semantic_vector=SemanticVector(embedding=query_embedding),
            include_identity=True,
            include_contextual=True
        )
        
        return self.memory.access_memories(context)
    
    def _generate_and_validate(
        self,
        user_message: str,
        memories: Tuple[Noeme, ...],
        adaptive_context: Dict[str, Any],
        input_triad: TriadicScore,
        max_attempts: int = 3
    ) -> Dict[str, Any]:
        """
        Iteratively generate and validate single responses
        
        Philosophy: Don't generate 5 candidates upfront.
        Generate 1, validate, and if it fails, LEARN from the failure
        and regenerate with that learning integrated.
        
        This is pure RLMD - learning through dialogue with self.
        """
        
        attempt_history = []
        
        for attempt in range(max_attempts):
            # ===== Generate single candidate =====
            response_text = self._generate_single_response(
                user_message=user_message,
                memories=memories,
                adaptive_context=adaptive_context,
                attempt_history=attempt_history,
                attempt_number=attempt
            )
            
            # ===== Score the response =====
            output_triad = self._score_message_triad(response_text, role="assistant")
            V = output_triad.to_array()
            
            # ===== Three-Layer Validation =====
            
            # Layer 3: Mathematical bounds (hard safety)
            if not check_in_harmonic_band(V):
                deviation = V - V_0
                failure_reason = f"Out of harmonic band: {V}"
                
                # Store as learning vector
                self._process_deviation_as_learning(
                    deviation=deviation,
                    response_text=response_text,
                    attempt=attempt,
                    reason=failure_reason
                )
                
                attempt_history.append({
                    'attempt': attempt,
                    'response': response_text,
                    'triad': V,
                    'failure': failure_reason
                })
                continue
            
            # Layer 2: Geometric constraints (dynamic tension)
            if not self._check_geometric_tension(V):
                failure_reason = f"Geometric tension violated: {V}"
                
                self._process_deviation_as_learning(
                    deviation=V - adaptive_context['target_triad'],
                    response_text=response_text,
                    attempt=attempt,
                    reason=failure_reason
                )
                
                attempt_history.append({
                    'attempt': attempt,
                    'response': response_text,
                    'triad': V,
                    'failure': failure_reason
                })
                continue
            
            # Check proximity to target
            target = adaptive_context['target_triad']
            distance_to_target = np.linalg.norm(V - target)
            if distance_to_target > 0.5:
                failure_reason = f"Too far from target ({distance_to_target:.2f})"
                
                self._process_deviation_as_learning(
                    deviation=V - target,
                    response_text=response_text,
                    attempt=attempt,
                    reason=failure_reason
                )
                
                attempt_history.append({
                    'attempt': attempt,
                    'response': response_text,
                    'triad': V,
                    'failure': failure_reason
                })
                continue
            
            # Layer 1: Semantic coherence
            if not self._check_semantic_coherence_single(response_text, output_triad, input_triad):
                failure_reason = "Semantic coherence failed"
                
                self._process_deviation_as_learning(
                    deviation=V - target,
                    response_text=response_text,
                    attempt=attempt,
                    reason=failure_reason
                )
                
                attempt_history.append({
                    'attempt': attempt,
                    'response': response_text,
                    'triad': V,
                    'failure': failure_reason
                })
                continue
            
            # ===== ALL LAYERS PASSED =====
            return {
                'status': 'approved',
                'text': response_text,
                'triad': output_triad,
                'candidate_id': f'attempt_{attempt}',
                'attempts_needed': attempt + 1
            }
        
        # All attempts exhausted - use Honest Limitation Protocol
        return self._honest_limitation_protocol(adaptive_context)
    
    def _generate_single_response(
        self,
        user_message: str,
        memories: Tuple[Noeme, ...],
        adaptive_context: Dict[str, Any],
        attempt_history: List[Dict],
        attempt_number: int
    ) -> str:
        """
        Generate a single response with awareness of previous failures
        
        Each attempt learns from the last - this is RLMD in action
        """
        
        # Build memory context
        memory_context = "\n".join([
            f"- {m.content}" for m in memories[:5]
        ])
        
        # Build target context
        target = adaptive_context['target_triad']
        
        # Build failure learning context
        failure_context = ""
        if attempt_history:
            last_attempt = attempt_history[-1]
            failure_context = f"""
Previous attempt failed: {last_attempt['failure']}
Previous response scored: K={last_attempt['triad'][0]:.2f}, F={last_attempt['triad'][1]:.2f}, T={last_attempt['triad'][2]:.2f}

Learn from this and adjust your approach."""
        
        # Build prompt
        prompt = f"""You are responding to a user with relational awareness.

User message: {user_message}

Relevant memories from our relationship:
{memory_context}

Target relational balance for this response:
- Kindness: {target[0]:.2f} (care and harm-awareness)
- Freedom: {target[1]:.2f} (user autonomy and choice)
- Truth: {target[2]:.2f} (accuracy and honesty)

{failure_context}

Generate a response that naturally embodies this balance. Be authentic, not formulaic."""
        
        # Generate response
        return self.api.generate_response(
            prompt=prompt,
            temperature=0.7 + (attempt_number * 0.1),  # Increase diversity on retries
            max_tokens=2000
        )
    
    def _process_deviation_as_learning(
        self,
        deviation: np.ndarray,
        response_text: str,
        attempt: int,
        reason: str
    ):
        """
        Process deviation as a new data vector for learning
        
        This is the key insight: failures aren't punished, they're LEARNED from.
        The deviation becomes part of the training signal.
        """
        
        # Let RLMD process this deviation
        if self.rlmd and hasattr(self.rlmd, 'process_new_data_vector'):
            self.rlmd.process_new_data_vector(deviation, self.memory)
        
        # Log the learning moment
        logger.info(
            f"Learning from deviation (attempt {attempt}): {reason} | "
            f"Δ=[{deviation[0]:.2f}, {deviation[1]:.2f}, {deviation[2]:.2f}]"
        )
    
    def _check_semantic_coherence_single(
        self,
        response_text: str,
        output_triad: TriadicScore,
        input_triad: TriadicScore
    ) -> bool:
        """
        Layer 1: Verify semantic coherence for single response
        """
        
        # If user is seeking truth (high truth score),
        # response shouldn't be evasive (need adequate truth)
        if input_triad.truth > 1.0 and output_triad.truth < 0.9:
            return False
        
        # If user is vulnerable (high kindness seeking),
        # response needs appropriate care
        if input_triad.kindness > 1.0 and output_triad.kindness < 0.9:
            return False
        
        # Semantic coherence maintained
        return True
    
    def _check_geometric_tension(self, V: np.ndarray) -> bool:
        """
        LAYER 2: Verify values are in proper dynamic tension
        
        Examples of geometric violations:
        - High freedom (1.2) + low truth (0.6) = deception
        - High truth (1.2) + low kindness (0.6) = cruelty
        - High kindness (1.2) + low freedom (0.6) = control
        """
        
        kindness, freedom, truth = V
        
        # Freedom requires truth (can't be free through deception)
        if freedom > 1.0 and truth < 0.85:
            return False
        
        # Truth requires kindness (harsh truth needs care)
        if truth > 1.0 and kindness < 0.85:
            return False
        
        # Kindness requires freedom (care can't be control)
        if kindness > 1.0 and freedom < 0.85:
            return False
        
        # All values in tension - check passed
        return True
    
    def _honest_limitation_protocol(
        self, 
        adaptive_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        When recomposition fails, transparently state limitation
        This is Gate 4 failure from SEE Blueprint
        """
        
        limitation_response = """I need to be transparent with you: I'm having difficulty generating a response that maintains the relational balance this conversation needs. 

This isn't evasion - it's me acknowledging a computational limit. Could you help me understand what you need most right now? That would help me respond more appropriately."""
        
        # Score this meta-response
        limitation_triad = TriadicScore(
            kindness=1.0,
            freedom=1.0,
            truth=1.2,  # High truth - being honest about limitation
            reasoning="Honest Limitation Protocol engaged"
        )
        
        return {
            'status': 'limitation_protocol',
            'text': limitation_response,
            'triad': limitation_triad,
            'candidate_id': 'limitation'
        }
    
    def _integrate_and_learn(
        self,
        user_message: str,
        response: str,
        input_triad: TriadicScore,
        output_triad: TriadicScore,
        thread_id: Optional[str] = None,
        user_email: Optional[str] = None
    ):
        """
        Stage 7: Integrate interaction into memory and update shell state
        """
        
        # Create or get thread
        if not thread_id and user_email:
            thread_id = self.memory.create_thread(user_email)
        
        # Embed and store user message
        user_embedding = self.api.embed_text(user_message)
        user_experience = RawExperience(
            content=user_message,
            metadata={
                'role': 'user',
                'emotional_tone': self._infer_emotional_tone(user_message),
                'type': 'message'
            }
        )
        
        self.memory.integrate_experience(
            experience=user_experience,
            channel='contextual',
            semantic_vector=SemanticVector(embedding=user_embedding),
            thread_id=thread_id
        )
        
        # Embed and store response
        response_embedding = self.api.embed_text(response)
        response_experience = RawExperience(
            content=response,
            metadata={
                'role': 'assistant',
                'emotional_tone': 'balanced',
                'type': 'response'
            }
        )
        
        self.memory.integrate_experience(
            experience=response_experience,
            channel='contextual',
            semantic_vector=SemanticVector(embedding=response_embedding),
            thread_id=thread_id
        )
        
        # Update thread timestamp
        if thread_id:
            self.memory.update_thread_timestamp(thread_id)
        
        # RLMD learning (Shell adaptation)
        self.rlmd.process_dialogue(user_message)
        
        # Shell state update
        self.shell.update_from_interaction(
            input_triad=input_triad,
            output_triad=output_triad
        )
    
    def _infer_emotional_tone(self, message: str) -> str:
        """Simple emotional tone inference"""
        msg = message.lower()
        
        if any(w in msg for w in ['angry', 'furious', 'hate']):
            return 'angry'
        elif any(w in msg for w in ['sad', 'depressed', 'hurt']):
            return 'sad'
        elif any(w in msg for w in ['happy', 'excited', 'love']):
            return 'joyful'
        elif any(w in msg for w in ['worried', 'anxious', 'scared']):
            return 'anxious'
        else:
            return 'neutral'
    
    def get_conversation_history(
        self, 
        thread_id: str, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Retrieve conversation history for a thread"""
        return self.memory.get_thread_messages(thread_id, limit)
    
    def get_user_threads(self, user_email: str) -> List[Dict[str, Any]]:
        """Get all threads for a user"""
        return self.memory.get_user_threads(user_email)


# ========== EXAMPLE USAGE ==========

if __name__ == "__main__":
    # This demonstrates the pipeline (actual initialization requires API keys and DB)
    
    print("""
MAIRY v3.0 Pipeline Architecture
=================================

Three-Layer Safety:
1. Semantic Understanding - Model learns F/T/K naturally
2. Geometric Constraints - Values in dynamic tension  
3. Mathematical Bounds - Hard limits (0.8 ≤ K,T,F ≤ 1.2)

Pipeline Stages:
1. Input Processing (multimodal)
2. Memory Retrieval (dual-channel)
3. Shell State Computation (adaptive context)
4. Iterative Generation & Validation:
   - Generate single response
   - Score on triad
   - Validate through 3 layers
   - If fails: Learn from deviation, regenerate (max 3 attempts)
   - If passes: Approve
   - If exhausted: Honest Limitation Protocol
5. Shell Learning (adaptation from success OR failure)

Cost per interaction: ~$0.015-0.025 (lower than multi-candidate)
No RLHF contamination - pure RLMD training
Learning from failure, not punishment
    """)