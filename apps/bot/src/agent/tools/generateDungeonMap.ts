/**
 * Generate Dungeon Map Tool - Creates ASCII dungeon maps for tabletop RPGs
 *
 * Features:
 * - Procedurally generated dungeon layouts
 * - Configurable map size and complexity
 * - Rooms, corridors, doors, traps, and treasures
 * - ASCII art output suitable for printing or display
 * - Perfect for D&D, roguelikes, and game development
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
  EMPTY: ' ',
} as const;

// Difficulty levels affect room density and corridor complexity
const DIFFICULTY_LEVELS = ['simple', 'normal', 'complex'] as const;
type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if two rooms overlap
 */
function roomsOverlap(room1: Room, room2: Room): boolean {
  return !(
    room1.x + room1.width < room2.x ||
    room2.x + room2.width < room1.x ||
    room1.y + room1.height < room2.y ||
    room2.y + room2.height < room1.y
  );
}

/**
 * Get the center point of a room
 */
function getRoomCenter(room: Room): Point {
  return {
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  };
}

/**
 * Create a horizontal corridor
 */
function createHorizontalCorridor(grid: string[][], x1: number, x2: number, y: number): void {
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);

  for (let x = startX; x <= endX; x++) {
    if (grid[y] && grid[y][x] === SYMBOLS.EMPTY) {
      grid[y][x] = SYMBOLS.FLOOR;
    }
  }
}

/**
 * Create a vertical corridor
 */
function createVerticalCorridor(grid: string[][], y1: number, y2: number, x: number): void {
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);

  for (let y = startY; y <= endY; y++) {
    if (grid[y] && grid[y][x] === SYMBOLS.EMPTY) {
      grid[y][x] = SYMBOLS.FLOOR;
    }
  }
}

/**
 * Connect two rooms with an L-shaped corridor
 */
function connectRooms(grid: string[][], room1: Room, room2: Room): void {
  const center1 = getRoomCenter(room1);
  const center2 = getRoomCenter(room2);

  // Randomly choose to go horizontal-then-vertical or vertical-then-horizontal
  if (Math.random() < 0.5) {
    createHorizontalCorridor(grid, center1.x, center2.x, center1.y);
    createVerticalCorridor(grid, center1.y, center2.y, center2.x);
  } else {
    createVerticalCorridor(grid, center1.y, center2.y, center1.x);
    createHorizontalCorridor(grid, center1.x, center2.x, center2.y);
  }
}

/**
 * Place walls around floors and corridors
 */
function placeWalls(grid: string[][], height: number, width: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === SYMBOLS.FLOOR) {
        // Check all 8 directions for empty spaces
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              if (grid[ny][nx] === SYMBOLS.EMPTY) {
                grid[ny][nx] = SYMBOLS.WALL;
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Place doors at room entrances
 */
function placeDoors(grid: string[][], rooms: Room[], height: number, width: number): void {
  for (const room of rooms) {
    // Check all walls of the room
    // Top and bottom walls
    for (let x = room.x; x < room.x + room.width; x++) {
      // Top wall
      const topY = room.y - 1;
      if (topY >= 0 && grid[topY][x] === SYMBOLS.WALL) {
        // Check if there's a corridor adjacent
        if (topY > 0 && grid[topY - 1][x] === SYMBOLS.FLOOR) {
          grid[topY][x] = SYMBOLS.DOOR;
        }
      }

      // Bottom wall
      const bottomY = room.y + room.height;
      if (bottomY < height && grid[bottomY][x] === SYMBOLS.WALL) {
        // Check if there's a corridor adjacent
        if (bottomY < height - 1 && grid[bottomY + 1][x] === SYMBOLS.FLOOR) {
          grid[bottomY][x] = SYMBOLS.DOOR;
        }
      }
    }

    // Left and right walls
    for (let y = room.y; y < room.y + room.height; y++) {
      // Left wall
      const leftX = room.x - 1;
      if (leftX >= 0 && grid[y][leftX] === SYMBOLS.WALL) {
        // Check if there's a corridor adjacent
        if (leftX > 0 && grid[y][leftX - 1] === SYMBOLS.FLOOR) {
          grid[y][leftX] = SYMBOLS.DOOR;
        }
      }

      // Right wall
      const rightX = room.x + room.width;
      if (rightX < width && grid[y][rightX] === SYMBOLS.WALL) {
        // Check if there's a corridor adjacent
        if (rightX < width - 1 && grid[y][rightX + 1] === SYMBOLS.FLOOR) {
          grid[y][rightX] = SYMBOLS.DOOR;
        }
      }
    }
  }
}

/**
 * Place special features (traps and treasures)
 */
function placeFeatures(grid: string[][], rooms: Room[], trapCount: number, treasureCount: number): void {
  const floorTiles: Point[] = [];

  // Collect all floor tiles in rooms
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (grid[y][x] === SYMBOLS.FLOOR) {
          floorTiles.push({ x, y });
        }
      }
    }
  }

  // Shuffle floor tiles
  for (let i = floorTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [floorTiles[i], floorTiles[j]] = [floorTiles[j], floorTiles[i]];
  }

  // Place traps
  for (let i = 0; i < Math.min(trapCount, floorTiles.length); i++) {
    const tile = floorTiles[i];
    grid[tile.y][tile.x] = SYMBOLS.TRAP;
  }

  // Place treasures
  for (let i = trapCount; i < Math.min(trapCount + treasureCount, floorTiles.length); i++) {
    const tile = floorTiles[i];
    grid[tile.y][tile.x] = SYMBOLS.TREASURE;
  }
}

/**
 * Place stairs
 */
function placeStairs(grid: string[][], rooms: Room[], includeStairs: boolean): void {
  if (!includeStairs || rooms.length < 2) {
    return;
  }

  // Place stairs up in the first room
  const firstRoom = rooms[0];
  const upPoint = getRoomCenter(firstRoom);
  if (grid[upPoint.y][upPoint.x] === SYMBOLS.FLOOR) {
    grid[upPoint.y][upPoint.x] = SYMBOLS.STAIRS_UP;
  }

  // Place stairs down in the last room
  const lastRoom = rooms[rooms.length - 1];
  const downPoint = getRoomCenter(lastRoom);
  if (grid[downPoint.y][downPoint.x] === SYMBOLS.FLOOR) {
    grid[downPoint.y][downPoint.x] = SYMBOLS.STAIRS_DOWN;
  }
}

/**
 * Generate a dungeon map
 */
function generateDungeon(
  width: number,
  height: number,
  difficulty: DifficultyLevel,
  includeTraps: boolean,
  includeTreasure: boolean,
  includeStairs: boolean
): { grid: string[][]; rooms: Room[]; stats: { rooms: number; traps: number; treasures: number } } {
  // Initialize grid with empty spaces
  const grid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(SYMBOLS.EMPTY));

  const rooms: Room[] = [];

  // Determine number of rooms based on difficulty
  const roomCounts = {
    simple: { min: 4, max: 6 },
    normal: { min: 6, max: 10 },
    complex: { min: 10, max: 15 },
  };

  const { min, max } = roomCounts[difficulty];
  const targetRoomCount = randomInt(min, max);

  // Room size ranges based on difficulty
  const roomSizes = {
    simple: { minWidth: 4, maxWidth: 8, minHeight: 3, maxHeight: 6 },
    normal: { minWidth: 3, maxWidth: 7, minHeight: 3, maxHeight: 6 },
    complex: { minWidth: 3, maxWidth: 6, minHeight: 3, maxHeight: 5 },
  };

  const sizes = roomSizes[difficulty];

  // Try to place rooms
  let attempts = 0;
  const maxAttempts = targetRoomCount * 50;

  while (rooms.length < targetRoomCount && attempts < maxAttempts) {
    attempts++;

    const roomWidth = randomInt(sizes.minWidth, sizes.maxWidth);
    const roomHeight = randomInt(sizes.minHeight, sizes.maxHeight);
    const roomX = randomInt(1, width - roomWidth - 1);
    const roomY = randomInt(1, height - roomHeight - 1);

    const newRoom: Room = {
      x: roomX,
      y: roomY,
      width: roomWidth,
      height: roomHeight,
    };

    // Check for overlaps with existing rooms (with padding)
    const paddedRoom: Room = {
      x: newRoom.x - 1,
      y: newRoom.y - 1,
      width: newRoom.width + 2,
      height: newRoom.height + 2,
    };

    let overlaps = false;
    for (const existingRoom of rooms) {
      if (roomsOverlap(paddedRoom, existingRoom)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);

      // Carve out the room
      for (let y = roomY; y < roomY + roomHeight; y++) {
        for (let x = roomX; x < roomX + roomWidth; x++) {
          grid[y][x] = SYMBOLS.FLOOR;
        }
      }

      // Connect to previous room
      if (rooms.length > 1) {
        connectRooms(grid, rooms[rooms.length - 2], rooms[rooms.length - 1]);
      }
    }
  }

  // Place walls
  placeWalls(grid, height, width);

  // Place doors
  placeDoors(grid, rooms, height, width);

  // Calculate feature counts based on difficulty
  const featureCounts = {
    simple: { traps: randomInt(1, 2), treasures: randomInt(2, 3) },
    normal: { traps: randomInt(2, 4), treasures: randomInt(3, 5) },
    complex: { traps: randomInt(4, 7), treasures: randomInt(4, 6) },
  };

  const features = featureCounts[difficulty];
  const trapCount = includeTraps ? features.traps : 0;
  const treasureCount = includeTreasure ? features.treasures : 0;

  // Place features
  placeFeatures(grid, rooms, trapCount, treasureCount);

  // Place stairs
  placeStairs(grid, rooms, includeStairs);

  return {
    grid,
    rooms,
    stats: {
      rooms: rooms.length,
      traps: trapCount,
      treasures: treasureCount,
    },
  };
}

/**
 * Format the dungeon map as ASCII art
 */
function formatDungeonMap(
  grid: string[][],
  stats: { rooms: number; traps: number; treasures: number },
  showLegend: boolean
): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═'.repeat(grid[0].length + 2));

  for (const row of grid) {
    lines.push('║' + row.join('') + '║');
  }

  lines.push('═'.repeat(grid[0].length + 2));

  if (showLegend) {
    lines.push('');
    lines.push('LEGEND:');
    lines.push(`  ${SYMBOLS.WALL} = Wall`);
    lines.push(`  ${SYMBOLS.FLOOR} = Floor`);
    lines.push(`  ${SYMBOLS.DOOR} = Door`);
    if (stats.traps > 0) {
      lines.push(`  ${SYMBOLS.TRAP} = Trap`);
    }
    if (stats.treasures > 0) {
      lines.push(`  ${SYMBOLS.TREASURE} = Treasure`);
    }
    lines.push(`  ${SYMBOLS.STAIRS_UP} = Stairs Up`);
    lines.push(`  ${SYMBOLS.STAIRS_DOWN} = Stairs Down`);
    lines.push('');
    lines.push('STATS:');
    lines.push(`  Rooms: ${stats.rooms}`);
    if (stats.traps > 0) {
      lines.push(`  Traps: ${stats.traps}`);
    }
    if (stats.treasures > 0) {
      lines.push(`  Treasures: ${stats.treasures}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

export const generateDungeonMapTool = tool({
  description: 'Generate ASCII dungeon maps for tabletop RPGs, roguelike games, or text-based adventures. Creates procedurally generated dungeons with rooms, corridors, doors, traps, treasures, and stairs. Perfect for D&D sessions, game development, or creative visualization. Supports multiple difficulty levels and customization options.',
  inputSchema: z.object({
    width: z.number().int().min(20).max(80).optional().describe('Map width in characters (default: 50). Larger maps have more space for rooms and corridors.'),
    height: z.number().int().min(15).max(40).optional().describe('Map height in characters (default: 30). Larger maps can accommodate more rooms.'),
    difficulty: z.enum(['simple', 'normal', 'complex']).optional().describe('Dungeon complexity (default: normal). Simple has fewer, larger rooms. Complex has many smaller rooms and intricate corridors.'),
    includeTraps: z.boolean().optional().describe('Include traps in the dungeon (default: true). Traps are marked with ^ symbol.'),
    includeTreasure: z.boolean().optional().describe('Include treasure in the dungeon (default: true). Treasures are marked with $ symbol.'),
    includeStairs: z.boolean().optional().describe('Include stairs up (<) and down (>) for multi-level dungeons (default: true).'),
    showLegend: z.boolean().optional().describe('Show legend and statistics (default: true). Explains what each symbol means.'),
  }),
  execute: async ({
    width = 50,
    height = 30,
    difficulty = 'normal',
    includeTraps = true,
    includeTreasure = true,
    includeStairs = true,
    showLegend = true,
  }) => {
    try {
      console.log(`🏰 Generate Dungeon Map: Creating ${difficulty} dungeon (${width}x${height})...`);

      const dungeon = generateDungeon(
        width,
        height,
        difficulty,
        includeTraps,
        includeTreasure,
        includeStairs
      );

      const map = formatDungeonMap(dungeon.grid, dungeon.stats, showLegend);

      console.log(`   ✨ Generated dungeon with ${dungeon.stats.rooms} rooms`);

      return {
        success: true,
        map,
        width,
        height,
        difficulty,
        stats: dungeon.stats,
      };
    } catch (error) {
      console.error('Error generating dungeon map:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate dungeon map',
      };
    }
  },
});
