'use client';

import { useEffect, useRef } from 'react';

/**
 * ParticleFlowField Component
 *
 * A stunning interactive particle flow field visualization using P5.js.
 * Features warm-toned particles that occasionally swirl into the Ω symbol.
 *
 * Key features:
 * - 1500 larger particles with multi-layered Perlin noise flow field
 * - Warm color palette (reds, oranges, browns, whites)
 * - Periodic attraction to Ω symbol shape
 * - Mouse interaction for particle attraction
 * - Additive blend mode for glowing effect
 * - Responsive canvas that fills the viewport
 */
export default function ParticleFlowField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import P5.js only on client side
    import('p5').then((p5Module) => {
      const p5 = p5Module.default;

      const sketch = (p: any) => {
        const particles: Particle[] = [];
        let zOff = 0; // Time dimension for 3D Perlin noise
        const numParticles = 1500;
        const noiseScale = 0.005; // Controls flow field granularity
        let omegaPoints: any[] = []; // Points defining Ω symbol shape
        let attractToOmega = 0; // 0-1 value for omega attraction strength
        let omegaCyclePhase = 0; // Current phase in the omega attraction cycle

        /**
         * Generate Ω symbol points for particle attraction
         *
         * Ω is an almost-full circle with a gap at the bottom, plus legs and feet.
         */
        const generateOmegaPoints = () => {
          omegaPoints = [];

          const centerX = p.width / 2;
          const centerY = p.height / 2;

          // Overall size of the symbol
          const scale = p.min(p.width, p.height) * 0.18;

          // Ellipse radii for the curved Ω body
          const radiusX = scale * 1.5;  // horizontal spread
          const radiusY = scale * 1.2;  // vertical spread

          // Slightly lift the Ω body so there's room for legs below
          const omegaCenterY = centerY - scale * 0.2;

          // ---- 1. Curved Ω body: almost full circle, with a bottom gap ----

          const bottomAngle = p.HALF_PI;       // π/2 → bottom
          const gapHalf = p.PI / 4;           // half-width of gap (~45°)
          const leftGapAngle = bottomAngle + gapHalf;   // left side of gap
          const rightGapAngle = bottomAngle - gapHalf;  // right side of gap

          const step = 0.02;

          // Left side → top → right side (across the top of the circle)
          // First: from left gap up around to 2π
          for (let angle = leftGapAngle; angle <= p.TWO_PI; angle += step) {
            const x = centerX + p.cos(angle) * radiusX;
            const y = omegaCenterY + p.sin(angle) * radiusY;
            omegaPoints.push(p.createVector(x, y));
          }

          // Then: from 0 back down to right gap
          for (let angle = 0; angle <= rightGapAngle; angle += step) {
            const x = centerX + p.cos(angle) * radiusX;
            const y = omegaCenterY + p.sin(angle) * radiusY;
            omegaPoints.push(p.createVector(x, y));
          }

          // ---- 2. Compute leg start positions at the gap endpoints ----

          const leftLegStartX =
            centerX + p.cos(leftGapAngle) * radiusX;
          const leftLegStartY =
            omegaCenterY + p.sin(leftGapAngle) * radiusY;

          const rightLegStartX =
            centerX + p.cos(rightGapAngle) * radiusX;
          const rightLegStartY =
            omegaCenterY + p.sin(rightGapAngle) * radiusY;

          // ---- 3. Vertical legs ----

          const legHeight = scale * 1.4;
          const legSteps = 40;

          // Left leg – straight down
          for (let i = 0; i <= legSteps; i++) {
            const t = i / legSteps;
            const y = leftLegStartY + t * legHeight;
            omegaPoints.push(p.createVector(leftLegStartX, y));
          }

          // Right leg – straight down
          for (let i = 0; i <= legSteps; i++) {
            const t = i / legSteps;
            const y = rightLegStartY + t * legHeight;
            omegaPoints.push(p.createVector(rightLegStartX, y));
          }

          // ---- 4. Feet (small serifs at the bottom) ----

          const footY = Math.max(leftLegStartY, rightLegStartY) + legHeight;
          const footLength = scale * 0.6;
          const footSteps = 15;

          // Left foot – horizontal, extending left
          for (let i = 0; i <= footSteps; i++) {
            const t = i / footSteps;
            const x = leftLegStartX - t * footLength;
            omegaPoints.push(p.createVector(x, footY));
          }

          // Right foot – horizontal, extending right
          for (let i = 0; i <= footSteps; i++) {
            const t = i / footSteps;
            const x = rightLegStartX + t * footLength;
            omegaPoints.push(p.createVector(x, footY));
          }
        };

        /**
         * Particle Class
         * Represents a single particle with physics-based movement
         */
        class Particle {
          pos: any; // p5.Vector - current position
          vel: any; // p5.Vector - velocity
          acc: any; // p5.Vector - acceleration
          maxSpeed: number = 5; // Increased from 3 to 5 for faster movement
          size: number;
          omegaTarget: any; // Assigned Ω symbol point for attraction

          constructor() {
            // Random initial position across canvas
            this.pos = p.createVector(p.random(p.width), p.random(p.height));
            this.vel = p.createVector(0, 0);
            this.acc = p.createVector(0, 0);
            // Larger particles (3-8 pixels)
            this.size = p.random(3, 8);
            // Assign random omega point as target
            this.omegaTarget = null;
          }

          /**
           * Update particle physics
           * - Applies flow field force from multi-layered Perlin noise
           * - Applies omega symbol attraction during cycle phases
           * - Applies mouse attraction force when pressed
           * - Updates position using velocity and acceleration
           */
          update() {
            // Omega attraction force (periodic swirling into symbol)
            if (attractToOmega > 0 && omegaPoints.length > 0) {
              // Assign omega target if not yet assigned
              if (!this.omegaTarget) {
                this.omegaTarget = p.random(omegaPoints);
              }

              const omegaDir = p5.Vector.sub(this.omegaTarget, this.pos);
              const dist = omegaDir.mag();
              omegaDir.normalize();
              // Stronger attraction for faster formation
              const strength = attractToOmega * 1.5 * (1 / (dist * 0.01 + 1));
              omegaDir.mult(strength);
              this.acc.add(omegaDir);
            } else {
              // Reset omega target when not attracting
              this.omegaTarget = null;
            }

            // Multi-layered Perlin noise for complex flow patterns (when not fully attracted to omega)
            const noiseStrength = 1 - attractToOmega * 0.7;

            // Base noise layer
            let noiseValue = p.noise(
              this.pos.x * noiseScale,
              this.pos.y * noiseScale,
              zOff
            );
            // Second octave at 2x frequency for detail (0.5 amplitude)
            noiseValue += 0.5 * p.noise(
              this.pos.x * noiseScale * 2,
              this.pos.y * noiseScale * 2,
              zOff
            );

            // Convert noise to angle (0-1 mapped to 0-2π)
            const angle = noiseValue * p.TWO_PI * 2;

            // Create force vector from angle
            const force = p5.Vector.fromAngle(angle);
            force.mult(0.25 * noiseStrength); // Increased force for faster movement
            this.acc.add(force);

            // Mouse attraction: inverse distance relationship
            if (p.mouseIsPressed) {
              const mouse = p.createVector(p.mouseX, p.mouseY);
              const dir = p5.Vector.sub(mouse, this.pos);
              const dist = dir.mag();
              dir.normalize();
              // Attraction strength inversely proportional to distance
              // Formula: strength * (1 / (distance + 1))
              const strength = 0.05 * (1 / (dist + 1));
              dir.mult(strength);
              this.acc.add(dir);
            }

            // Apply physics
            this.vel.add(this.acc);
            this.vel.limit(this.maxSpeed);
            this.pos.add(this.vel);
            this.acc.mult(0); // Reset acceleration each frame

            // Edge wrapping for infinite canvas effect
            this.edges();
          }

          /**
           * Render particle with current color
           * Uses additive blend mode for glowing trail effect
           */
          display(col: any) {
            p.fill(col);
            p.noStroke();
            p.circle(this.pos.x, this.pos.y, this.size);
          }

          /**
           * Wrap particle position around canvas edges
           * Creates seamless infinite space
           */
          edges() {
            if (this.pos.x > p.width) this.pos.x = 0;
            if (this.pos.x < 0) this.pos.x = p.width;
            if (this.pos.y > p.height) this.pos.y = 0;
            if (this.pos.y < 0) this.pos.y = p.height;
          }
        }

        /**
         * P5.js setup function
         * Initializes canvas and particles
         */
        p.setup = () => {
          p.createCanvas(p.windowWidth, p.windowHeight);
          p.colorMode(p.HSB, 360, 100, 100, 100);
          p.blendMode(p.ADD); // Additive blending for glowing effect

          // Generate omega symbol points
          generateOmegaPoints();

          // Initialize particle array
          for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
          }

          // Initial black background
          p.background(0);
        };

        /**
         * P5.js draw loop
         * Renders background fade and updates all particles
         */
        p.draw = () => {
          // Semi-transparent black rectangle for trail fade effect
          // Alpha=5 creates long, ethereal trails
          p.blendMode(p.BLEND);
          p.fill(0, 5);
          p.rect(0, 0, p.width, p.height);
          p.blendMode(p.ADD); // Back to additive for particles

          // Update omega attraction cycle
          // Cycle: 300 frames (~5s at 60fps) attracting/swirling to omega
          //        240 frames (~4s) holding omega shape
          //        Total: 9 seconds per cycle
          const totalCycleFrames = 540; // 9 seconds at 60fps
          omegaCyclePhase = (p.frameCount % totalCycleFrames) / totalCycleFrames;

          if (omegaCyclePhase < 0.556) {
            // Swirling/attracting phase (0-55.6% = 5 seconds) - gradual ease in
            const t = omegaCyclePhase / 0.556;
            attractToOmega = p.easeInOutCubic(t);
          } else {
            // Hold omega shape (55.6-100% = 4 seconds)
            attractToOmega = 1;
          }

          // Warm color palette: reds, oranges, browns, whites
          // Using HSB color space for smooth transitions
          const colors: any[] = [
            p.color(0, 70, 100, 12),    // Bright red
            p.color(15, 85, 95, 12),    // Red-orange
            p.color(25, 75, 100, 12),   // Orange
            p.color(30, 60, 95, 12),    // Burnt orange
            p.color(20, 20, 100, 10),   // Warm white
            p.color(15, 40, 80, 12),    // Brown-red
          ];

          // Update time dimension for noise evolution - faster
          zOff += 0.004;

          // Update and render all particles
          particles.forEach((particle, index) => {
            // Cycle through color palette
            const colorIndex = index % colors.length;
            particle.update();
            particle.display(colors[colorIndex]);
          });
        };

        /**
         * Cubic ease in/out function for smooth transitions
         */
        p.easeInOutCubic = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        /**
         * Handle window resize
         * Recreates canvas and resets background
         */
        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
          generateOmegaPoints(); // Regenerate omega points for new canvas size
          p.background(0);
        };
      };

      // Create P5 instance attached to container
      if (containerRef.current) {
        new p5(sketch, containerRef.current);
      }
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
