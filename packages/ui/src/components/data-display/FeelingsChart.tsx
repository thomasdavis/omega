/**
 * FeelingsChart Component
 * Displays user feelings data in a simple chart format
 */

import React from 'react';

export interface FeelingEntry {
  id: string;
  feelingType: string;
  intensity?: number;
  valence?: string;
  notes?: string;
  timestamp: number;
}

export interface FeelingsChartProps {
  feelings: FeelingEntry[];
  className?: string;
}

/**
 * Simple ASCII-style chart component for feelings visualization
 */
export const FeelingsChart: React.FC<FeelingsChartProps> = ({ feelings, className = '' }) => {
  if (!feelings || feelings.length === 0) {
    return (
      <div className={`p-4 border border-gray-200 rounded ${className}`}>
        <p className="text-gray-500">No feelings data available</p>
      </div>
    );
  }

  // Group feelings by type
  const feelingCounts: Record<string, number> = {};
  feelings.forEach(feeling => {
    feelingCounts[feeling.feelingType] = (feelingCounts[feeling.feelingType] || 0) + 1;
  });

  // Sort by count
  const sortedFeelings = Object.entries(feelingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10

  const maxCount = Math.max(...sortedFeelings.map(([, count]) => count));

  return (
    <div className={`p-4 border border-gray-200 rounded ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Feelings Distribution</h3>
      <div className="space-y-2">
        {sortedFeelings.map(([type, count]) => {
          const percentage = (count / maxCount) * 100;
          return (
            <div key={type} className="flex items-center gap-2">
              <span className="w-24 text-sm text-gray-700 capitalize">{type}</span>
              <div className="flex-1 bg-gray-100 rounded h-6 relative overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs text-gray-700">
                  {count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm text-gray-500">
        Total entries: {feelings.length}
      </div>
    </div>
  );
};
