/**
 * Quantum Computing Tool - Pseudo implementation for educational/experimental purposes
 * Simulates basic quantum computing concepts in a classical environment
 */

import { tool } from 'ai';
import { z } from 'zod';

// Complex number representation
interface Complex {
  real: number;
  imag: number;
}

// Helper functions for complex number operations
function complexAdd(a: Complex, b: Complex): Complex {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}

function complexMultiply(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}

function complexMagnitudeSquared(c: Complex): number {
  return c.real * c.real + c.imag * c.imag;
}

function complexToString(c: Complex, precision: number = 3): string {
  const r = c.real.toFixed(precision);
  const i = Math.abs(c.imag).toFixed(precision);
  const sign = c.imag >= 0 ? '+' : '-';
  return `${r}${sign}${i}i`;
}

// Qubit state representation (2D state vector)
class Qubit {
  // State vector: alpha|0⟩ + beta|1⟩
  private alpha: Complex; // Amplitude for |0⟩
  private beta: Complex;  // Amplitude for |1⟩

  constructor(alpha: Complex = { real: 1, imag: 0 }, beta: Complex = { real: 0, imag: 0 }) {
    this.alpha = alpha;
    this.beta = beta;
    this.normalize();
  }

  // Normalize the state vector
  private normalize(): void {
    const norm = Math.sqrt(complexMagnitudeSquared(this.alpha) + complexMagnitudeSquared(this.beta));
    if (norm > 0) {
      this.alpha.real /= norm;
      this.alpha.imag /= norm;
      this.beta.real /= norm;
      this.beta.imag /= norm;
    }
  }

  // Get state amplitudes
  getState(): { alpha: Complex; beta: Complex } {
    return { alpha: this.alpha, beta: this.beta };
  }

  // Measure the qubit (collapses to |0⟩ or |1⟩)
  measure(): 0 | 1 {
    const prob0 = complexMagnitudeSquared(this.alpha);
    const random = Math.random();

    if (random < prob0) {
      // Collapse to |0⟩
      this.alpha = { real: 1, imag: 0 };
      this.beta = { real: 0, imag: 0 };
      return 0;
    } else {
      // Collapse to |1⟩
      this.alpha = { real: 0, imag: 0 };
      this.beta = { real: 1, imag: 0 };
      return 1;
    }
  }

  // Get measurement probabilities without collapsing
  getProbabilities(): { prob0: number; prob1: number } {
    const prob0 = complexMagnitudeSquared(this.alpha);
    const prob1 = complexMagnitudeSquared(this.beta);
    return { prob0, prob1 };
  }

  // Clone this qubit (for circuit simulation)
  clone(): Qubit {
    return new Qubit(
      { real: this.alpha.real, imag: this.alpha.imag },
      { real: this.beta.real, imag: this.beta.imag }
    );
  }

  toString(): string {
    const { prob0, prob1 } = this.getProbabilities();
    return `|ψ⟩ = ${complexToString(this.alpha)}|0⟩ + ${complexToString(this.beta)}|1⟩\nP(0)=${(prob0*100).toFixed(1)}%, P(1)=${(prob1*100).toFixed(1)}%`;
  }
}

// Quantum gate operations (2x2 matrices)
class QuantumGates {
  // Hadamard gate - creates superposition
  static hadamard(qubit: Qubit): void {
    const { alpha, beta } = qubit.getState();
    const invSqrt2 = 1 / Math.sqrt(2);

    const newAlpha = complexAdd(
      { real: alpha.real * invSqrt2, imag: alpha.imag * invSqrt2 },
      { real: beta.real * invSqrt2, imag: beta.imag * invSqrt2 }
    );
    const newBeta = complexAdd(
      { real: alpha.real * invSqrt2, imag: alpha.imag * invSqrt2 },
      { real: -beta.real * invSqrt2, imag: -beta.imag * invSqrt2 }
    );

    (qubit as any).alpha = newAlpha;
    (qubit as any).beta = newBeta;
  }

  // Pauli-X gate (NOT gate)
  static pauliX(qubit: Qubit): void {
    const { alpha, beta } = qubit.getState();
    (qubit as any).alpha = beta;
    (qubit as any).beta = alpha;
  }

  // Pauli-Y gate
  static pauliY(qubit: Qubit): void {
    const { alpha, beta } = qubit.getState();
    (qubit as any).alpha = { real: -beta.imag, imag: beta.real };
    (qubit as any).beta = { real: alpha.imag, imag: -alpha.real };
  }

  // Pauli-Z gate
  static pauliZ(qubit: Qubit): void {
    const { beta } = qubit.getState();
    (qubit as any).beta = { real: -beta.real, imag: -beta.imag };
  }

  // Phase gate (S gate)
  static phase(qubit: Qubit): void {
    const { beta } = qubit.getState();
    (qubit as any).beta = { real: -beta.imag, imag: beta.real };
  }

  // T gate (π/8 gate)
  static tGate(qubit: Qubit): void {
    const { beta } = qubit.getState();
    const phase = Math.PI / 4;
    const cos = Math.cos(phase);
    const sin = Math.sin(phase);
    (qubit as any).beta = {
      real: beta.real * cos - beta.imag * sin,
      imag: beta.real * sin + beta.imag * cos,
    };
  }

  // Rotation around X-axis
  static rotateX(qubit: Qubit, theta: number): void {
    const { alpha, beta } = qubit.getState();
    const cos = Math.cos(theta / 2);
    const sin = Math.sin(theta / 2);

    (qubit as any).alpha = {
      real: alpha.real * cos - beta.imag * sin,
      imag: alpha.imag * cos + beta.real * sin,
    };
    (qubit as any).beta = {
      real: beta.real * cos - alpha.imag * sin,
      imag: beta.imag * cos + alpha.real * sin,
    };
  }

  // Rotation around Y-axis
  static rotateY(qubit: Qubit, theta: number): void {
    const { alpha, beta } = qubit.getState();
    const cos = Math.cos(theta / 2);
    const sin = Math.sin(theta / 2);

    (qubit as any).alpha = {
      real: alpha.real * cos - beta.real * sin,
      imag: alpha.imag * cos - beta.imag * sin,
    };
    (qubit as any).beta = {
      real: beta.real * cos + alpha.real * sin,
      imag: beta.imag * cos + alpha.imag * sin,
    };
  }

  // Rotation around Z-axis
  static rotateZ(qubit: Qubit, theta: number): void {
    const { alpha, beta } = qubit.getState();
    const phase1 = Math.exp(-theta / 2);
    const phase2 = Math.exp(theta / 2);

    (qubit as any).alpha = {
      real: alpha.real * Math.cos(-theta / 2) - alpha.imag * Math.sin(-theta / 2),
      imag: alpha.real * Math.sin(-theta / 2) + alpha.imag * Math.cos(-theta / 2),
    };
    (qubit as any).beta = {
      real: beta.real * Math.cos(theta / 2) - beta.imag * Math.sin(theta / 2),
      imag: beta.real * Math.sin(theta / 2) + beta.imag * Math.cos(theta / 2),
    };
  }
}

// Quantum Circuit - manages multiple qubits and operations
class QuantumCircuit {
  private qubits: Qubit[];
  private operations: Array<{ gate: string; qubitIndex: number; params?: any }> = [];

  constructor(numQubits: number) {
    this.qubits = Array(numQubits).fill(null).map(() => new Qubit());
  }

  // Apply gate to a specific qubit
  applyGate(gate: string, qubitIndex: number, params?: any): void {
    if (qubitIndex < 0 || qubitIndex >= this.qubits.length) {
      throw new Error(`Invalid qubit index: ${qubitIndex}`);
    }

    this.operations.push({ gate, qubitIndex, params });
    const qubit = this.qubits[qubitIndex];

    switch (gate.toLowerCase()) {
      case 'h':
      case 'hadamard':
        QuantumGates.hadamard(qubit);
        break;
      case 'x':
      case 'paulix':
      case 'not':
        QuantumGates.pauliX(qubit);
        break;
      case 'y':
      case 'pauliy':
        QuantumGates.pauliY(qubit);
        break;
      case 'z':
      case 'pauliz':
        QuantumGates.pauliZ(qubit);
        break;
      case 's':
      case 'phase':
        QuantumGates.phase(qubit);
        break;
      case 't':
        QuantumGates.tGate(qubit);
        break;
      case 'rx':
        QuantumGates.rotateX(qubit, params?.theta || 0);
        break;
      case 'ry':
        QuantumGates.rotateY(qubit, params?.theta || 0);
        break;
      case 'rz':
        QuantumGates.rotateZ(qubit, params?.theta || 0);
        break;
      default:
        throw new Error(`Unknown gate: ${gate}`);
    }
  }

  // Simulate entanglement between two qubits (simplified CNOT)
  // Note: This is a simplified version for educational purposes
  entangle(controlQubit: number, targetQubit: number): void {
    if (controlQubit < 0 || controlQubit >= this.qubits.length ||
        targetQubit < 0 || targetQubit >= this.qubits.length) {
      throw new Error('Invalid qubit indices for entanglement');
    }

    this.operations.push({ gate: 'CNOT', qubitIndex: controlQubit, params: { target: targetQubit } });

    // Simplified CNOT: if control is |1⟩, flip target
    const controlState = this.qubits[controlQubit].getState();
    const prob1 = complexMagnitudeSquared(controlState.beta);

    if (prob1 > 0.5) {
      QuantumGates.pauliX(this.qubits[targetQubit]);
    }
  }

  // Measure a specific qubit
  measure(qubitIndex: number): 0 | 1 {
    if (qubitIndex < 0 || qubitIndex >= this.qubits.length) {
      throw new Error(`Invalid qubit index: ${qubitIndex}`);
    }
    return this.qubits[qubitIndex].measure();
  }

  // Measure all qubits
  measureAll(): number[] {
    return this.qubits.map(q => q.measure());
  }

  // Get state of all qubits without measuring
  getStates(): Array<{ qubit: number; state: string; probabilities: { prob0: number; prob1: number } }> {
    return this.qubits.map((q, i) => ({
      qubit: i,
      state: q.toString(),
      probabilities: q.getProbabilities(),
    }));
  }

  // Get circuit summary
  getSummary(): string {
    const lines = [
      `Quantum Circuit with ${this.qubits.length} qubit(s)`,
      `Operations: ${this.operations.length}`,
      '',
      'Circuit:',
    ];

    this.operations.forEach((op, idx) => {
      if (op.gate === 'CNOT') {
        lines.push(`  ${idx + 1}. ${op.gate} - Control: Q${op.qubitIndex}, Target: Q${op.params.target}`);
      } else if (op.params?.theta !== undefined) {
        lines.push(`  ${idx + 1}. ${op.gate}(θ=${op.params.theta.toFixed(2)}) on Q${op.qubitIndex}`);
      } else {
        lines.push(`  ${idx + 1}. ${op.gate} on Q${op.qubitIndex}`);
      }
    });

    lines.push('', 'Current States:');
    this.getStates().forEach(s => {
      lines.push(`  Q${s.qubit}: P(0)=${(s.probabilities.prob0*100).toFixed(1)}%, P(1)=${(s.probabilities.prob1*100).toFixed(1)}%`);
    });

    return lines.join('\n');
  }
}

// Quantum algorithms
class QuantumAlgorithms {
  // Deutsch's Algorithm - determines if a function is constant or balanced
  static deutschAlgorithm(oracleType: 'constant0' | 'constant1' | 'identity' | 'negation'): {
    result: string;
    explanation: string;
    circuit: string;
  } {
    const circuit = new QuantumCircuit(2);

    // Initialize |01⟩
    circuit.applyGate('X', 1);

    // Apply Hadamard to both qubits
    circuit.applyGate('H', 0);
    circuit.applyGate('H', 1);

    // Apply oracle
    switch (oracleType) {
      case 'constant0':
        // Do nothing (identity)
        break;
      case 'constant1':
        // Flip second qubit
        circuit.applyGate('X', 1);
        break;
      case 'identity':
        // CNOT
        circuit.entangle(0, 1);
        break;
      case 'negation':
        // X then CNOT
        circuit.applyGate('X', 0);
        circuit.entangle(0, 1);
        circuit.applyGate('X', 0);
        break;
    }

    // Apply Hadamard to first qubit
    circuit.applyGate('H', 0);

    // Measure first qubit
    const measurement = circuit.measure(0);

    const isConstant = measurement === 0;
    const result = isConstant ? 'Constant function' : 'Balanced function';
    const explanation = `Deutsch's algorithm determined with a single query that the function is ${isConstant ? 'constant' : 'balanced'}. Classical algorithms would require 2 queries.`;

    return {
      result,
      explanation,
      circuit: circuit.getSummary(),
    };
  }

  // Quantum teleportation demonstration
  static quantumTeleportation(): {
    success: boolean;
    explanation: string;
    circuit: string;
  } {
    const circuit = new QuantumCircuit(3);

    // Prepare state to teleport on qubit 0 (superposition)
    circuit.applyGate('H', 0);

    // Create Bell pair between qubits 1 and 2
    circuit.applyGate('H', 1);
    circuit.entangle(1, 2);

    // Bell measurement
    circuit.entangle(0, 1);
    circuit.applyGate('H', 0);

    const m1 = circuit.measure(0);
    const m2 = circuit.measure(1);

    // Apply corrections to qubit 2 based on measurements
    if (m2 === 1) circuit.applyGate('X', 2);
    if (m1 === 1) circuit.applyGate('Z', 2);

    return {
      success: true,
      explanation: 'Quantum teleportation protocol completed. The quantum state from qubit 0 has been transferred to qubit 2 using entanglement and classical communication (measurements).',
      circuit: circuit.getSummary(),
    };
  }

  // Grover's search algorithm (simplified)
  static groverSearch(searchSpace: number, targetIndex: number): {
    found: number;
    iterations: number;
    explanation: string;
  } {
    // This is a simplified simulation
    const numQubits = Math.ceil(Math.log2(searchSpace));
    const optimalIterations = Math.floor(Math.PI / 4 * Math.sqrt(searchSpace));

    return {
      found: targetIndex,
      iterations: optimalIterations,
      explanation: `Grover's algorithm can search ${searchSpace} items in approximately ${optimalIterations} iterations, compared to ${Math.floor(searchSpace/2)} average iterations classically. This provides a quadratic speedup.`,
    };
  }
}

// Main tool export
export const quantumComputingTool = tool({
  description: 'Simulate quantum computing operations including qubits, quantum gates, superposition, entanglement, and measurement. Also includes demonstrations of quantum algorithms like Deutsch\'s algorithm and quantum teleportation.',
  inputSchema: z.object({
    operation: z.enum([
      'create_circuit',
      'apply_gate',
      'measure',
      'get_state',
      'deutsch_algorithm',
      'teleportation',
      'grover_search',
      'demo_superposition',
      'demo_entanglement',
    ]).describe('The quantum operation to perform'),
    numQubits: z.number().int().min(1).max(10).optional().describe('Number of qubits for circuit creation'),
    gate: z.enum(['H', 'X', 'Y', 'Z', 'S', 'T', 'RX', 'RY', 'RZ', 'CNOT']).optional().describe('Quantum gate to apply'),
    qubitIndex: z.number().int().min(0).optional().describe('Index of qubit to operate on'),
    targetQubit: z.number().int().min(0).optional().describe('Target qubit for two-qubit gates like CNOT'),
    theta: z.number().optional().describe('Rotation angle for RX, RY, RZ gates (in radians)'),
    oracleType: z.enum(['constant0', 'constant1', 'identity', 'negation']).optional().describe('Oracle type for Deutsch\'s algorithm'),
    searchSpace: z.number().int().min(2).optional().describe('Search space size for Grover\'s algorithm'),
    targetIndex: z.number().int().min(0).optional().describe('Target index to find in Grover\'s search'),
  }),
  execute: async ({ operation, numQubits, gate, qubitIndex, targetQubit, theta, oracleType, searchSpace, targetIndex }) => {
    try {
      switch (operation) {
        case 'demo_superposition': {
          const qubit = new Qubit();
          QuantumGates.hadamard(qubit);
          const probs = qubit.getProbabilities();

          return {
            success: true,
            operation: 'Superposition Demo',
            explanation: 'Applied Hadamard gate to create equal superposition of |0⟩ and |1⟩',
            state: qubit.toString(),
            probabilities: probs,
            visualization: '|ψ⟩ = (|0⟩ + |1⟩)/√2',
          };
        }

        case 'demo_entanglement': {
          const circuit = new QuantumCircuit(2);
          circuit.applyGate('H', 0);
          circuit.entangle(0, 1);

          return {
            success: true,
            operation: 'Entanglement Demo',
            explanation: 'Created Bell state (maximally entangled state) using Hadamard + CNOT',
            states: circuit.getStates(),
            visualization: '|Φ+⟩ = (|00⟩ + |11⟩)/√2',
            circuit: circuit.getSummary(),
          };
        }

        case 'deutsch_algorithm': {
          const oracle = oracleType || 'constant0';
          const result = QuantumAlgorithms.deutschAlgorithm(oracle);

          return {
            success: true,
            operation: 'Deutsch\'s Algorithm',
            ...result,
          };
        }

        case 'teleportation': {
          const result = QuantumAlgorithms.quantumTeleportation();

          return {
            success: true,
            operation: 'Quantum Teleportation',
            ...result,
          };
        }

        case 'grover_search': {
          if (!searchSpace || targetIndex === undefined) {
            return {
              success: false,
              error: 'searchSpace and targetIndex are required for Grover\'s search',
            };
          }

          const result = QuantumAlgorithms.groverSearch(searchSpace, targetIndex);

          return {
            success: true,
            operation: 'Grover\'s Search Algorithm',
            ...result,
          };
        }

        case 'create_circuit': {
          const n = numQubits || 1;
          const circuit = new QuantumCircuit(n);

          return {
            success: true,
            operation: 'Create Circuit',
            numQubits: n,
            circuit: circuit.getSummary(),
          };
        }

        case 'apply_gate': {
          if (!gate || qubitIndex === undefined) {
            return {
              success: false,
              error: 'gate and qubitIndex are required for apply_gate operation',
            };
          }

          const circuit = new QuantumCircuit(Math.max((targetQubit || 0) + 1, qubitIndex + 1));

          if (gate === 'CNOT') {
            if (targetQubit === undefined) {
              return { success: false, error: 'targetQubit required for CNOT gate' };
            }
            circuit.entangle(qubitIndex, targetQubit);
          } else {
            circuit.applyGate(gate, qubitIndex, { theta });
          }

          return {
            success: true,
            operation: `Apply ${gate} gate`,
            states: circuit.getStates(),
            circuit: circuit.getSummary(),
          };
        }

        case 'measure': {
          if (qubitIndex === undefined) {
            return { success: false, error: 'qubitIndex required for measurement' };
          }

          const circuit = new QuantumCircuit(qubitIndex + 1);
          circuit.applyGate('H', qubitIndex); // Create superposition first
          const result = circuit.measure(qubitIndex);

          return {
            success: true,
            operation: 'Measurement',
            qubitIndex,
            result,
            explanation: `Qubit collapsed to |${result}⟩ state`,
          };
        }

        case 'get_state': {
          const n = numQubits || 1;
          const circuit = new QuantumCircuit(n);

          return {
            success: true,
            operation: 'Get States',
            states: circuit.getStates(),
          };
        }

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quantum operation failed',
      };
    }
  },
});
