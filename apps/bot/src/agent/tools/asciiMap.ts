/**
 * ASCII Map Drawing Tool - Creates various types of ASCII maps
 *
 * Features:
 * - Draw custom maps using ASCII art
 * - Support for various map styles (terrain, city, dungeon, etc.)
 * - Configurable map dimensions
 * - Multiple terrain/feature types
 * - Perfect for planning, visualization, or game design
 */

import { tool } from 'ai';
import { z } from 'zod';

// Map symbols for different terrain types
const TERRAIN_SYMBOLS = {
  // Natural terrain
  WATER: '~',
  MOUNTAIN: '^',
  FOREST: '♣',
  GRASS: '.',
  DESERT: '·',
  SNOW: '*',

  // Structures
  ROAD: '=',
  PATH: '-',
  BRIDGE: 'H',
  WALL: '#',
  BUILDING: '▓',
  TOWER: 'T',
  CASTLE: '■',

  // Points of interest
  TOWN: 'O',
  CITY: '⊕',
  VILLAGE: 'o',
  CAMP: 'A',
  TREASURE: '$',
  DANGER: '!',
  QUEST: '?',

  // Dungeon elements
  DOOR: '+',
  FLOOR: '.',
  CORRIDOR: '·',
  TRAP: '^',
  STAIRS_UP: '<',
  STAIRS_DOWN: '>',

  // Utility
  EMPTY: ' ',
  BORDER: '█',
} as const;

interface MapCell {
  symbol: string;
  x: number;
  y: number;
}

interface MapStyle {
  borderStyle: 'single' | 'double' | 'solid' | 'none';
  showCoordinates: boolean;
  showLegend: boolean;
}

/**
 * Create an empty map grid
 */
function createEmptyGrid(width: number, height: number, fillSymbol: string = ' '): string[][] {
  return Array(height).fill(null).map(() => Array(width).fill(fillSymbol));
}

/**
 * Draw a line on the map (Bresenham's line algorithm)
 */
function drawLine(
  grid: string[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  symbol: string
): void {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (true) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      grid[y][x] = symbol;
    }

    if (x === x2 && y === y2) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Draw a rectangle on the map
 */
function drawRectangle(
  grid: string[][],
  x: number,
  y: number,
  width: number,
  height: number,
  symbol: string,
  filled: boolean = false
): void {
  if (filled) {
    for (let row = y; row < y + height && row < grid.length; row++) {
      for (let col = x; col < x + width && col < grid[0].length; col++) {
        if (row >= 0 && col >= 0) {
          grid[row][col] = symbol;
        }
      }
    }
  } else {
    // Top and bottom
    for (let col = x; col < x + width && col < grid[0].length; col++) {
      if (col >= 0) {
        if (y >= 0 && y < grid.length) grid[y][col] = symbol;
        if (y + height - 1 >= 0 && y + height - 1 < grid.length) {
          grid[y + height - 1][col] = symbol;
        }
      }
    }
    // Left and right
    for (let row = y; row < y + height && row < grid.length; row++) {
      if (row >= 0) {
        if (x >= 0 && x < grid[0].length) grid[row][x] = symbol;
        if (x + width - 1 >= 0 && x + width - 1 < grid[0].length) {
          grid[row][x + width - 1] = symbol;
        }
      }
    }
  }
}

/**
 * Draw a circle on the map
 */
function drawCircle(
  grid: string[][],
  centerX: number,
  centerY: number,
  radius: number,
  symbol: string,
  filled: boolean = false
): void {
  if (filled) {
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radius * radius) {
          if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
            grid[y][x] = symbol;
          }
        }
      }
    }
  } else {
    // Bresenham's circle algorithm
    let x = 0;
    let y = radius;
    let d = 3 - 2 * radius;

    const plotCirclePoints = (cx: number, cy: number, px: number, py: number) => {
      const points = [
        [cx + px, cy + py],
        [cx - px, cy + py],
        [cx + px, cy - py],
        [cx - px, cy - py],
        [cx + py, cy + px],
        [cx - py, cy + px],
        [cx + py, cy - px],
        [cx - py, cy - px],
      ];

      for (const [plotX, plotY] of points) {
        if (plotY >= 0 && plotY < grid.length && plotX >= 0 && plotX < grid[0].length) {
          grid[plotY][plotX] = symbol;
        }
      }
    };

    plotCirclePoints(centerX, centerY, x, y);

    while (y >= x) {
      x++;
      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }
      plotCirclePoints(centerX, centerY, x, y);
    }
  }
}

/**
 * Place text on the map
 */
function placeText(
  grid: string[][],
  x: number,
  y: number,
  text: string
): void {
  if (y < 0 || y >= grid.length) return;

  for (let i = 0; i < text.length; i++) {
    const col = x + i;
    if (col >= 0 && col < grid[0].length) {
      grid[y][col] = text[i];
    }
  }
}

/**
 * Format the map with borders and optional legend
 */
function formatMap(
  grid: string[][],
  style: MapStyle,
  customLegend?: Record<string, string>
): string {
  const lines: string[] = [];
  const width = grid[0].length;

  // Border characters
  const borders = {
    single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    solid: { tl: '█', tr: '█', bl: '█', br: '█', h: '█', v: '█' },
    none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
  };

  const border = borders[style.borderStyle];

  lines.push('');

  // Top border
  if (style.borderStyle !== 'none') {
    lines.push(border.tl + border.h.repeat(width) + border.tr);
  }

  // Map content
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i].join('');
    if (style.borderStyle !== 'none') {
      lines.push(border.v + row + border.v);
    } else {
      lines.push(row);
    }
  }

  // Bottom border
  if (style.borderStyle !== 'none') {
    lines.push(border.bl + border.h.repeat(width) + border.br);
  }

  // Add legend if requested
  if (style.showLegend && customLegend) {
    lines.push('');
    lines.push('LEGEND:');
    for (const [symbol, description] of Object.entries(customLegend)) {
      lines.push(`  ${symbol} = ${description}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

export const asciiMapTool = tool({
  description: `Draw custom ASCII maps for various purposes including terrain maps, city layouts, area planning, and more.

  This tool allows you to create maps by specifying drawing commands. You can:
  - Draw lines, rectangles, and circles
  - Place symbols and text at specific coordinates
  - Fill areas with different terrain types
  - Create borders and legends

  Perfect for visualizing layouts, planning areas, creating game maps, or any spatial representation.`,

  inputSchema: z.object({
    width: z.number().int().min(10).max(100).describe('Map width in characters (default: 40)'),
    height: z.number().int().min(10).max(60).describe('Map height in characters (default: 25)'),

    fillSymbol: z.string().length(1).optional().describe('Symbol to fill the entire map background (default: space)'),

    lines: z.array(
      z.object({
        x1: z.number().int(),
        y1: z.number().int(),
        x2: z.number().int(),
        y2: z.number().int(),
        symbol: z.string().length(1),
      })
    ).optional().describe('Array of lines to draw: each with start (x1,y1), end (x2,y2), and symbol'),

    rectangles: z.array(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
        width: z.number().int().min(1),
        height: z.number().int().min(1),
        symbol: z.string().length(1),
        filled: z.boolean().optional(),
      })
    ).optional().describe('Array of rectangles to draw: position, dimensions, symbol, and whether filled'),

    circles: z.array(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
        radius: z.number().int().min(1),
        symbol: z.string().length(1),
        filled: z.boolean().optional(),
      })
    ).optional().describe('Array of circles to draw: center position, radius, symbol, and whether filled'),

    points: z.array(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
        symbol: z.string().length(1),
      })
    ).optional().describe('Array of individual points/symbols to place at specific coordinates'),

    labels: z.array(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
        text: z.string(),
      })
    ).optional().describe('Array of text labels to place on the map'),

    borderStyle: z.enum(['single', 'double', 'solid', 'none']).optional().describe('Border style for the map (default: single)'),

    showLegend: z.boolean().optional().describe('Show a legend of symbols used (default: false)'),

    legend: z.record(z.string()).optional().describe('Custom legend: map of symbol -> description'),
  }),

  execute: async ({
    width = 40,
    height = 25,
    fillSymbol = ' ',
    lines = [],
    rectangles = [],
    circles = [],
    points = [],
    labels = [],
    borderStyle = 'single',
    showLegend = false,
    legend = {},
  }) => {
    try {
      console.log(`🗺️  ASCII Map: Creating ${width}x${height} map...`);

      // Create the grid
      const grid = createEmptyGrid(width, height, fillSymbol);

      // Draw rectangles
      for (const rect of rectangles) {
        drawRectangle(
          grid,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          rect.symbol,
          rect.filled
        );
      }

      // Draw circles
      for (const circle of circles) {
        drawCircle(
          grid,
          circle.x,
          circle.y,
          circle.radius,
          circle.symbol,
          circle.filled
        );
      }

      // Draw lines
      for (const line of lines) {
        drawLine(
          grid,
          line.x1,
          line.y1,
          line.x2,
          line.y2,
          line.symbol
        );
      }

      // Place individual points
      for (const point of points) {
        if (point.y >= 0 && point.y < grid.length && point.x >= 0 && point.x < grid[0].length) {
          grid[point.y][point.x] = point.symbol;
        }
      }

      // Place text labels
      for (const label of labels) {
        placeText(grid, label.x, label.y, label.text);
      }

      // Format the map
      const style: MapStyle = {
        borderStyle,
        showCoordinates: false,
        showLegend,
      };

      const map = formatMap(grid, style, showLegend ? legend : undefined);

      console.log('   ✨ Map created successfully');

      return {
        success: true,
        map,
        width,
        height,
        elementsDrawn: {
          lines: lines.length,
          rectangles: rectangles.length,
          circles: circles.length,
          points: points.length,
          labels: labels.length,
        },
      };
    } catch (error) {
      console.error('Error generating ASCII map:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate ASCII map',
      };
    }
  },
});
