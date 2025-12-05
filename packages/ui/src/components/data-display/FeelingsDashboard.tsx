/**
 * FeelingsDashboard Component
 * Complete dashboard for user feelings visualization and analytics
 */

import React from 'react';
import { FeelingsChart, FeelingEntry } from './FeelingsChart.js';
import { FeelingsTimeline } from './FeelingsTimeline.js';

export interface FeelingsAnalytics {
  totalEntries: number;
  mostCommonFeelings?: Array<{ type: string; count: number; percentage: number }>;
  valenceCounts?: Record<string, number>;
  overallAverageIntensity?: number;
  averageIntensityByType?: Record<string, number>;
  insights?: {
    dominantValence: string;
    mostFrequentFeeling: string;
    entriesPerDay: number;
  };
  timeRange?: {
    start: number;
    end: number;
    daysCovered: number;
  };
}

export interface FeelingsDashboardProps {
  feelings: FeelingEntry[];
  analytics?: FeelingsAnalytics;
  className?: string;
}

/**
 * Comprehensive feelings dashboard with charts and timeline
 */
export const FeelingsDashboard: React.FC<FeelingsDashboardProps> = ({
  feelings,
  analytics,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Analytics Summary */}
      {analytics && analytics.insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded bg-gradient-to-br from-blue-50 to-white">
            <div className="text-sm text-gray-600">Total Entries</div>
            <div className="text-2xl font-bold text-gray-900">{analytics.totalEntries}</div>
          </div>
          <div className="p-4 border border-gray-200 rounded bg-gradient-to-br from-green-50 to-white">
            <div className="text-sm text-gray-600">Most Frequent</div>
            <div className="text-2xl font-bold text-gray-900 capitalize">
              {analytics.insights.mostFrequentFeeling}
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded bg-gradient-to-br from-purple-50 to-white">
            <div className="text-sm text-gray-600">Avg Intensity</div>
            <div className="text-2xl font-bold text-gray-900">
              {analytics.overallAverageIntensity?.toFixed(1) || 'N/A'}/10
            </div>
          </div>
        </div>
      )}

      {/* Charts and Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FeelingsChart feelings={feelings} />
        <FeelingsTimeline feelings={feelings} />
      </div>

      {/* Valence Distribution */}
      {analytics && analytics.valenceCounts && Object.keys(analytics.valenceCounts).length > 0 && (
        <div className="p-4 border border-gray-200 rounded">
          <h3 className="text-lg font-semibold mb-3">Emotional Valence</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(analytics.valenceCounts).map(([valence, count]) => {
              const percentage = analytics.totalEntries > 0
                ? ((count / analytics.totalEntries) * 100).toFixed(1)
                : '0';

              const colors: Record<string, string> = {
                positive: 'bg-green-100 border-green-300 text-green-800',
                negative: 'bg-red-100 border-red-300 text-red-800',
                neutral: 'bg-gray-100 border-gray-300 text-gray-800',
                mixed: 'bg-yellow-100 border-yellow-300 text-yellow-800',
              };

              return (
                <div
                  key={valence}
                  className={`p-3 border rounded ${colors[valence] || 'bg-blue-100 border-blue-300 text-blue-800'}`}
                >
                  <div className="text-sm font-medium capitalize">{valence}</div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs opacity-75">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
