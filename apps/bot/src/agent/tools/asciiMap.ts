/**
 * ASCII Map Tool - Generates ASCII maps for dungeons and game maps
 * Supports rooms, corridors, traps, treasures, stairs, and legends
 */

import { tool } from 'ai';
import { z } from 'zod';

// Map symbols
const SYMBOLS = {
  WALL: '#',
  FLOOR: '.',
  DOOR: '+',
  TRAP: '^',
  TREASURE: '$',
  STAIRS_UP: '<',
  STAIRS_DOWN: '>',
  PLAYER: '@',
  MONSTER: 'M',
  WATER: '~',
  GRASS: '"',
  TREE: 'T',
  EMPTY: ' ',
} as const;

const mapElementSchema = z.object({
  type: z.enum(['room', 'corridor', 'trap', 'treasure', 'stairs', 'monster', 'player', 'feature'])
    .describe('Type of map element to place'),
  x: z.number().int().describe('X coordinate (column) for the element'),
  y: z.number().int().describe('Y coordinate (row) for the element'),
  width: z.number().int().optional().describe('Width of room or feature (default: 5 for rooms, 1 for features)'),
  height: z.number().int().optional().describe('Height of room or feature (default: 3 for rooms, 1 for features)'),
  direction: z.enum(['horizontal', 'vertical']).optional().describe('Direction of corridor (default: horizontal)'),
  length: z.number().int().optional().describe('Length of corridor (default: 5)'),
  stairType: z.enum(['up', 'down']).optional().describe('Type of stairs (up or down)'),
  featureType: z.enum(['water', 'grass', 'tree']).optional().describe('Type of environmental feature'),
});

type MapElement = z.infer<typeof mapElementSchema>;

interface MapOptions {
  width: number;
  height: number;
  title?: string;
  legend?: boolean;
}

/**
 * Generate an ASCII map based on provided elements
 */
function generateMap(elements: MapElement[], options: MapOptions): string {
  const { width, height, title, legend = true } = options;

  // Initialize grid with empty spaces
  const grid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(SYMBOLS.EMPTY));

  // Process each element
  for (const element of elements) {
    switch (element.type) {
      case 'room':
        drawRoom(grid, element);
        break;
      case 'corridor':
        drawCorridor(grid, element);
        break;
      case 'trap':
        placeSymbol(grid, element.x, element.y, SYMBOLS.TRAP);
        break;
      case 'treasure':
        placeSymbol(grid, element.x, element.y, SYMBOLS.TREASURE);
        break;
      case 'stairs':
        const stairSymbol = element.stairType === 'up' ? SYMBOLS.STAIRS_UP : SYMBOLS.STAIRS_DOWN;
        placeSymbol(grid, element.x, element.y, stairSymbol);
        break;
      case 'monster':
        placeSymbol(grid, element.x, element.y, SYMBOLS.MONSTER);
        break;
      case 'player':
        placeSymbol(grid, element.x, element.y, SYMBOLS.PLAYER);
        break;
      case 'feature':
        drawFeature(grid, element);
        break;
    }
  }

  // Build output
  const lines: string[] = [];

  if (title) {
    lines.push('');
    lines.push(title);
    lines.push('='.repeat(title.length));
    lines.push('');
  }

  // Add the map
  for (let y = 0; y < height; y++) {
    lines.push(grid[y].join(''));
  }

  // Add legend
  if (legend) {
    lines.push('');
    lines.push('Legend:');
    lines.push(`  ${SYMBOLS.WALL} = Wall`);
    lines.push(`  ${SYMBOLS.FLOOR} = Floor`);
    lines.push(`  ${SYMBOLS.DOOR} = Door`);
    lines.push(`  ${SYMBOLS.TRAP} = Trap`);
    lines.push(`  ${SYMBOLS.TREASURE} = Treasure`);
    lines.push(`  ${SYMBOLS.STAIRS_UP} = Stairs Up`);
    lines.push(`  ${SYMBOLS.STAIRS_DOWN} = Stairs Down`);
    lines.push(`  ${SYMBOLS.PLAYER} = Player`);
    lines.push(`  ${SYMBOLS.MONSTER} = Monster`);
    lines.push(`  ${SYMBOLS.WATER} = Water`);
    lines.push(`  ${SYMBOLS.GRASS} = Grass`);
    lines.push(`  ${SYMBOLS.TREE} = Tree`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Draw a room on the grid
 */
function drawRoom(grid: string[][], element: MapElement): void {
  const { x, y, width = 5, height = 3 } = element;
  const maxY = grid.length;
  const maxX = grid[0].length;

  // Draw walls
  for (let row = y; row < y + height && row < maxY; row++) {
    for (let col = x; col < x + width && col < maxX; col++) {
      if (row === y || row === y + height - 1 || col === x || col === x + width - 1) {
        grid[row][col] = SYMBOLS.WALL;
      } else {
        grid[row][col] = SYMBOLS.FLOOR;
      }
    }
  }

  // Add door if specified
  if (width > 2 && height > 2) {
    const doorX = x + Math.floor(width / 2);
    const doorY = y + Math.floor(height / 2);

    // Place door on bottom wall by default
    if (y + height - 1 < maxY && doorX < maxX) {
      grid[y + height - 1][doorX] = SYMBOLS.DOOR;
    }
  }
}

/**
 * Draw a corridor on the grid
 */
function drawCorridor(grid: string[][], element: MapElement): void {
  const { x, y, direction = 'horizontal', length = 5 } = element;
  const maxY = grid.length;
  const maxX = grid[0].length;

  if (direction === 'horizontal') {
    for (let col = x; col < x + length && col < maxX; col++) {
      if (y < maxY) {
        grid[y][col] = SYMBOLS.FLOOR;
      }
    }
  } else {
    for (let row = y; row < y + length && row < maxY; row++) {
      if (x < maxX) {
        grid[row][x] = SYMBOLS.FLOOR;
      }
    }
  }
}

/**
 * Draw a feature on the grid
 */
function drawFeature(grid: string[][], element: MapElement): void {
  const { x, y, featureType = 'water', width = 1, height = 1 } = element;
  const maxY = grid.length;
  const maxX = grid[0].length;

  let symbol: string = SYMBOLS.WATER;
  if (featureType === 'grass') symbol = SYMBOLS.GRASS;
  if (featureType === 'tree') symbol = SYMBOLS.TREE;

  for (let row = y; row < y + height && row < maxY; row++) {
    for (let col = x; col < x + width && col < maxX; col++) {
      grid[row][col] = symbol;
    }
  }
}

/**
 * Place a symbol at a specific position
 */
function placeSymbol(grid: string[][], x: number, y: number, symbol: string): void {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = symbol;
  }
}

export const asciiMapTool = tool({
  description: `Generate ASCII maps for dungeons, game maps, or any text-based spatial layouts.

  Supports:
  - Rooms with walls, floors, and doors
  - Corridors (horizontal and vertical)
  - Traps (^), Treasures ($), Stairs (< up, > down)
  - Monsters (M), Player (@)
  - Environmental features (water ~, grass ", trees T)
  - Custom legends

  Perfect for D&D dungeons, roguelike games, or any text-based spatial visualization.`,
  inputSchema: z.object({
    width: z.number().int().min(10).max(80).describe('Width of the map in characters (10-80)'),
    height: z.number().int().min(10).max(40).describe('Height of the map in rows (10-40)'),
    title: z.string().optional().describe('Optional title for the map'),
    elements: z.array(mapElementSchema).describe('Array of map elements to place on the map'),
    showLegend: z.boolean().optional().describe('Show legend explaining symbols (default: true)'),
  }),
  execute: async ({ width, height, title, elements, showLegend = true }) => {
    try {
      // Validate dimensions
      if (width < 10 || width > 80) {
        return {
          success: false,
          error: 'Width must be between 10 and 80 characters',
        };
      }

      if (height < 10 || height > 40) {
        return {
          success: false,
          error: 'Height must be between 10 and 40 rows',
        };
      }

      // Generate the map
      const map = generateMap(elements, {
        width,
        height,
        title,
        legend: showLegend,
      });

      return {
        success: true,
        map,
        elementCount: elements.length,
        dimensions: { width, height },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate map',
      };
    }
  },
});
