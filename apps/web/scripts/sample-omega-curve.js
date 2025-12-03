/**
 * Sample Ω curve points from SVG
 * Run with: node scripts/sample-omega-curve.js
 */

const paper = require('paper');
const fs = require('fs');
const path = require('path');

// Setup paper with a virtual canvas
paper.setup(new paper.Size(1000, 1000));

// Read the SVG file
const svgPath = path.join(__dirname, '../public/omega.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

// Import SVG
paper.project.importSVG(svgContent, {
  onLoad: (item) => {
    // Flatten to get the path
    let shape = item;
    if (shape.children && shape.children.length) {
      shape = shape.reduce();
    }

    // Center and normalize to [-1, 1] space
    const bounds = shape.bounds;
    const center = bounds.center;
    const size = Math.max(bounds.width, bounds.height);

    // Sample points along the path
    const sampleCount = 200; // High-res sampling for smooth Ω
    const points = [];

    const length = shape.length;
    const step = length / sampleCount;

    for (let i = 0; i < length; i += step) {
      const pt = shape.getPointAt(i);
      if (pt) {
        // Normalize to [-1, 1]
        const normalized = {
          x: (pt.x - center.x) / (size / 2),
          y: (pt.y - center.y) / (size / 2)
        };
        points.push(normalized);
      }
    }

    // Save to JSON
    const output = {
      points,
      metadata: {
        sampleCount: points.length,
        bounds: {
          width: bounds.width,
          height: bounds.height
        }
      }
    };

    const outputPath = path.join(__dirname, '../public/omega-curve.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`✓ Sampled ${points.length} points from Ω curve`);
    console.log(`✓ Saved to ${outputPath}`);
    process.exit(0);
  },
  onError: (err) => {
    console.error('Error loading SVG:', err);
    process.exit(1);
  }
});
