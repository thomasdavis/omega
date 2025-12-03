# Omega (Ω) Particle Shape Issue - V2

## Current Status

We fixed the arc direction (it now opens upward ∩), but the overall shape still doesn't match the Omega symbol (Ω).

## Current Shape (ALMOST THERE, BUT WRONG)

```
   _____
  /     \
 |       |
 |       |
_|       |_
```

What we're getting:
- **Top**: A full semicircle/arch that goes all the way across
- **Sides**: Two vertical stems that start from the endpoints of the arch
- **Bottom**: Two horizontal feet extending outward

This creates more of a **rounded archway** or **horseshoe magnet** shape.

## What Omega (Ω) Actually Looks Like

```
  \   /
   \_/
   | |
   | |
  _| |_
```

The key differences:
1. **The arc should NOT be a full semicircle**
2. The top should have **two diagonal/curved parts coming down and meeting at a bottom point**
3. It looks more like an **upside-down horseshoe** where the opening is at the BOTTOM
4. The legs extend DOWN from where the arc curves meet at the bottom
5. The overall shape is: **arc opens downward, legs extend from the bottom of the arc**

## The Real Omega Character Breakdown

Looking at the actual Ω character:
- Top: Two curved segments that start wide apart and curve toward each other
- Middle: The curves meet/come close at a point in the middle
- **The "opening" or gap is at the BOTTOM of the curved part, NOT at the top**
- Legs: Two straight vertical lines drop down from near where the curves end
- Feet: Small horizontal serifs at the bottom

## Visual Comparison

**What we have now (WRONG):**
```
    ∩     <- Full arch opening upward
    | |   <- Legs
   _| |_  <- Feet
```
This is like an **archway** or **Π with rounded top**.

**What Omega actually is (CORRECT):**
```
  Ω
```
Or breaking it down:
```
  ( )    <- Two curves coming together (opening faces DOWN)
   | |   <- Legs from the curve endpoints
  _| |_  <- Feet
```

## The Core Problem

We're drawing a **horseshoe that opens upward (∩)**, but Omega is actually a **horseshoe that opens downward (∪)** WITH legs extending from the endpoints.

Wait, that sounds confusing because I said the arc should go UP earlier. Let me clarify:

**The confusion:**
- The TOP of the Omega is curved (like a dome)
- But the curves are **not connected at the top** - they curve down and around
- The **gap/opening between the curves is at the BOTTOM**
- It's like a **circular arch with the bottom cut open**, with legs extending from the cut points

## Correct Description

Think of Omega as:
1. Start with a circle: ○
2. Cut the bottom portion out to create an opening: ⌓ or ∪ shape
3. Add vertical legs extending down from the cut points
4. Add feet at the bottom of the legs

Or think of it as:
1. Draw a rounded arch/dome at the top: ∩
2. Make the arch continue down the sides (like parentheses that curve inward)
3. Stop the curves partway down, leaving a gap
4. From those endpoints, draw straight vertical legs
5. Add horizontal feet

## Technical Requirements

The shape we need consists of:

### 1. Top Curved Section (Not a simple semicircle)
- Should curve from top-left around to top-right
- The curve continues down the sides
- Creates more of a "C" shape on each side that mirrors

### 2. Vertical Legs
- Start from where the curved sections end
- Go straight down

### 3. Horizontal Feet
- Small lines extending outward from the bottom of each leg

## Example in Text Art

```
Omega (correct):
    ___
   /   \
  |     |
  |    gap    <- The curves don't connect here
  |     |
  |     |
 _|     |_
```

## Current Code Location

File: `/Users/ajaxdavis/repos/discord/omega/apps/web/components/ParticleFlowField.tsx`

Current arc code (lines 48-57):
```typescript
for (let angle = 0; angle <= p.PI; angle += 0.01) {
  const x = centerX + p.cos(angle) * radius;
  const y = arcBaseY - p.sin(angle) * radius * 0.85;
  omegaPoints.push(p.createVector(x, y));
}
```

This creates a semicircle from 0° to 180°, which is a full arch.

## What We Actually Need

Instead of drawing angle 0 to PI (a full semicircle), we might need to:

1. Draw the **top arc** from roughly 30° to 150° (or similar range)
2. Draw **curved sections** that continue down the sides
3. Have the curved sections end partway down, creating a gap
4. Start the vertical legs from those endpoints

OR, more accurately:

The Omega should look like we're drawing a circle from about 45° to 315° (going around the top and down both sides), then removing the bottom section and adding vertical legs.

## Question for ChatGPT

Looking at the actual Greek letter Omega (Ω), how should I modify the P5.js particle generation code to create the correct shape?

The current code draws a full semicircle arch at the top (0° to 180°), but Omega looks more like:
- An arch that extends down the sides (like a rounded "⊃⊂" facing each other)
- With a gap at the bottom where the curves would meet
- Vertical legs extending from those gap points

What angle ranges and curve equations should I use to generate the proper Omega shape in P5.js?

## Key Insight

**Omega is NOT "arch + legs"**
**Omega IS "incomplete circle with gap at bottom + legs from the gap"**

The curved part goes AROUND more than halfway around a circle, leaving an opening at the bottom.
