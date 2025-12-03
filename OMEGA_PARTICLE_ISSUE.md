# Omega (Ω) Particle Formation Issue

## Problem Description

We have a P5.js particle system that's supposed to form the Greek letter Omega (Ω), but instead it's forming an incorrect shape that looks like a smiley face or "U" shape with vertical lines on the sides.

## Current Behavior (WRONG)

The particles are forming this shape:
```
    ___
   /   \
  |     |
  |     |
 _|     |_
```

This looks like:
- A curved arc at the top
- Two vertical stems going down
- Two horizontal feet at the bottom pointing outward

**BUT** the arc is pointing DOWN (like a smile) instead of UP (like a horseshoe).

## Expected Behavior (CORRECT)

The Omega symbol (Ω) should look like this:
```
  \   /
   \ /
   | |
   | |
  _| |_
```

Or more accurately:
- An upward-opening horseshoe/arc at the TOP (like an upside-down U)
- Two vertical stems extending DOWN from the endpoints of the horseshoe
- Two small horizontal feet extending OUTWARD from the bottom of each stem

## Technical Details

### Current Implementation

**File:** `/Users/ajaxdavis/repos/discord/omega/apps/web/components/ParticleFlowField.tsx`

**Relevant Code Section:**
```typescript
const generateOmegaPoints = () => {
  omegaPoints = [];
  const centerX = p.width / 2;
  const centerY = p.height / 2;
  const scale = p.min(p.width, p.height) * 0.15;

  // Top horseshoe curve - full semicircle on top
  // Angle from PI (left) to 0 (right) to create upward-opening arc
  for (let angle = p.PI; angle >= 0; angle -= 0.01) {
    const radius = scale * 1.4;
    const x = centerX + p.cos(angle) * radius;
    const y = centerY - scale * 0.5 + p.sin(angle) * radius * 0.85;
    omegaPoints.push(p.createVector(x, y));
  }

  // Left leg - straight down from left side of curve
  const leftLegStartX = centerX - scale * 1.4;
  const leftLegStartY = centerY - scale * 0.5;
  for (let i = 0; i < 45; i++) {
    const t = i / 44;
    const y = leftLegStartY + t * scale * 1.5;
    omegaPoints.push(p.createVector(leftLegStartX, y));
  }

  // Right leg - straight down from right side of curve
  const rightLegStartX = centerX + scale * 1.4;
  const rightLegStartY = centerY - scale * 0.5;
  for (let i = 0; i < 45; i++) {
    const t = i / 44;
    const y = rightLegStartY + t * scale * 1.5;
    omegaPoints.push(p.createVector(rightLegStartX, y));
  }

  // Left foot - horizontal line extending left
  const leftFootBaseY = centerY + scale * 1.0;
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const x = leftLegStartX - t * scale * 0.5;
    omegaPoints.push(p.createVector(x, leftFootBaseY));
  }

  // Right foot - horizontal line extending right
  const rightFootBaseY = centerY + scale * 1.0;
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const x = rightLegStartX + t * scale * 0.5;
    omegaPoints.push(p.createVector(x, rightFootBaseY));
  }
};
```

### The Problem

**The arc is being drawn incorrectly.** When we use:
- `for (let angle = p.PI; angle >= 0; angle -= 0.01)`
- `const x = centerX + p.cos(angle) * radius;`
- `const y = centerY - scale * 0.5 + p.sin(angle) * radius * 0.85;`

This creates a **downward-facing arc** (smiley face), not an upward-facing horseshoe.

### P5.js Coordinate System

- Origin (0,0) is at **top-left**
- X increases to the **right**
- Y increases **downward**
- In P5.js:
  - `sin(0)` = 0
  - `sin(PI/2)` = 1
  - `sin(PI)` = 0
  - When angle goes from PI to 0, sin goes from 0 → 1 → 0

### What We Need

We need to draw an **upward-opening horseshoe** at the top, which in P5.js coordinate system (where Y increases downward) means:
- The **topmost point** of the arc should have the **smallest Y value**
- The arc should open **downward** in screen coordinates (but visually looks like it opens upward)
- The Ω symbol should look like an upside-down U at the top

## Additional Context

- We're using P5.js for the particle system
- Particles are attracted to points that form the Ω shape
- The color palette is warm tones (reds, oranges, browns, whites)
- Particles are 3-8 pixels in size
- Animation timing: 5 seconds to swirl into formation, 4 seconds holding the shape

## Screenshots

**What we're getting:** A U-shaped smiley face with stems
**What we need:** Ω (Greek Omega) - horseshoe opening upward with stems going down

## Question for ChatGPT

How do I fix the arc generation code in P5.js to create an upward-opening horseshoe (like the Omega symbol Ω) instead of a downward-opening arc (smiley face)?

The arc should:
1. Be positioned at the TOP of the symbol
2. Open UPWARD (like ⋂ or an upside-down U)
3. Have the two stems extend straight DOWN from the arc endpoints
4. Form the recognizable Ω shape

Please provide the corrected arc generation code with proper angle ranges and sin/cos calculations for the P5.js coordinate system.
