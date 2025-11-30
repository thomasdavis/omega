/**
 * CSV to Chart Tool - Convert CSV data into various chart types automatically
 * Parses CSV input, recognizes columns and types, and generates visual charts
 */

import { tool } from 'ai';
import { z } from 'zod';

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
 * Parse CSV string into rows and columns
 */
function parseCsv(csvContent: string): string[][] {
  const lines = csvContent.trim().split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          // Double quote inside quoted field
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field
    row.push(currentField.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Detect if a column contains numeric data
 */
function isNumericColumn(values: string[]): boolean {
  // Skip header, check if at least 70% of values are numeric
  const numericCount = values.filter(val => {
    const num = parseFloat(val);
    return !isNaN(num) && val.trim() !== '';
  }).length;

  return values.length > 0 && (numericCount / values.length) >= 0.7;
}

/**
 * Convert CSV data to chart-ready format
 */
function csvToChartData(
  rows: string[][],
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area',
  options: {
    labelColumn?: number;
    dataColumns?: number[];
    hasHeaders?: boolean;
  }
): { chartData: ChartData; columnHeaders: string[] } {
  const { labelColumn = 0, dataColumns, hasHeaders = true } = options;

  if (rows.length === 0) {
    throw new Error('CSV data is empty');
  }

  // Extract headers
  const headers = hasHeaders ? rows[0] : rows[0].map((_, i) => `Column ${i + 1}`);
  const dataRows = hasHeaders ? rows.slice(1) : rows;

  if (dataRows.length === 0) {
    throw new Error('No data rows found in CSV');
  }

  // Auto-detect data columns if not specified
  let targetDataColumns = dataColumns;
  if (!targetDataColumns) {
    targetDataColumns = [];
    for (let i = 0; i < headers.length; i++) {
      if (i !== labelColumn) {
        const columnValues = dataRows.map(row => row[i] || '');
        if (isNumericColumn(columnValues)) {
          targetDataColumns.push(i);
        }
      }
    }
  }

  if (targetDataColumns.length === 0) {
    throw new Error('No numeric columns found in CSV data');
  }

  // Extract labels
  const labels = dataRows.map(row => row[labelColumn] || '');

  // Extract datasets
  const datasets: ChartDataset[] = targetDataColumns.map(colIndex => {
    const data = dataRows.map(row => {
      const value = parseFloat(row[colIndex] || '0');
      return isNaN(value) ? 0 : value;
    });

    return {
      label: headers[colIndex] || `Data ${colIndex + 1}`,
      data,
    };
  });

  return {
    chartData: { labels, datasets },
    columnHeaders: headers,
  };
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

export const csvToChartTool = tool({
  description: `Convert CSV data into various chart types automatically.

  This tool parses CSV input, recognizes columns and data types, and generates visual charts.
  Perfect for quick data visualization without manual data preparation.

  Features:
  - Automatic CSV parsing with proper quote handling
  - Auto-detection of numeric columns for charting
  - Supports multiple chart types: bar, line, pie, scatter, area
  - Customizable chart styling and dimensions
  - Generates downloadable PNG images via QuickChart.io

  Supported chart types:
  - bar: Vertical bar chart (great for comparisons)
  - line: Line graph (great for trends over time)
  - pie: Pie chart (great for showing proportions, uses first numeric column)
  - scatter: Scatter plot (great for correlations)
  - area: Area chart (line chart with filled area)

  The tool automatically:
  1. Parses CSV with proper handling of quoted fields and commas
  2. Detects which columns contain numeric data
  3. Uses the first column as labels (or specify a different one)
  4. Creates datasets from numeric columns
  5. Generates a professional chart with colors and legends

  Example use cases:
  - "Convert this sales CSV to a bar chart"
  - "Turn quarterly data into a line graph"
  - "Make a pie chart from this market share CSV"
  - "Plot this correlation data as a scatter chart"`,

  inputSchema: z.object({
    csvData: z.string()
      .describe('Raw CSV data as a string. Can include headers and proper CSV formatting with quotes.'),

    chartType: z.enum(['bar', 'line', 'pie', 'scatter', 'area'])
      .describe('Type of chart to generate'),

    title: z.string().optional()
      .describe('Chart title (displayed at the top)'),

    hasHeaders: z.boolean().optional()
      .describe('Whether the first row contains column headers (default: true)'),

    labelColumn: z.number().int().min(0).optional()
      .describe('Column index to use for labels (default: 0, the first column)'),

    dataColumns: z.array(z.number().int().min(0)).optional()
      .describe('Column indices to use for data. If not specified, all numeric columns will be used.'),

    width: z.number().int().min(400).max(2000).optional()
      .describe('Chart width in pixels (default: 800)'),

    height: z.number().int().min(300).max(2000).optional()
      .describe('Chart height in pixels (default: 600)'),

    backgroundColor: z.string().optional()
      .describe('Background color (default: "white")'),
  }),

  execute: async ({
    csvData,
    chartType,
    title,
    hasHeaders = true,
    labelColumn,
    dataColumns,
    width,
    height,
    backgroundColor,
  }) => {
    try {
      // Parse CSV
      console.log('📊 Parsing CSV data...');
      const rows = parseCsv(csvData);

      if (rows.length === 0) {
        return {
          success: false,
          error: 'CSV data is empty',
        };
      }

      console.log(`📊 Parsed ${rows.length} rows with ${rows[0]?.length || 0} columns`);

      // Convert to chart data
      const { chartData, columnHeaders } = csvToChartData(rows, chartType, {
        labelColumn,
        dataColumns,
        hasHeaders,
      });

      console.log(`📊 Created chart with ${chartData.datasets.length} dataset(s) and ${chartData.labels.length} labels`);

      // Generate chart URL
      const chartUrl = generateChartUrl(chartType, chartData, {
        title,
        width,
        height,
        backgroundColor,
      });

      console.log(`📊 Generating ${chartType} chart with QuickChart.io...`);
      console.log(`📊 Chart URL: ${chartUrl}`);

      // Download the chart image
      const imageBuffer = await downloadChart(chartUrl);

      console.log(`✅ Chart generated successfully (${imageBuffer.length} bytes)`);

      // Return chart metadata and URL
      return {
        success: true,
        chartType,
        chartUrl,
        imageSize: imageBuffer.length,
        imageSizeFormatted: `${(imageBuffer.length / 1024).toFixed(2)} KB`,
        width: width || 800,
        height: height || 600,
        rowCount: rows.length - (hasHeaders ? 1 : 0),
        columnCount: rows[0]?.length || 0,
        datasetCount: chartData.datasets.length,
        datasetNames: chartData.datasets.map(ds => ds.label),
        labelCount: chartData.labels.length,
        message: `Chart generated successfully from CSV data! ${chartData.datasets.length} dataset(s) with ${chartData.labels.length} data points. Download from: ${chartUrl}`,
        downloadUrl: chartUrl,
      };
    } catch (error) {
      console.error('❌ Error generating chart from CSV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart from CSV',
      };
    }
  },
});
