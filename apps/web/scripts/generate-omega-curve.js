/**
 * Generate Ω curve points parametrically
 * Run with: node scripts/generate-omega-curve.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate Ω shape as a connected curve
 * Ω consists of:
 * 1. A horseshoe/arc at the top (incomplete circle with bottom gap)
 * 2. Two vertical legs extending down from the gap endpoints
 * 3. Two horizontal feet at the bottom
 */
function generateOmegaCurve() {
  const points = [];

  // Parameters for Ω shape
  const bodyRadius = 0.5;  // Radius of the curved body
  const gapAngle = Math.PI / 3; // 60° gap at bottom
  const legLength = 0.6;
  const footLength = 0.25;

  // 1. Curved body (horseshoe arc)
  // Start from bottom-left gap, go around top, to bottom-right gap
  const bottomAngle = Math.PI / 2; // Bottom center
  const leftGapAngle = bottomAngle + gapAngle;
  const rightGapAngle = bottomAngle - gapAngle;

  // Arc from left gap → top → right gap
  const arcSamples = 120;

  // Left side going up and around
  for (let i = 0; i <= arcSamples; i++) {
    const t = i / arcSamples;
    // Angle goes from leftGapAngle to 2π, then 0 to rightGapAngle
    const totalAngle = (2 * Math.PI - leftGapAngle) + rightGapAngle;
    const angle = leftGapAngle + t * totalAngle;

    const x = Math.cos(angle) * bodyRadius;
    const y = Math.sin(angle) * bodyRadius - 0.2; // Shift up slightly

    points.push({ x, y });
  }

  // Get endpoints for legs
  const leftLegStartX = Math.cos(leftGapAngle) * bodyRadius;
  const leftLegStartY = Math.sin(leftGapAngle) * bodyRadius - 0.2;
  const rightLegStartX = Math.cos(rightGapAngle) * bodyRadius;
  const rightLegStartY = Math.sin(rightGapAngle) * bodyRadius - 0.2;

  // 2. Right leg (going down from right gap endpoint)
  const legSamples = 30;
  for (let i = 1; i <= legSamples; i++) {
    const t = i / legSamples;
    const x = rightLegStartX;
    const y = rightLegStartY + t * legLength;
    points.push({ x, y });
  }

  // 3. Right foot (horizontal, extending right)
  const footSamples = 15;
  const rightFootY = rightLegStartY + legLength;
  for (let i = 1; i <= footSamples; i++) {
    const t = i / footSamples;
    const x = rightLegStartX + t * footLength;
    const y = rightFootY;
    points.push({ x, y });
  }

  // 4. Jump to left foot start (we'll close the path conceptually)
  // Left foot (horizontal, extending left)
  const leftFootY = leftLegStartY + legLength;
  for (let i = footSamples; i >= 0; i--) {
    const t = i / footSamples;
    const x = leftLegStartX - t * footLength;
    const y = leftFootY;
    points.push({ x, y });
  }

  // 5. Left leg (going up from foot to gap)
  for (let i = legSamples; i >= 1; i--) {
    const t = i / legSamples;
    const x = leftLegStartX;
    const y = leftLegStartY + t * legLength;
    points.push({ x, y });
  }

  return points;
}

// Generate and save
const points = generateOmegaCurve();

const output = {
  points,
  metadata: {
    sampleCount: points.length,
    description: "Parametrically generated Ω curve in normalized [-1, 1] space"
  }
};

const outputPath = path.join(__dirname, '../public/omega-curve.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✓ Generated ${points.length} points for Ω curve`);
console.log(`✓ Saved to ${outputPath}`);
