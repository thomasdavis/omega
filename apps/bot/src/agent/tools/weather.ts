/**
 * Weather Tool - Gets weather information for a location
 * Placeholder implementation - integrate with OpenWeatherMap or similar in production
 */

import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get current weather information for a specific location',
  parameters: z.object({
    location: z.string().describe('The city or location to get weather for, e.g., "New York" or "London, UK"'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius').describe('Temperature units'),
  }),
  // @ts-ignore - AI SDK beta.99 type mismatch
  execute: async ({ location, units }) => {
    // TODO: Integrate with weather API (OpenWeatherMap, WeatherAPI, etc.)
    console.log(`🌤️  Getting weather for: ${location} (${units})`);

    // Simulated response
    const temp = units === 'celsius' ? 22 : 72;
    const symbol = units === 'celsius' ? '°C' : '°F';

    return {
      location,
      temperature: `${temp}${symbol}`,
      condition: 'Partly Cloudy',
      humidity: '65%',
      windSpeed: '15 km/h',
      note: 'This is simulated data. Integrate with OpenWeatherMap or similar API for real weather data.',
    };
  },
});
