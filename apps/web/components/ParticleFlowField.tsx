'use client';

import { useEffect, useRef } from 'react';

/**
 * ParticleFlowField Component - Paper.js Version
 *
 * A stunning interactive particle flow field visualization using Paper.js.
 * Features warm-toned particles that periodically swirl into the Ω symbol.
 *
 * Key features:
 * - 1500 larger particles with flow field
 * - Warm color palette (reds, oranges, browns, whites)
 * - Periodic attraction to Ω symbol shape (sampled from SVG)
 * - Mouse interaction for particle attraction
 * - Screen blend mode for glowing effect
 * - Responsive canvas that fills the viewport
 */
export default function ParticleFlowField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Dynamically import Paper.js only on client side
    import('paper').then((paperModule) => {
      const paper = paperModule.default;

      // Install Paper.js in the local scope
      paper.setup(canvasRef.current!);

      // ---------- CONFIG ----------
      const NUM_PARTICLES = 1500;
      const FLOW_SCALE = 0.0025;
      const MAX_SPEED = 5;
      const CYCLE_SECONDS = 9;
      const SWIRL_SECONDS = 5;

      // Warm color palette
      const COLORS = [
        new paper.Color({ hue: 0, saturation: 0.7, brightness: 1.0, alpha: 0.12 }),
        new paper.Color({ hue: 15, saturation: 0.9, brightness: 0.95, alpha: 0.12 }),
        new paper.Color({ hue: 25, saturation: 0.75, brightness: 1.0, alpha: 0.12 }),
        new paper.Color({ hue: 30, saturation: 0.6, brightness: 0.95, alpha: 0.12 }),
        new paper.Color({ hue: 20, saturation: 0.2, brightness: 1.0, alpha: 0.10 }),
        new paper.Color({ hue: 15, saturation: 0.4, brightness: 0.8, alpha: 0.12 })
      ];

      let omegaPoints: paper.Point[] = [];
      let particles: Particle[] = [];
      let omegaReady = false;

      // ---------- EASING ----------
      function easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      // ---------- PARTICLE CLASS ----------
      class Particle {
        position: paper.Point;
        velocity: paper.Point;
        acceleration: paper.Point;
        maxSpeed: number;
        radius: number;
        target: paper.Point | null;
        shape: paper.Path.Circle;

        constructor() {
          this.position = paper.Point.random().multiply(paper.view.size);
          this.velocity = new paper.Point(0, 0);
          this.acceleration = new paper.Point(0, 0);
          this.maxSpeed = MAX_SPEED;
          this.radius = 3 + Math.random() * 5;
          this.target = null;

          this.shape = new paper.Path.Circle(this.position, this.radius);
          this.shape.fillColor = COLORS[Math.floor(Math.random() * COLORS.length)].clone() as paper.Color;
          this.shape.blendMode = 'screen'; // additive-ish
        }

        applyForce(f: paper.Point) {
          this.acceleration = this.acceleration.add(f);
        }

        update(attractStrength: number, time: number) {
          // Ω attraction
          if (attractStrength > 0 && omegaPoints.length > 0) {
            if (!this.target) {
              this.target = omegaPoints[Math.floor(Math.random() * omegaPoints.length)];
            }
            const dir = this.target.subtract(this.position);
            const d = dir.length;
            if (d > 0.0001) {
              const normalizedDir = dir.normalize();
              const strength = attractStrength * 1.8 / (d * 0.01 + 1);
              this.applyForce(normalizedDir.multiply(strength));
            }
          } else {
            this.target = null;
          }

          // Flow field (simple swirl)
          const flowStrength = 1 - attractStrength * 0.7;
          if (flowStrength > 0) {
            const angle =
              this.position.x * FLOW_SCALE +
              this.position.y * FLOW_SCALE +
              time * 0.4;
            const flow = new paper.Point(Math.cos(angle), Math.sin(angle))
              .multiply(0.4 * flowStrength);
            this.applyForce(flow);
          }

          // Apply physics
          this.velocity = this.velocity.add(this.acceleration);
          if (this.velocity.length > this.maxSpeed) {
            this.velocity = this.velocity.normalize(this.maxSpeed);
          }

          this.position = this.position.add(this.velocity);
          this.acceleration = this.acceleration.multiply(0);
          this.shape.position = this.position;

          // Wrap around edges
          const w = paper.view.size.width;
          const h = paper.view.size.height;
          if (this.position.x < 0) this.position.x += w;
          if (this.position.x > w) this.position.x -= w;
          if (this.position.y < 0) this.position.y += h;
          if (this.position.y > h) this.position.y -= h;
        }
      }

      // ---------- Ω POINT SAMPLING ----------
      function sampleOmegaPoints(omegaItem: paper.Item) {
        omegaPoints = [];

        // If omega.svg has a group/compound path, flatten it
        let shape: any = omegaItem;
        if (shape.children && shape.children.length) {
          shape = shape.reduce(); // merge children into one compound path
        }

        shape.strokeColor = null;
        shape.fillColor = null; // keep it invisible
        shape.position = paper.view.center;

        // Scale nicely relative to viewport
        const targetWidth = Math.min(paper.view.size.width, paper.view.size.height) * 0.35;
        const scale = targetWidth / shape.bounds.width;
        shape.scale(scale, paper.view.center);

        // Sample along the entire length
        const len = shape.length;
        const pointCount = 800; // adjust detail
        const step = len / pointCount;

        for (let i = 0; i < len; i += step) {
          const pt = shape.getPointAt(i);
          if (pt) omegaPoints.push(pt.clone());
        }

        omegaItem.remove(); // remove original path from scene
      }

      // ---------- INIT PARTICLES ----------
      function initParticles() {
        particles.forEach(p => p.shape.remove());
        particles = [];
        for (let i = 0; i < NUM_PARTICLES; i++) {
          particles.push(new Particle());
        }
      }

      // ---------- IMPORT Ω SVG ----------
      paper.project.importSVG('/omega.svg', {
        onLoad: (item: paper.Item) => {
          sampleOmegaPoints(item);
          initParticles();
          omegaReady = true;
        }
      });

      // ---------- MAIN LOOP ----------
      let frameCount = 0;
      paper.view.onFrame = (event: any) => {
        if (!omegaReady) return;

        // Fade trails with a translucent black fill using the raw canvas
        const canvas = paper.view.element as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // lower alpha = longer trails
          ctx.fillRect(0, 0, paper.view.size.width, paper.view.size.height);
          ctx.restore();
        }

        const time = event.time; // seconds
        const framesPerCycle = CYCLE_SECONDS * 60;
        const framesSwirl = SWIRL_SECONDS * 60;
        const frame = frameCount % framesPerCycle;
        frameCount++;

        let attractStrength;
        if (frame < framesSwirl) {
          const t = frame / framesSwirl; // 0 → 1 over swirl phase
          attractStrength = easeInOutCubic(t);
        } else {
          attractStrength = 1; // hold Ω
        }

        particles.forEach(p => p.update(attractStrength, time));
      };

      // ---------- RESIZE ----------
      paper.view.onResize = () => {
        // On resize, we should re-import & resample Ω, then reset particles
        paper.project.clear();
        omegaPoints = [];
        particles = [];
        omegaReady = false;
        paper.project.importSVG('/omega.svg', {
          onLoad: (item: paper.Item) => {
            sampleOmegaPoints(item);
            initParticles();
            omegaReady = true;
          }
        });
      };
    });

    // Cleanup
    return () => {
      // Paper.js cleanup would go here if needed
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ width: '100vw', height: '100vh' }}
      data-paper-resize="true"
    />
  );
}
