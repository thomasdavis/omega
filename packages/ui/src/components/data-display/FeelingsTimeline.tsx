/**
 * FeelingsTimeline Component
 * Displays user feelings in a chronological timeline
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

export interface FeelingsTimelineProps {
  feelings: FeelingEntry[];
  className?: string;
}

const getValenceColor = (valence?: string): string => {
  switch (valence) {
    case 'positive':
      return 'bg-green-100 border-green-300 text-green-800';
    case 'negative':
      return 'bg-red-100 border-red-300 text-red-800';
    case 'neutral':
      return 'bg-gray-100 border-gray-300 text-gray-800';
    case 'mixed':
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    default:
      return 'bg-blue-100 border-blue-300 text-blue-800';
  }
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Timeline component for feelings visualization
 */
export const FeelingsTimeline: React.FC<FeelingsTimelineProps> = ({ feelings, className = '' }) => {
  if (!feelings || feelings.length === 0) {
    return (
      <div className={`p-4 border border-gray-200 rounded ${className}`}>
        <p className="text-gray-500">No feelings data available</p>
      </div>
    );
  }

  // Sort by timestamp descending (most recent first)
  const sortedFeelings = [...feelings].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className={`p-4 border border-gray-200 rounded ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Feelings Timeline</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedFeelings.map((feeling) => (
          <div
            key={feeling.id}
            className={`p-3 border rounded-md ${getValenceColor(feeling.valence)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold capitalize">{feeling.feelingType}</span>
                  {feeling.intensity && (
                    <span className="text-xs px-2 py-0.5 bg-white bg-opacity-50 rounded">
                      Intensity: {feeling.intensity}/10
                    </span>
                  )}
                </div>
                {feeling.notes && (
                  <p className="text-sm mt-1 opacity-90">{feeling.notes}</p>
                )}
              </div>
              <span className="text-xs opacity-75 whitespace-nowrap ml-2">
                {formatTimestamp(feeling.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
