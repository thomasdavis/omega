/**
 * Draw ASCII Map Tool - Creates custom ASCII maps for various purposes
 *
 * Features:
 * - Draw maps using ASCII characters
 * - Support for various map styles: terrain, building layouts, game maps, diagrams
 * - Customizable size and symbols
 * - Perfect for visualizations, game design, documentation, and text-based layouts
 */

import { tool } from 'ai';
import { z } from 'zod';

// Common ASCII symbols for different map types
const MAP_SYMBOLS = {
  // Terrain symbols
  WATER: '~',
  MOUNTAIN: '^',
  FOREST: '♣',
  GRASS: '.',
  DESERT: '·',
  ROAD: '=',
  BRIDGE: 'H',
  CITY: '■',
  VILLAGE: '□',

  // Building symbols
  WALL: '#',
  DOOR: '+',
  WINDOW: 'o',
  FLOOR: '.',
  ROOM: ' ',

  // Generic symbols
  BORDER: '█',
  EMPTY: ' ',
  MARKER: 'X',
  PATH: '·',
  PLAYER: '@',
  ENEMY: 'E',
  TREASURE: '$',
  ENTRANCE: 'E',
  EXIT: 'X',
} as const;

type MapStyle = 'terrain' | 'building' | 'grid' | 'custom';

interface MapCell {
  symbol: string;
  label?: string;
}

/**
 * Create an empty map grid
 */
function createEmptyGrid(width: number, height: number, fillChar: string = ' '): string[][] {
  return Array(height)
    .fill(null)
    .map(() => Array(width).fill(fillChar));
}

/**
 * Parse map data from string format
 * Supports:
 * - Simple string grid (each line is a row)
 * - Coordinate-based format: "x,y:symbol" per line
 */
function parseMapData(
  mapData: string,
  width: number,
  height: number,
  defaultSymbol: string = ' '
): string[][] {
  const grid = createEmptyGrid(width, height, defaultSymbol);

  // Check if it's coordinate format (contains colons)
  if (mapData.includes(':')) {
    // Coordinate format: "x,y:symbol"
    const lines = mapData.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue; // Skip empty lines and comments

      const match = trimmed.match(/^(\d+),(\d+):(.+)$/);
      if (match) {
        const x = parseInt(match[1], 10);
        const y = parseInt(match[2], 10);
        const symbol = match[3];

        if (x >= 0 && x < width && y >= 0 && y < height) {
          grid[y][x] = symbol;
        }
      }
    }
  } else {
    // Grid format: each line is a row
    const lines = mapData.trim().split('\n');
    for (let y = 0; y < Math.min(lines.length, height); y++) {
      const line = lines[y];
      for (let x = 0; x < Math.min(line.length, width); x++) {
        grid[y][x] = line[x];
      }
    }
  }

  return grid;
}

/**
 * Add border to the map
 */
function addBorder(grid: string[][], borderChar: string = '█'): string[][] {
  const height = grid.length;
  const width = grid[0].length;

  // Create new grid with border
  const borderedGrid: string[][] = [];

  // Top border
  borderedGrid.push(Array(width + 2).fill(borderChar));

  // Add left and right borders to each row
  for (const row of grid) {
    borderedGrid.push([borderChar, ...row, borderChar]);
  }

  // Bottom border
  borderedGrid.push(Array(width + 2).fill(borderChar));

  return borderedGrid;
}

/**
 * Add labels to the map
 */
function addLabelsToMap(
  grid: string[][],
  labels: Array<{ x: number; y: number; text: string }>,
  labelPosition: 'below' | 'side' = 'below'
): { grid: string[][]; labelLines: string[] } {
  const labelLines: string[] = [];

  if (labels.length > 0) {
    labelLines.push('');
    labelLines.push('LABELS:');

    for (const label of labels) {
      const symbol = grid[label.y]?.[label.x] || '?';
      labelLines.push(`  (${label.x},${label.y}) ${symbol} - ${label.text}`);
    }
  }

  return { grid, labelLines };
}

/**
 * Format the map for output
 */
function formatMap(
  grid: string[][],
  title?: string,
  legend?: Array<{ symbol: string; description: string }>,
  labels?: Array<{ x: number; y: number; text: string }>,
  showCoordinates: boolean = false
): string {
  const lines: string[] = [];

  // Add title
  if (title) {
    lines.push('');
    lines.push(title);
    lines.push('═'.repeat(Math.max(title.length, grid[0].length)));
  } else {
    lines.push('');
  }

  // Add coordinate header if requested
  if (showCoordinates && grid[0].length <= 50) {
    const coordLine = '  ' + Array.from({ length: grid[0].length }, (_, i) => i % 10).join('');
    lines.push(coordLine);
  }

  // Add map rows
  for (let y = 0; y < grid.length; y++) {
    let row = grid[y].join('');
    if (showCoordinates) {
      row = (y % 10) + ' ' + row;
    }
    lines.push(row);
  }

  // Add labels
  if (labels && labels.length > 0) {
    const { labelLines } = addLabelsToMap(grid, labels);
    lines.push(...labelLines);
  }

  // Add legend
  if (legend && legend.length > 0) {
    lines.push('');
    lines.push('LEGEND:');
    for (const entry of legend) {
      lines.push(`  ${entry.symbol} = ${entry.description}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a sample terrain map
 */
function generateSampleTerrainMap(width: number, height: number): string[][] {
  const grid = createEmptyGrid(width, height, MAP_SYMBOLS.GRASS);

  // Add some mountains
  for (let i = 0; i < width / 10; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    if (grid[y]) grid[y][x] = MAP_SYMBOLS.MOUNTAIN;
  }

  // Add some forests
  for (let i = 0; i < width / 8; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    if (grid[y]) grid[y][x] = MAP_SYMBOLS.FOREST;
  }

  // Add a river (water)
  const riverY = Math.floor(height / 2);
  for (let x = 0; x < width; x++) {
    if (grid[riverY]) grid[riverY][x] = MAP_SYMBOLS.WATER;
  }

  // Add a city
  const cityX = Math.floor(width / 2);
  const cityY = Math.floor(height / 4);
  if (grid[cityY]) grid[cityY][cityX] = MAP_SYMBOLS.CITY;

  return grid;
}

/**
 * Generate a sample building layout
 */
function generateSampleBuildingMap(width: number, height: number): string[][] {
  const grid = createEmptyGrid(width, height, MAP_SYMBOLS.FLOOR);

  // Add walls around the perimeter
  for (let x = 0; x < width; x++) {
    grid[0][x] = MAP_SYMBOLS.WALL;
    grid[height - 1][x] = MAP_SYMBOLS.WALL;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = MAP_SYMBOLS.WALL;
    grid[y][width - 1] = MAP_SYMBOLS.WALL;
  }

  // Add a door
  const doorX = Math.floor(width / 2);
  grid[0][doorX] = MAP_SYMBOLS.DOOR;

  // Add some interior walls to create rooms
  const midX = Math.floor(width / 2);
  for (let y = 1; y < height - 1; y++) {
    if (y !== Math.floor(height / 2)) {
      grid[y][midX] = MAP_SYMBOLS.WALL;
    } else {
      grid[y][midX] = MAP_SYMBOLS.DOOR;
    }
  }

  return grid;
}

export const drawAsciiMapTool = tool({
  description: `Draw custom ASCII maps for various purposes including terrain maps, building layouts, game maps, and diagrams.

Use this tool when you need to:
- Create visual representations of locations or spaces
- Design game maps or levels
- Show building or room layouts
- Create simple diagrams or visualizations
- Illustrate spatial relationships

You can either:
1. Provide mapData as a string grid (each line is a row of the map)
2. Provide mapData using coordinate format: "x,y:symbol" (one per line)
3. Use a sample map (terrain or building) as a starting point

The tool supports custom symbols, borders, legends, and labels.`,
  inputSchema: z.object({
    width: z.number().int().min(10).max(100).describe('Map width in characters (default: 40)'),
    height: z.number().int().min(10).max(50).describe('Map height in characters (default: 20)'),
    mapData: z.string().optional().describe('Map data as string grid (one line per row) or coordinate format (x,y:symbol per line). Leave empty to generate a sample map.'),
    style: z.enum(['terrain', 'building', 'grid', 'custom']).optional().describe('Map style preset (default: custom). "terrain" for outdoor maps, "building" for indoor layouts, "grid" for empty grid.'),
    title: z.string().optional().describe('Optional title for the map'),
    addBorder: z.boolean().optional().describe('Add a border around the map (default: true)'),
    borderChar: z.string().optional().describe('Character to use for border (default: █)'),
    showCoordinates: z.boolean().optional().describe('Show coordinate numbers on edges (default: false, recommended for maps < 50 width)'),
    legend: z.array(z.object({
      symbol: z.string().describe('The symbol character'),
      description: z.string().describe('What this symbol represents'),
    })).optional().describe('Legend entries to explain map symbols'),
    labels: z.array(z.object({
      x: z.number().int().describe('X coordinate'),
      y: z.number().int().describe('Y coordinate'),
      text: z.string().describe('Label text'),
    })).optional().describe('Labels for specific locations on the map'),
  }),
  execute: async ({
    width = 40,
    height = 20,
    mapData,
    style = 'custom',
    title,
    addBorder: shouldAddBorder = true,
    borderChar = '█',
    showCoordinates = false,
    legend,
    labels,
  }) => {
    try {
      console.log(`🗺️  Draw ASCII Map: Creating ${style} map (${width}x${height})...`);

      let grid: string[][];

      // Generate or parse map data
      if (mapData) {
        // User provided custom map data
        grid = parseMapData(mapData, width, height, style === 'grid' ? '·' : ' ');
      } else {
        // Generate sample based on style
        switch (style) {
          case 'terrain':
            grid = generateSampleTerrainMap(width, height);
            break;
          case 'building':
            grid = generateSampleBuildingMap(width, height);
            break;
          case 'grid':
            grid = createEmptyGrid(width, height, '·');
            break;
          default:
            grid = createEmptyGrid(width, height, ' ');
        }
      }

      // Add border if requested
      if (shouldAddBorder) {
        grid = addBorder(grid, borderChar);
      }

      // Format the final map
      const map = formatMap(grid, title, legend, labels, showCoordinates);

      console.log(`   ✨ Generated ${style} map`);

      return {
        success: true,
        map,
        width: shouldAddBorder ? width + 2 : width,
        height: shouldAddBorder ? height + 2 : height,
        style,
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
