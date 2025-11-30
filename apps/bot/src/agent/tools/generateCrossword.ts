/**
 * Generate Crossword Tool - Creates printable ASCII crossword puzzles with themes
 *
 * Features:
 * - AI-generated themed crossword puzzles
 * - ASCII art output suitable for printing
 * - Support for various themes (general, tech, science, pop culture, etc.)
 * - Automatic word placement using crossword generation algorithm
 * - Clues for across and down words
 * - Multiple difficulty levels
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OMEGA_MODEL } from '../../config/models.js';

// Available crossword themes
const CROSSWORD_THEMES = [
  'general',
  'technology',
  'science',
  'movies',
  'music',
  'sports',
  'history',
  'geography',
  'literature',
  'food',
  'nature',
  'custom',
] as const;

type CrosswordTheme = typeof CROSSWORD_THEMES[number];

// Difficulty levels
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

interface WordEntry {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

interface CrosswordGrid {
  grid: string[][];
  words: WordEntry[];
  width: number;
  height: number;
}

/**
 * Generate themed words and clues using AI
 */
async function generateThemedWords(
  theme: CrosswordTheme,
  difficulty: DifficultyLevel,
  customTheme?: string
): Promise<Array<{ word: string; clue: string }>> {
  const themeGuidance: Record<CrosswordTheme, string> = {
    general: 'General knowledge words covering everyday topics, common objects, activities, and concepts',
    technology: 'Technology and computing terms including programming, software, hardware, internet, and digital concepts',
    science: 'Scientific terms including physics, chemistry, biology, astronomy, and general scientific concepts',
    movies: 'Movie titles, actors, directors, film terminology, and cinema-related terms',
    music: 'Musical terms, instruments, genres, artists, songs, and music theory concepts',
    sports: 'Sports terminology, athletes, teams, equipment, and athletic concepts',
    history: 'Historical events, figures, periods, civilizations, and significant dates',
    geography: 'Countries, cities, landmarks, geographical features, and world locations',
    literature: 'Authors, book titles, literary terms, characters, and literary movements',
    food: 'Cuisine, ingredients, cooking methods, dishes, and culinary terms',
    nature: 'Plants, animals, ecosystems, natural phenomena, and environmental terms',
    custom: customTheme || 'General knowledge',
  };

  const difficultyGuidance: Record<DifficultyLevel, string> = {
    easy: 'Use common, well-known words (3-6 letters). Make clues straightforward and direct.',
    medium: 'Use moderately challenging words (4-8 letters). Make clues require some thought but not too obscure.',
    hard: 'Use challenging, less common words (5-10 letters). Make clues cryptic or require deeper knowledge.',
  };

  const wordCount = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;

  const prompt = `Generate ${wordCount} words for a crossword puzzle with these requirements:

Theme: ${themeGuidance[theme]}
Difficulty: ${difficultyGuidance[difficulty]}

Requirements:
- Generate exactly ${wordCount} words
- Words should be ${difficulty === 'easy' ? '3-6' : difficulty === 'medium' ? '4-8' : '5-10'} letters long
- Each word must have a clear, appropriate clue
- Words should relate to the theme: ${theme === 'custom' ? customTheme : theme}
- Avoid proper nouns unless the theme specifically calls for them (like movies, music, history)
- Choose words that can intersect well in a crossword (variety of letters)
- Make sure words are suitable for a family-friendly crossword

Respond in JSON format:
{
  "words": [
    { "word": "WORD1", "clue": "Clue for word 1" },
    { "word": "WORD2", "clue": "Clue for word 2" },
    ...
  ]
}

Important: All words must be UPPERCASE and contain only letters A-Z.`;

  try {
    const result = await generateText({
      model: openai(OMEGA_MODEL),
      prompt,
    });

    const parsed = JSON.parse(result.text.trim());
    return parsed.words.map((w: any) => ({
      word: w.word.toUpperCase().replace(/[^A-Z]/g, ''),
      clue: w.clue,
    }));
  } catch (error) {
    console.error('Error generating themed words:', error);
    // Fallback words
    return [
      { word: 'CODE', clue: 'Instructions for computers' },
      { word: 'DATA', clue: 'Information processed by systems' },
      { word: 'BYTE', clue: 'Eight bits' },
      { word: 'LOOP', clue: 'Repeated execution' },
      { word: 'ARRAY', clue: 'Ordered collection' },
      { word: 'DEBUG', clue: 'Fix errors in code' },
      { word: 'PIXEL', clue: 'Smallest image element' },
      { word: 'CACHE', clue: 'Fast memory storage' },
    ];
  }
}

/**
 * Try to place a word on the grid
 */
function tryPlaceWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
): boolean {
  const height = grid.length;
  const width = grid[0].length;

  // Check if word fits
  if (direction === 'across') {
    if (col + word.length > width) return false;
  } else {
    if (row + word.length > height) return false;
  }

  // Check each position
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    const currentCell = grid[r][c];

    if (currentCell !== ' ' && currentCell !== word[i]) {
      return false; // Conflict
    }
  }

  // Check boundaries (no adjacent words)
  if (direction === 'across') {
    // Check before and after
    if (col > 0 && grid[row][col - 1] !== ' ') return false;
    if (col + word.length < width && grid[row][col + word.length] !== ' ') return false;
  } else {
    // Check above and below
    if (row > 0 && grid[row - 1][col] !== ' ') return false;
    if (row + word.length < height && grid[row + word.length][col] !== ' ') return false;
  }

  // Place the word
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    grid[r][c] = word[i];
  }

  return true;
}

/**
 * Find intersection points for a word
 */
function findIntersections(
  grid: string[][],
  word: string,
  direction: 'across' | 'down'
): Array<{ row: number; col: number; letterIndex: number }> {
  const intersections: Array<{ row: number; col: number; letterIndex: number }> = [];
  const height = grid.length;
  const width = grid[0].length;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = grid[r][c];
      if (cell === ' ') continue;

      // Find if this cell's letter exists in our word
      for (let i = 0; i < word.length; i++) {
        if (word[i] === cell) {
          // Check if we can place the word here
          const startRow = direction === 'across' ? r : r - i;
          const startCol = direction === 'across' ? c - i : c;

          if (startRow >= 0 && startCol >= 0) {
            intersections.push({
              row: startRow,
              col: startCol,
              letterIndex: i,
            });
          }
        }
      }
    }
  }

  return intersections;
}

/**
 * Generate crossword grid from words
 */
function generateCrosswordGrid(
  words: Array<{ word: string; clue: string }>,
  maxAttempts = 100
): CrosswordGrid {
  const gridSize = 15; // 15x15 grid
  let bestGrid: CrosswordGrid | null = null;
  let maxWordsPlaced = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid: string[][] = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(' '));

    const placedWords: WordEntry[] = [];
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);

    // Place first word in the middle
    if (shuffledWords.length > 0) {
      const firstWord = shuffledWords[0];
      const startCol = Math.floor((gridSize - firstWord.word.length) / 2);
      const startRow = Math.floor(gridSize / 2);

      if (tryPlaceWord(grid, firstWord.word, startRow, startCol, 'across')) {
        placedWords.push({
          word: firstWord.word,
          clue: firstWord.clue,
          row: startRow,
          col: startCol,
          direction: 'across',
          number: 1,
        });
      }
    }

    // Try to place remaining words
    for (let i = 1; i < shuffledWords.length; i++) {
      const wordData = shuffledWords[i];
      const word = wordData.word;
      let placed = false;

      // Try both directions
      for (const direction of ['across', 'down'] as const) {
        if (placed) break;

        const intersections = findIntersections(grid, word, direction);

        // Try each intersection point
        for (const intersection of intersections) {
          if (tryPlaceWord(grid, word, intersection.row, intersection.col, direction)) {
            placedWords.push({
              word,
              clue: wordData.clue,
              row: intersection.row,
              col: intersection.col,
              direction,
              number: placedWords.length + 1,
            });
            placed = true;
            break;
          }
        }
      }
    }

    // Keep the best attempt
    if (placedWords.length > maxWordsPlaced) {
      maxWordsPlaced = placedWords.length;

      // Find actual bounds of the grid
      let minRow = gridSize,
        maxRow = -1,
        minCol = gridSize,
        maxCol = -1;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (grid[r][c] !== ' ') {
            minRow = Math.min(minRow, r);
            maxRow = Math.max(maxRow, r);
            minCol = Math.min(minCol, c);
            maxCol = Math.max(maxCol, c);
          }
        }
      }

      // Crop grid to actual size with padding
      const padding = 1;
      minRow = Math.max(0, minRow - padding);
      maxRow = Math.min(gridSize - 1, maxRow + padding);
      minCol = Math.max(0, minCol - padding);
      maxCol = Math.min(gridSize - 1, maxCol + padding);

      const croppedGrid = grid
        .slice(minRow, maxRow + 1)
        .map(row => row.slice(minCol, maxCol + 1));

      // Adjust word positions
      const adjustedWords = placedWords.map(w => ({
        ...w,
        row: w.row - minRow,
        col: w.col - minCol,
      }));

      bestGrid = {
        grid: croppedGrid,
        words: adjustedWords,
        width: maxCol - minCol + 1,
        height: maxRow - minRow + 1,
      };
    }

    // If we placed all words, we're done
    if (placedWords.length === words.length) {
      break;
    }
  }

  if (!bestGrid) {
    // Return empty grid if nothing was placed
    return {
      grid: [[' ']],
      words: [],
      width: 1,
      height: 1,
    };
  }

  return bestGrid;
}

/**
 * Renumber crossword entries in reading order
 */
function renumberCrossword(crosswordGrid: CrosswordGrid): CrosswordGrid {
  const { grid, words, width, height } = crosswordGrid;

  // Create a map of starting positions
  const startPositions: Array<{ row: number; col: number; words: WordEntry[] }> = [];

  for (const word of words) {
    const existing = startPositions.find(
      sp => sp.row === word.row && sp.col === word.col
    );
    if (existing) {
      existing.words.push(word);
    } else {
      startPositions.push({ row: word.row, col: word.col, words: [word] });
    }
  }

  // Sort by row, then column (reading order)
  startPositions.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  // Assign numbers
  let currentNumber = 1;
  const renumberedWords: WordEntry[] = [];

  for (const position of startPositions) {
    for (const word of position.words) {
      renumberedWords.push({
        ...word,
        number: currentNumber,
      });
    }
    currentNumber++;
  }

  return {
    grid,
    words: renumberedWords,
    width,
    height,
  };
}

/**
 * Format crossword as ASCII art
 */
function formatCrossword(crosswordGrid: CrosswordGrid): string {
  const { grid, words, width, height } = crosswordGrid;
  const lines: string[] = [];

  // Create number grid
  const numberGrid: Array<Array<number | null>> = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));

  for (const word of words) {
    if (numberGrid[word.row][word.col] === null) {
      numberGrid[word.row][word.col] = word.number;
    }
  }

  // Build the puzzle grid
  lines.push('');
  lines.push('CROSSWORD PUZZLE');
  lines.push('═'.repeat(width * 4 + 1));

  for (let r = 0; r < height; r++) {
    let rowStr = '║';
    for (let c = 0; c < width; c++) {
      const cell = grid[r][c];
      const num = numberGrid[r][c];

      if (cell === ' ') {
        rowStr += '███║';
      } else {
        const numStr = num !== null ? num.toString().padStart(2, ' ') : '  ';
        rowStr += ` ${numStr.charAt(0) === ' ' ? ' ' : numStr.charAt(0)}${numStr.charAt(1) === ' ' ? ' ' : numStr.charAt(1)}║`;
      }
    }
    lines.push(rowStr);
  }

  lines.push('═'.repeat(width * 4 + 1));
  lines.push('');

  // Add clues
  const acrossWords = words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number);
  const downWords = words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number);

  if (acrossWords.length > 0) {
    lines.push('ACROSS:');
    for (const word of acrossWords) {
      lines.push(`${word.number}. ${word.clue}`);
    }
    lines.push('');
  }

  if (downWords.length > 0) {
    lines.push('DOWN:');
    for (const word of downWords) {
      lines.push(`${word.number}. ${word.clue}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format solution grid
 */
function formatSolution(crosswordGrid: CrosswordGrid): string {
  const { grid, width, height } = crosswordGrid;
  const lines: string[] = [];

  lines.push('');
  lines.push('SOLUTION');
  lines.push('═'.repeat(width * 4 + 1));

  for (let r = 0; r < height; r++) {
    let rowStr = '║';
    for (let c = 0; c < width; c++) {
      const cell = grid[r][c];
      if (cell === ' ') {
        rowStr += '███║';
      } else {
        rowStr += ` ${cell} ║`;
      }
    }
    lines.push(rowStr);
  }

  lines.push('═'.repeat(width * 4 + 1));
  lines.push('');

  return lines.join('\n');
}

export const generateCrosswordTool = tool({
  description: 'Generate printable ASCII crossword puzzles with themed words and clues. Creates puzzles in plain ASCII format suitable for printing and display in text environments. Supports multiple themes (technology, science, movies, music, sports, history, geography, literature, food, nature) and difficulty levels (easy, medium, hard). Perfect for text-based games, puzzles, newsletters, or educational use.',
  inputSchema: z.object({
    theme: z.enum(['general', 'technology', 'science', 'movies', 'music', 'sports', 'history', 'geography', 'literature', 'food', 'nature', 'custom']).optional().describe('Crossword theme (default: general). Determines the type of words and clues used in the puzzle.'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Difficulty level (default: medium). Affects word length and clue complexity.'),
    customTheme: z.string().optional().describe('Custom theme description (only used when theme is "custom"). Describe what kind of words you want in the puzzle.'),
    includeSolution: z.boolean().optional().describe('Include the solution grid after the puzzle (default: true).'),
  }),
  execute: async ({ theme = 'general', difficulty = 'medium', customTheme, includeSolution = true }) => {
    try {
      console.log(`🧩 Generate Crossword: Creating ${difficulty} puzzle with theme "${theme}"...`);

      // Generate themed words
      const words = await generateThemedWords(theme, difficulty, customTheme);
      console.log(`   📝 Generated ${words.length} themed words`);

      // Generate crossword grid
      const crosswordGrid = generateCrosswordGrid(words);
      const renumbered = renumberCrossword(crosswordGrid);
      console.log(`   🎯 Placed ${renumbered.words.length} words on grid`);

      // Format output
      const puzzle = formatCrossword(renumbered);
      const solution = includeSolution ? formatSolution(renumbered) : '';

      const fullOutput = includeSolution ? `${puzzle}\n${solution}` : puzzle;

      console.log(`   ✨ Crossword generated successfully`);

      return {
        success: true,
        theme: theme === 'custom' ? customTheme || 'custom' : theme,
        difficulty,
        wordsPlaced: renumbered.words.length,
        totalWords: words.length,
        gridSize: `${renumbered.width}x${renumbered.height}`,
        puzzle,
        solution: includeSolution ? solution : null,
        output: fullOutput,
      };
    } catch (error) {
      console.error('Error generating crossword:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate crossword',
      };
    }
  },
});
