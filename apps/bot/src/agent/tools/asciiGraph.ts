/**
 * ASCII Graph Tool - Generates ASCII graphs based on user input
 * Supports bar charts and line graphs for simple data visualization
 */

import { tool } from 'ai';
import { z } from 'zod';

interface DataPoint {
  label: string;
  value: number;
}

/**
 * Generate a bar chart in ASCII format
 */
function generateBarChart(data: DataPoint[], options: { maxWidth?: number; showValues?: boolean }): string {
  const { maxWidth = 50, showValues = true } = options;

  if (data.length === 0) {
    return 'Error: No data provided';
  }

  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.value));
  if (maxValue <= 0) {
    return 'Error: All values must be greater than 0';
  }

  // Find longest label for alignment
  const maxLabelLength = Math.max(...data.map(d => d.label.length));

  const lines: string[] = [];
  lines.push(''); // Empty line for spacing

  for (const point of data) {
    // Pad label to align bars
    const paddedLabel = point.label.padEnd(maxLabelLength, ' ');

    // Calculate bar length (scale to maxWidth)
    const barLength = Math.round((point.value / maxValue) * maxWidth);
    const bar = '█'.repeat(barLength);

    // Build the line
    let line = `${paddedLabel} │ ${bar}`;
    if (showValues) {
      line += ` ${point.value}`;
    }

    lines.push(line);
  }

  lines.push(''); // Empty line for spacing
  return lines.join('\n');
}

/**
 * Generate a line graph in ASCII format
 */
function generateLineGraph(data: DataPoint[], options: { height?: number; width?: number }): string {
  const { height = 10, width = 50 } = options;

  if (data.length === 0) {
    return 'Error: No data provided';
  }

  if (data.length < 2) {
    return 'Error: Line graphs require at least 2 data points';
  }

  const values = data.map(d => d.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue;

  if (range === 0) {
    return 'Error: All values are the same, cannot create a line graph';
  }

  // Create the graph grid
  const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '));

  // Plot points and lines
  for (let i = 0; i < data.length; i++) {
    const x = Math.round((i / (data.length - 1)) * (width - 1));
    const normalizedValue = (values[i] - minValue) / range;
    const y = Math.round((1 - normalizedValue) * (height - 1));

    // Mark the point
    grid[y][x] = '●';

    // Draw line to next point
    if (i < data.length - 1) {
      const nextX = Math.round(((i + 1) / (data.length - 1)) * (width - 1));
      const nextNormalizedValue = (values[i + 1] - minValue) / range;
      const nextY = Math.round((1 - nextNormalizedValue) * (height - 1));

      // Simple line drawing using linear interpolation
      const steps = Math.max(Math.abs(nextX - x), Math.abs(nextY - y));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const lineX = Math.round(x + (nextX - x) * t);
        const lineY = Math.round(y + (nextY - y) * t);
        if (grid[lineY][lineX] === ' ') {
          grid[lineY][lineX] = '·';
        }
      }
    }
  }

  // Build the output with axis
  const lines: string[] = [];
  lines.push('');
  lines.push(`Max: ${maxValue.toFixed(2)}`);

  for (let row = 0; row < height; row++) {
    const rowStr = grid[row].join('');
    lines.push(`│${rowStr}│`);
  }

  lines.push(`└${'─'.repeat(width)}┘`);
  lines.push(`Min: ${minValue.toFixed(2)}`);

  // Add labels
  const labelLine = data.map(d => d.label).join(', ');
  lines.push(`Labels: ${labelLine}`);
  lines.push('');

  return lines.join('\n');
}

export const asciiGraphTool = tool({
  description: 'Generate ASCII graphs (bar charts or line graphs) for data visualization in text format. Perfect for displaying data visually in Discord messages.',
  parameters: z.object({
    type: z.enum(['bar', 'line']).describe('The type of graph to generate: "bar" for bar chart, "line" for line graph'),
    data: z.array(
      z.object({
        label: z.string().describe('The label for this data point'),
        value: z.number().describe('The numeric value for this data point'),
      })
    ).describe('Array of data points to plot. Each point needs a label and a value.'),
    maxWidth: z.number().optional().describe('Maximum width of the graph in characters (default: 50 for bar, 50 for line)'),
    height: z.number().optional().describe('Height of the graph in rows (only for line graphs, default: 10)'),
    showValues: z.boolean().optional().describe('Show numeric values on bar chart (default: true)'),
  }),
  // @ts-ignore - AI SDK beta.99 type mismatch
  execute: async ({ type, data, maxWidth, height, showValues }) => {
    try {
      let graph: string;

      if (type === 'bar') {
        graph = generateBarChart(data, { maxWidth, showValues });
      } else {
        graph = generateLineGraph(data, { height, width: maxWidth });
      }

      return {
        type,
        graph,
        dataPoints: data.length,
        success: true,
      };
    } catch (error) {
      return {
        type,
        error: error instanceof Error ? error.message : 'Failed to generate graph',
        success: false,
      };
    }
  },
});
