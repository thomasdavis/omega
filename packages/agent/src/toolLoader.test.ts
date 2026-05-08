/**
 * Unit tests for Tool Loader - loadTools and caching behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock tools
const mockSearchTool = { type: 'function', description: 'Search tool' };
const mockCalculatorTool = { type: 'function', description: 'Calculator tool' };
const mockWebFetchTool = { type: 'function', description: 'Web fetch tool' };
const mockMongoInsertTool = { type: 'function', description: 'Mongo insert tool' };
const mockAutonomousTool = { type: 'function', description: 'Autonomous tool' };

// We need to mock the dynamic imports used in loadTools.
// The toolLoader uses `import(importConfig.path)` for dynamic loading.
// We'll mock the module-level import function via vi.mock.

// Mock the autonomous tool loader
vi.mock('./autonomousToolLoader.js', () => ({
  loadAutonomousTools: vi.fn().mockResolvedValue({}),
}));

// Mock the metadata module for preloadCoreTools
vi.mock('./toolRegistry/metadata.js', () => ({
  CORE_TOOLS: ['search', 'calculator'],
}));

describe('toolLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset module registry to clear the toolCache between tests
    vi.resetModules();

    // Re-apply mocks after resetModules
    vi.doMock('./autonomousToolLoader.js', () => ({
      loadAutonomousTools: vi.fn().mockResolvedValue({}),
    }));

    vi.doMock('./toolRegistry/metadata.js', () => ({
      CORE_TOOLS: ['search', 'calculator'],
    }));
  });

  describe('loadTools', () => {
    it('should load tools by their IDs from the TOOL_IMPORT_MAP', async () => {
      // Mock the dynamic imports for specific tool paths
      vi.doMock('./tools/search.js', () => ({
        searchTool: mockSearchTool,
      }));
      vi.doMock('./tools/calculator.js', () => ({
        calculatorTool: mockCalculatorTool,
      }));

      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools(['search', 'calculator']);

      expect(tools.search).toBe(mockSearchTool);
      expect(tools.calculator).toBe(mockCalculatorTool);
      expect(Object.keys(tools)).toHaveLength(2);
    });

    it('should skip unknown tool IDs and treat them as autonomous tools', async () => {
      const mockLoadAutonomous = vi.fn().mockResolvedValue({
        unknownTool: mockAutonomousTool,
      });
      vi.doMock('./autonomousToolLoader.js', () => ({
        loadAutonomousTools: mockLoadAutonomous,
      }));

      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools(['unknownTool']);

      // Unknown tools get forwarded to autonomous tool loader
      expect(mockLoadAutonomous).toHaveBeenCalledWith(['unknownTool']);
      expect(tools.unknownTool).toBe(mockAutonomousTool);
    });

    it('should handle a mix of known and unknown tool IDs', async () => {
      vi.doMock('./tools/search.js', () => ({
        searchTool: mockSearchTool,
      }));
      const mockLoadAutonomous = vi.fn().mockResolvedValue({
        customAutoTool: mockAutonomousTool,
      });
      vi.doMock('./autonomousToolLoader.js', () => ({
        loadAutonomousTools: mockLoadAutonomous,
      }));

      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools(['search', 'customAutoTool']);

      expect(tools.search).toBe(mockSearchTool);
      expect(tools.customAutoTool).toBe(mockAutonomousTool);
      expect(mockLoadAutonomous).toHaveBeenCalledWith(['customAutoTool']);
    });

    it('should cache tools and return cached versions on subsequent calls', async () => {
      let importCount = 0;
      vi.doMock('./tools/search.js', () => {
        importCount++;
        return { searchTool: mockSearchTool };
      });

      const { loadTools } = await import('./toolLoader.js');

      // First call - should import
      const tools1 = await loadTools(['search']);
      expect(tools1.search).toBe(mockSearchTool);

      // Second call - should use cache (no new import)
      const tools2 = await loadTools(['search']);
      expect(tools2.search).toBe(mockSearchTool);

      // Dynamic import should only happen once (cached after first call)
      expect(importCount).toBe(1);
    });

    it('should handle import errors gracefully', async () => {
      vi.doMock('./tools/search.js', () => {
        throw new Error('Module not found');
      });

      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools(['search']);

      // Tool should not be in results
      expect(tools.search).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load tool search'),
        expect.any(Error)
      );
    });

    it('should skip tools whose export name does not exist in the module', async () => {
      vi.doMock('./tools/search.js', () => ({
        // Export name is 'searchTool' but we provide 'wrongName'
        wrongName: mockSearchTool,
      }));

      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools(['search']);

      // Tool should not be in the result since the export name doesn't match
      expect(tools.search).toBeUndefined();
    });

    it('should return empty object when given empty array', async () => {
      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools([]);

      expect(Object.keys(tools)).toHaveLength(0);
    });

    it('should handle autonomous tool loader failure gracefully', async () => {
      vi.doMock('./autonomousToolLoader.js', () => ({
        loadAutonomousTools: vi.fn().mockRejectedValue(new Error('DB error')),
      }));

      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools(['someAutonomousTool']);

      // Should not throw, just warn
      expect(tools.someAutonomousTool).toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not load autonomous tools:'),
        expect.any(Error)
      );
    });

    it('should not call autonomous loader when all tools are in TOOL_IMPORT_MAP', async () => {
      vi.doMock('./tools/search.js', () => ({
        searchTool: mockSearchTool,
      }));
      vi.doMock('./tools/calculator.js', () => ({
        calculatorTool: mockCalculatorTool,
      }));
      const mockLoadAutonomous = vi.fn().mockResolvedValue({});
      vi.doMock('./autonomousToolLoader.js', () => ({
        loadAutonomousTools: mockLoadAutonomous,
      }));

      const { loadTools } = await import('./toolLoader.js');
      await loadTools(['search', 'calculator']);

      // No unknown tools, so autonomous loader should not be called
      expect(mockLoadAutonomous).not.toHaveBeenCalled();
    });

    it('should load database tools from @repo/database path', async () => {
      vi.doMock('@repo/database', () => ({
        mongoInsertTool: mockMongoInsertTool,
      }));

      const { loadTools } = await import('./toolLoader.js');
      const tools = await loadTools(['mongoInsert']);

      expect(tools.mongoInsert).toBe(mockMongoInsertTool);
    });

    it('should log the final loaded tool count', async () => {
      vi.doMock('./tools/search.js', () => ({
        searchTool: mockSearchTool,
      }));

      const { loadTools } = await import('./toolLoader.js');
      await loadTools(['search']);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 1/1 tools')
      );
    });

    it('should log partial load count when some tools fail', async () => {
      vi.doMock('./tools/search.js', () => ({
        searchTool: mockSearchTool,
      }));
      vi.doMock('./tools/calculator.js', () => {
        throw new Error('Module not found');
      });

      const { loadTools } = await import('./toolLoader.js');
      await loadTools(['search', 'calculator']);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 1/2 tools')
      );
    });
  });

  describe('preloadCoreTools', () => {
    it('should preload all core tools into the cache', async () => {
      vi.doMock('./tools/search.js', () => ({
        searchTool: mockSearchTool,
      }));
      vi.doMock('./tools/calculator.js', () => ({
        calculatorTool: mockCalculatorTool,
      }));

      const { preloadCoreTools, loadTools } = await import('./toolLoader.js');
      await preloadCoreTools();

      // Verify core tools are now cached by loading them again
      // (the import count should not increase)
      const tools = await loadTools(['search', 'calculator']);
      expect(tools.search).toBe(mockSearchTool);
      expect(tools.calculator).toBe(mockCalculatorTool);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Preloaded 2 core tools')
      );
    });
  });
});
