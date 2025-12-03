'use client';

import { useEffect, useRef } from 'react';

/**
 * ParticleFlowField Component
 *
 * A stunning interactive particle flow field visualization using P5.js.
 * Features ethereal, fluid dynamics with glowing trails and cosmic vibes.
 *
 * Key features:
 * - 1500 particles with multi-layered Perlin noise flow field
 * - Dynamic cycling colors (HSV pentadic palette)
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

        /**
         * Particle Class
         * Represents a single particle with physics-based movement
         */
        class Particle {
          pos: any; // p5.Vector - current position
          vel: any; // p5.Vector - velocity
          acc: any; // p5.Vector - acceleration
          maxSpeed: number = 3;
          size: number;

          constructor() {
            // Random initial position across canvas
            this.pos = p.createVector(p.random(p.width), p.random(p.height));
            this.vel = p.createVector(0, 0);
            this.acc = p.createVector(0, 0);
            // Variable size for depth perception (1-4 pixels)
            this.size = p.random(1, 4);
          }

          /**
           * Update particle physics
           * - Applies flow field force from multi-layered Perlin noise
           * - Applies mouse attraction force when pressed
           * - Updates position using velocity and acceleration
           */
          update() {
            // Multi-layered Perlin noise for complex flow patterns
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
            force.mult(0.15); // Force multiplier for smooth movement
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

          // Dynamic color cycling: pentadic harmony (72° spacing)
          // baseHue rotates slowly over time (0.1° per frame)
          const baseHue = (p.frameCount * 0.1) % 360;

          // 5-color palette with equal spacing (360/5 = 72°)
          const colors: any[] = [];
          for (let i = 0; i < 5; i++) {
            const hue = (baseHue + i * 72) % 360;
            // High saturation (80), full value (100), low alpha (8) for glow
            colors.push(p.color(hue, 80, 100, 8));
          }

          // Update time dimension for noise evolution
          zOff += 0.002;

          // Update and render all particles
          particles.forEach((particle, index) => {
            // Cycle through color palette
            const colorIndex = index % colors.length;
            particle.update();
            particle.display(colors[colorIndex]);
          });
        };

        /**
         * Handle window resize
         * Recreates canvas and resets background
         */
        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
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
