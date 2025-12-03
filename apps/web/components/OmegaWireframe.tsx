'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * OmegaWireframe Component
 *
 * A topological wireframe visualization where nodes and edges form
 * the Ω symbol through emergent physics-based behavior.
 *
 * Features:
 * - Verlet integration for smooth physics
 * - Dynamic k-nearest neighbor graph topology
 * - Cursor interaction with local attraction
 * - Synapse events (edge glow animations)
 * - Phase system: init → emergence → stable
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  NODE_COUNT: 1000,
  K_NEIGHBORS: 4,
  OMEGA_STRENGTH: 0.15,
  SPRING_K: 0.02,
  DAMPING: 0.98,
  REST_LENGTH: 0.08,
  HOVER_RADIUS: 0.3,
  HOVER_STRENGTH: 0.05,
  ADJACENCY_INTERVAL: 30, // frames
  REPULSION_RADIUS: 0.05,
  REPULSION_STRENGTH: 0.001,
};

const COLORS = {
  BACKGROUND: 0x020309,
  NODE_BASE: 0xffaa66,
  NODE_OMEGA: 0xffcc88,
  EDGE_BASE: 0xff8844,
  EDGE_SYNAPSE: 0xffffaa,
};

// ============================================================================
// TYPES
// ============================================================================

type Vec2 = { x: number; y: number };

type Node = {
  id: number;
  position: Vec2;
  previousPosition: Vec2;
  isOnOmega: boolean;
  omegaBias: number;
  neighbors: number[];
  targetOmegaPoint: Vec2 | null;
};

type OmegaCurve = {
  points: Vec2[];
};

type SynapseEvent = {
  edges: [number, number][];
  startTime: number;
  duration: number;
};

type Phase = 'init' | 'emergence' | 'stable';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 0.0001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function closestPointOnCurve(pos: Vec2, curve: Vec2[]): Vec2 {
  let closestPoint = curve[0];
  let minDist = distance(pos, closestPoint);

  for (const point of curve) {
    const dist = distance(pos, point);
    if (dist < minDist) {
      minDist = dist;
      closestPoint = point;
    }
  }

  return closestPoint;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function computeKNearest(nodes: Node[], k: number): void {
  // Simple O(n²) k-nearest neighbor
  // For production, could use spatial hash or k-d tree
  for (const node of nodes) {
    const distances: [number, number][] = [];

    for (const other of nodes) {
      if (other.id === node.id) continue;
      const dist = distance(node.position, other.position);
      distances.push([other.id, dist]);
    }

    distances.sort((a, b) => a[1] - b[1]);
    node.neighbors = distances.slice(0, k).map(d => d[0]);
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OmegaWireframe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // ========================================================================
    // SCENE SETUP
    // ========================================================================

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.BACKGROUND);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // ========================================================================
    // LOAD OMEGA CURVE
    // ========================================================================

    let omegaCurve: OmegaCurve | null = null;
    let nodes: Node[] = [];
    let phase: Phase = 'init';
    let phaseStartTime = 0;
    let synapseEvents: SynapseEvent[] = [];
    let hoverPos: Vec2 | null = null;

    fetch('/omega-curve.json')
      .then(res => res.json())
      .then(data => {
        omegaCurve = { points: data.points };
        initializeNodes();
        phaseStartTime = Date.now();
      });

    // ========================================================================
    // INITIALIZE NODES
    // ========================================================================

    function initializeNodes() {
      if (!omegaCurve) return;

      nodes = [];
      const aspectRatio = window.innerWidth / window.innerHeight;

      for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
        // Random position near center with some spread
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.4 + 0.1;

        const x = Math.cos(angle) * radius * aspectRatio;
        const y = Math.sin(angle) * radius;

        // Determine if this node should be on Ω
        const isOnOmega = Math.random() < 0.5;
        const omegaBias = isOnOmega ? 0.7 + Math.random() * 0.3 : 0.1 + Math.random() * 0.2;

        nodes.push({
          id: i,
          position: { x, y },
          previousPosition: { x, y },
          isOnOmega,
          omegaBias,
          neighbors: [],
          targetOmegaPoint: null,
        });
      }

      // Initial adjacency computation
      computeKNearest(nodes, CONFIG.K_NEIGHBORS);
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    const nodeGeometry = new THREE.CircleGeometry(0.003, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: COLORS.NODE_BASE });
    const nodeInstances: THREE.Mesh[] = [];

    const lineMaterial = new THREE.LineBasicMaterial({
      color: COLORS.EDGE_BASE,
      opacity: 0.08,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const lines: THREE.Line[] = [];

    function createVisuals() {
      // Create node instances
      for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
        const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
        scene.add(mesh);
        nodeInstances.push(mesh);
      }
    }

    function updateVisuals() {
      const aspectRatio = window.innerWidth / window.innerHeight;

      // Update node positions
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const mesh = nodeInstances[i];
        if (mesh) {
          mesh.position.set(node.position.x / aspectRatio, node.position.y, 0);
        }
      }

      // Clear old lines
      lines.forEach(line => scene.remove(line));
      lines.length = 0;

      // Draw edges
      for (const node of nodes) {
        for (const neighborId of node.neighbors) {
          const neighbor = nodes[neighborId];
          if (!neighbor) continue;

          // Skip if already drawn (undirected)
          if (neighborId < node.id) continue;

          const points = [
            new THREE.Vector3(node.position.x / aspectRatio, node.position.y, 0),
            new THREE.Vector3(neighbor.position.x / aspectRatio, neighbor.position.y, 0),
          ];

          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, lineMaterial);
          scene.add(line);
          lines.push(line);
        }
      }

      // Synapse events
      for (const event of synapseEvents) {
        const elapsed = (Date.now() - event.startTime) / 1000;
        const t = Math.min(elapsed / event.duration, 1);

        if (t >= 1) {
          synapseEvents = synapseEvents.filter(e => e !== event);
          continue;
        }

        const intensity = Math.sin(t * Math.PI); // Ease in-out

        for (const [nodeId, neighborId] of event.edges) {
          const node = nodes[nodeId];
          const neighbor = nodes[neighborId];
          if (!node || !neighbor) continue;

          const points = [
            new THREE.Vector3(node.position.x / aspectRatio, node.position.y, 0),
            new THREE.Vector3(neighbor.position.x / aspectRatio, neighbor.position.y, 0),
          ];

          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const mat = new THREE.LineBasicMaterial({
            color: COLORS.EDGE_SYNAPSE,
            opacity: 0.3 * intensity,
            transparent: true,
            blending: THREE.AdditiveBlending,
            linewidth: 2,
          });
          const line = new THREE.Line(geometry, mat);
          scene.add(line);
          lines.push(line);
        }
      }
    }

    // ========================================================================
    // PHYSICS UPDATE
    // ========================================================================

    let frameCount = 0;

    function updatePhysics() {
      if (!omegaCurve || nodes.length === 0) return;

      frameCount++;

      // Update phase
      const elapsed = (Date.now() - phaseStartTime) / 1000;
      if (phase === 'init' && elapsed > 1) {
        phase = 'emergence';
        phaseStartTime = Date.now();
      } else if (phase === 'emergence' && elapsed > 8) {
        phase = 'stable';
      }

      // Compute omega strength based on phase
      let omegaStrength = 0;
      if (phase === 'emergence') {
        const t = Math.min(elapsed / 8, 1);
        omegaStrength = easeInOutCubic(t) * CONFIG.OMEGA_STRENGTH;
      } else if (phase === 'stable') {
        omegaStrength = CONFIG.OMEGA_STRENGTH;
      }

      // Recompute adjacency periodically
      if (frameCount % CONFIG.ADJACENCY_INTERVAL === 0) {
        computeKNearest(nodes, CONFIG.K_NEIGHBORS);
      }

      // Update each node with Verlet integration
      for (const node of nodes) {
        // Compute velocity
        const velocity = {
          x: (node.position.x - node.previousPosition.x) * CONFIG.DAMPING,
          y: (node.position.y - node.previousPosition.y) * CONFIG.DAMPING,
        };

        // 1. Spring forces to neighbors
        for (const neighborId of node.neighbors) {
          const neighbor = nodes[neighborId];
          if (!neighbor) continue;

          const delta = {
            x: neighbor.position.x - node.position.x,
            y: neighbor.position.y - node.position.y,
          };
          const dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

          if (dist > 0.0001) {
            const diff = (dist - CONFIG.REST_LENGTH) * CONFIG.SPRING_K;
            const force = { x: (delta.x / dist) * diff, y: (delta.y / dist) * diff };
            velocity.x += force.x;
            velocity.y += force.y;
          }
        }

        // 2. Omega attraction
        if (node.isOnOmega && omegaStrength > 0) {
          if (!node.targetOmegaPoint) {
            node.targetOmegaPoint = closestPointOnCurve(node.position, omegaCurve.points);
          }

          const delta = {
            x: node.targetOmegaPoint.x - node.position.x,
            y: node.targetOmegaPoint.y - node.position.y,
          };

          velocity.x += delta.x * omegaStrength * node.omegaBias;
          velocity.y += delta.y * omegaStrength * node.omegaBias;
        }

        // 3. Hover attraction
        if (hoverPos) {
          const delta = {
            x: hoverPos.x - node.position.x,
            y: hoverPos.y - node.position.y,
          };
          const dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

          if (dist < CONFIG.HOVER_RADIUS && dist > 0.0001) {
            const strength = CONFIG.HOVER_STRENGTH * (1 - dist / CONFIG.HOVER_RADIUS);
            velocity.x += (delta.x / dist) * strength;
            velocity.y += (delta.y / dist) * strength;
          }
        }

        // 4. Integrate
        node.previousPosition.x = node.position.x;
        node.previousPosition.y = node.position.y;
        node.position.x += velocity.x;
        node.position.y += velocity.y;

        // Soft bounds
        const maxDist = 1.2;
        const dist = Math.sqrt(node.position.x * node.position.x + node.position.y * node.position.y);
        if (dist > maxDist) {
          node.position.x *= maxDist / dist;
          node.position.y *= maxDist / dist;
        }
      }

      // Spawn synapse events randomly
      if (phase === 'stable' && Math.random() < 0.005) {
        spawnSynapseEvent();
      }
    }

    function spawnSynapseEvent() {
      // Pick a random node on Ω
      const omegaNodes = nodes.filter(n => n.isOnOmega);
      if (omegaNodes.length === 0) return;

      const startNode = omegaNodes[Math.floor(Math.random() * omegaNodes.length)];
      const pathLength = 2 + Math.floor(Math.random() * 3);

      const edges: [number, number][] = [];
      let current = startNode;

      for (let i = 0; i < pathLength; i++) {
        if (current.neighbors.length === 0) break;
        const nextId = current.neighbors[Math.floor(Math.random() * current.neighbors.length)];
        const next = nodes[nextId];
        if (!next) break;

        edges.push([current.id, next.id]);
        current = next;
      }

      if (edges.length > 0) {
        synapseEvents.push({
          edges,
          startTime: Date.now(),
          duration: 0.8,
        });
      }
    }

    // ========================================================================
    // INTERACTION
    // ========================================================================

    function handleMouseMove(event: MouseEvent) {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      const aspectRatio = window.innerWidth / window.innerHeight;
      hoverPos = { x: x * aspectRatio, y };
    }

    function handleMouseLeave() {
      hoverPos = null;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // ========================================================================
    // RESIZE
    // ========================================================================

    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;

      camera.left = -aspectRatio;
      camera.right = aspectRatio;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    }

    window.addEventListener('resize', handleResize);

    // ========================================================================
    // ANIMATION LOOP
    // ========================================================================

    createVisuals();

    function animate() {
      requestRef.current = requestAnimationFrame(animate);

      updatePhysics();
      updateVisuals();

      renderer.render(scene, camera);
    }

    animate();

    // ========================================================================
    // CLEANUP
    // ========================================================================

    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);

      // Dispose Three.js resources
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
