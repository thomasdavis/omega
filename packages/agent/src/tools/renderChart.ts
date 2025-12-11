/**
 * Chart Rendering Tool - Generate and render charts/graphs as images for Discord
 * Uses QuickChart.io API to generate professional chart images
 */

import { tool } from 'ai';
import { z } from 'zod';
import { saveGeneratedImage } from '@repo/database';

// QuickChart.io API endpoint
const QUICKCHART_API = 'https://quickchart.io/chart';

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  fill?: boolean;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Generate a chart URL using QuickChart.io
 */
function generateChartUrl(
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area',
  data: ChartData,
  options: {
    title?: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
  }
): string {
  const { title, width = 800, height = 600, backgroundColor = 'white' } = options;

  // Map 'area' to 'line' with fill enabled
  const chartType = type === 'area' ? 'line' : type;

  // For area charts, enable fill on datasets
  if (type === 'area') {
    data.datasets = data.datasets.map(dataset => ({
      ...dataset,
      fill: true,
      backgroundColor: dataset.backgroundColor || 'rgba(75, 192, 192, 0.2)',
      borderColor: dataset.borderColor || 'rgba(75, 192, 192, 1)',
    }));
  }

  // Default colors for datasets if not provided
  const defaultColors = [
    'rgba(75, 192, 192, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
  ];

  // Apply default colors if needed
  data.datasets = data.datasets.map((dataset, index) => {
    if (!dataset.backgroundColor) {
      if (type === 'pie') {
        // For pie charts, use different colors for each slice
        dataset.backgroundColor = dataset.data.map((_, i) => defaultColors[i % defaultColors.length]);
      } else {
        dataset.backgroundColor = defaultColors[index % defaultColors.length];
      }
    }
    return dataset;
  });

  // Build Chart.js configuration
  const chartConfig = {
    type: chartType,
    data,
    options: {
      plugins: {
        title: title ? {
          display: true,
          text: title,
          font: { size: 18 },
        } : undefined,
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: type !== 'pie' ? {
        y: {
          beginAtZero: true,
        },
      } : undefined,
    },
  };

  // Encode the chart configuration
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));

  // Build QuickChart URL
  return `${QUICKCHART_API}?c=${encodedConfig}&width=${width}&height=${height}&backgroundColor=${backgroundColor}&format=png`;
}

/**
 * Download chart image from URL
 */
async function downloadChart(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`QuickChart API returned ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(`Failed to download chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const renderChartTool = tool({
  description: `Generate and render professional charts/graphs as PNG images for Discord attachments.

  Perfect for data visualization with colors, legends, and professional formatting.
  This tool generates actual image files (not ASCII art) that Discord will display inline.

  Supported chart types:
  - bar: Vertical bar chart (great for comparisons)
  - line: Line graph (great for trends over time)
  - pie: Pie chart (great for showing proportions)
  - scatter: Scatter plot (great for correlations)
  - area: Area chart (line chart with filled area)

  The tool uses QuickChart.io API to generate Chart.js charts as PNG images.
  Charts include professional styling with colors, legends, titles, and proper scaling.

  Example use cases:
  - "Show sales data as a bar chart: Q1=100, Q2=150, Q3=200"
  - "Create a line graph of temperature over time"
  - "Make a pie chart showing market share"
  - "Plot correlation between X and Y as a scatter chart"`,

  inputSchema: z.object({
    type: z.enum(['bar', 'line', 'pie', 'scatter', 'area'])
      .describe('Chart type: bar, line, pie, scatter, or area'),

    labels: z.array(z.string())
      .describe('Labels for the x-axis or pie slices (e.g., ["Q1", "Q2", "Q3", "Q4"])'),

    datasets: z.array(
      z.object({
        label: z.string().describe('Dataset label (shown in legend)'),
        data: z.array(z.number()).describe('Data points for this dataset'),
        backgroundColor: z.string().optional().describe('Background color (e.g., "rgba(75, 192, 192, 0.8)")'),
        borderColor: z.string().optional().describe('Border color'),
      })
    ).describe('Array of datasets to plot. Each dataset can have its own styling.'),

    title: z.string().optional()
      .describe('Chart title (displayed at the top)'),

    width: z.number().int().min(400).max(2000).optional()
      .describe('Chart width in pixels (default: 800)'),

    height: z.number().int().min(300).max(2000).optional()
      .describe('Chart height in pixels (default: 600)'),

    backgroundColor: z.string().optional()
      .describe('Background color (default: "white")'),

    userId: z.string().optional()
      .describe('User ID for tracking who created the chart'),

    username: z.string().optional()
      .describe('Username for tracking who created the chart'),

    discordMessageId: z.string().optional()
      .describe('Discord message ID to associate with this chart'),
  }),

  execute: async ({ type, labels, datasets, title, width, height, backgroundColor, userId, username, discordMessageId }) => {
    try {
      // Validate that all datasets have the same length as labels
      const expectedLength = type === 'scatter' ? undefined : labels.length;
      if (expectedLength) {
        for (const dataset of datasets) {
          if (dataset.data.length !== expectedLength) {
            return {
              success: false,
              error: `Dataset "${dataset.label}" has ${dataset.data.length} data points but ${expectedLength} labels were provided. They must match.`,
            };
          }
        }
      }

      // Build chart data
      const chartData: ChartData = {
        labels,
        datasets: datasets as ChartDataset[],
      };

      // Generate chart URL
      const chartUrl = generateChartUrl(type, chartData, {
        title,
        width,
        height,
        backgroundColor,
      });

      console.log(`📊 Generating ${type} chart with QuickChart.io...`);
      console.log(`📊 Chart URL: ${chartUrl}`);

      // Download the chart image
      const imageBuffer = await downloadChart(chartUrl);

      console.log(`✅ Chart generated successfully (${imageBuffer.length} bytes)`);

      // Create a descriptive prompt from chart configuration
      const datasetDescriptions = datasets
        .map(ds => `${ds.label}: [${ds.data.join(', ')}]`)
        .join('; ');
      const chartPrompt = `Generate a ${type} chart titled "${title || 'Chart'}" with datasets: ${datasetDescriptions}`;

      // Save chart metadata to database
      try {
        const dbResult = await saveGeneratedImage({
          userId: userId || 'unknown',
          username,
          toolName: 'renderChart',
          prompt: chartPrompt,
          model: 'quickchart.io',
          storageUrl: chartUrl,
          storageProvider: 'quickchart',
          mimeType: 'image/png',
          bytes: imageBuffer?.length,
          status: 'success',
          metadata: {
            filename: `chart_${Date.now()}.png`,
            description: `${type.charAt(0).toUpperCase() + type.slice(1)} chart generated via QuickChart.io API`,
            chartType: type,
            width: width || 800,
            height: height || 600,
            labelsCount: labels.length,
            datasetsCount: datasets.length,
            dataPointsPerDataset: datasets[0]?.data.length || 0,
            timestamp: new Date().toISOString(),
          },
          messageId: discordMessageId,
        });

        console.log(`💾 Chart saved to database with ID: ${dbResult.id}`);

        // Return the chart URL and metadata
        return {
          success: true,
          type,
          chartUrl,
          imageSize: imageBuffer.length,
          imageSizeFormatted: `${(imageBuffer.length / 1024).toFixed(2)} KB`,
          width: width || 800,
          height: height || 600,
          datasetCount: datasets.length,
          dataPointsPerDataset: datasets[0]?.data.length || 0,
          message: `Chart generated successfully! Download from: ${chartUrl}`,
          downloadUrl: chartUrl,
          databaseId: dbResult.id,
          savedToDatabase: true,
        };
      } catch (dbError) {
        console.error('❌ Error saving chart to database:', dbError);
        // Still return success for chart generation, but note the database error
        return {
          success: true,
          type,
          chartUrl,
          imageSize: imageBuffer.length,
          imageSizeFormatted: `${(imageBuffer.length / 1024).toFixed(2)} KB`,
          width: width || 800,
          height: height || 600,
          datasetCount: datasets.length,
          dataPointsPerDataset: datasets[0]?.data.length || 0,
          message: `Chart generated successfully! Download from: ${chartUrl}`,
          downloadUrl: chartUrl,
          databaseSaveWarning: `Chart was generated but could not be saved to database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          savedToDatabase: false,
        };
      }
    } catch (error) {
      console.error('❌ Error generating chart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart',
      };
    }
  },
});
