/**
 * API Route: /api/tools
 * GET: Retrieve all tools with their metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { TOOL_METADATA, CORE_TOOLS } from '@repo/agent';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const coreOnly = searchParams.get('coreOnly') === 'true';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

    // Filter tools
    let filteredTools = [...TOOL_METADATA];

    if (coreOnly) {
      filteredTools = filteredTools.filter(tool => CORE_TOOLS.includes(tool.id));
    }

    if (category) {
      filteredTools = filteredTools.filter(tool => tool.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTools = filteredTools.filter(tool =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower) ||
        tool.keywords.some((k: string) => k.toLowerCase().includes(searchLower)) ||
        tool.tags.some((t: string) => t.toLowerCase().includes(searchLower))
      );
    }

    if (tags.length > 0) {
      filteredTools = filteredTools.filter(tool =>
        tags.some((tag: string) => tool.tags.includes(tag))
      );
    }

    // Sort: core tools first, then alphabetically
    const sortedTools = filteredTools.sort((a, b) => {
      const aIsCore = CORE_TOOLS.includes(a.id);
      const bIsCore = CORE_TOOLS.includes(b.id);

      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      return a.name.localeCompare(b.name);
    });

    // Group by category
    const toolsByCategory = sortedTools.reduce((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    }, {} as Record<string, typeof sortedTools>);

    // Get unique categories and tags
    const categories = Array.from(new Set(TOOL_METADATA.map(t => t.category))).sort();
    const allTags = Array.from(new Set(TOOL_METADATA.flatMap(t => t.tags))).sort();

    return NextResponse.json({
      success: true,
      tools: sortedTools,
      toolsByCategory,
      stats: {
        total: TOOL_METADATA.length,
        core: CORE_TOOLS.length,
        filtered: sortedTools.length,
        categories: categories.length,
      },
      categories,
      tags: allTags,
    });
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tools',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
