/**
 * Shellmates Service
 * API client for Shellmates.app integration
 * Documentation: https://www.shellmates.app/
 */

interface ShellmatesConfig {
  apiKey?: string;
  baseUrl?: string;
}

interface ShellmatesUser {
  id: string;
  username: string;
  level?: number;
  rank?: number;
  points?: number;
  challenges_completed?: number;
  profile_url?: string;
}

interface ShellmatesChallenge {
  id: string;
  title: string;
  category?: string;
  difficulty?: string;
  points?: number;
  solved_count?: number;
}

interface ShellmatesApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Initialize Shellmates API client configuration
 */
function getShellmatesConfig(): ShellmatesConfig {
  return {
    apiKey: process.env.SHELLMATES_API_KEY,
    baseUrl: process.env.SHELLMATES_API_URL || 'https://api.shellmates.app',
  };
}

/**
 * Fetch user profile from Shellmates.app
 * @param username - Shellmates username
 * @returns User profile data
 */
export async function getShellmatesUser(username: string): Promise<ShellmatesApiResult<ShellmatesUser>> {
  try {
    const config = getShellmatesConfig();

    if (!config.apiKey) {
      return {
        success: false,
        error: 'Missing SHELLMATES_API_KEY environment variable. Please configure Shellmates.app API credentials.',
      };
    }

    console.log(`🔍 Fetching Shellmates profile for: ${username}`);

    const response = await fetch(`${config.baseUrl}/users/${encodeURIComponent(username)}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OmegaBot/1.0 (Discord Bot; https://github.com/thomasdavis/omega)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: `User '${username}' not found on Shellmates.app`,
        };
      }
      return {
        success: false,
        error: `Shellmates API request failed with status ${response.status}`,
      };
    }

    const data = await response.json();

    console.log(`✅ Successfully fetched Shellmates profile for: ${username}`);

    return {
      success: true,
      data: data as ShellmatesUser,
    };
  } catch (error) {
    console.error('❌ Error fetching Shellmates user:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Shellmates API request timed out after 10 seconds. Please try again.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching Shellmates user',
    };
  }
}

/**
 * Fetch challenges from Shellmates.app
 * @param options - Filter options for challenges
 * @returns List of challenges
 */
export async function getShellmatesChallenges(options?: {
  category?: string;
  difficulty?: string;
  limit?: number;
}): Promise<ShellmatesApiResult<ShellmatesChallenge[]>> {
  try {
    const config = getShellmatesConfig();

    if (!config.apiKey) {
      return {
        success: false,
        error: 'Missing SHELLMATES_API_KEY environment variable. Please configure Shellmates.app API credentials.',
      };
    }

    console.log('🎯 Fetching Shellmates challenges...');

    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.difficulty) params.append('difficulty', options.difficulty);
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `${config.baseUrl}/challenges${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OmegaBot/1.0 (Discord Bot; https://github.com/thomasdavis/omega)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Shellmates API request failed with status ${response.status}`,
      };
    }

    const data = await response.json();

    console.log(`✅ Successfully fetched ${Array.isArray(data) ? data.length : 0} challenges`);

    return {
      success: true,
      data: Array.isArray(data) ? data : [],
    };
  } catch (error) {
    console.error('❌ Error fetching Shellmates challenges:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Shellmates API request timed out after 10 seconds. Please try again.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching Shellmates challenges',
    };
  }
}

/**
 * Fetch leaderboard from Shellmates.app
 * @param limit - Number of top users to fetch
 * @returns Leaderboard data
 */
export async function getShellmatesLeaderboard(limit: number = 10): Promise<ShellmatesApiResult<ShellmatesUser[]>> {
  try {
    const config = getShellmatesConfig();

    if (!config.apiKey) {
      return {
        success: false,
        error: 'Missing SHELLMATES_API_KEY environment variable. Please configure Shellmates.app API credentials.',
      };
    }

    console.log(`🏆 Fetching Shellmates leaderboard (top ${limit})...`);

    const response = await fetch(`${config.baseUrl}/leaderboard?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OmegaBot/1.0 (Discord Bot; https://github.com/thomasdavis/omega)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Shellmates API request failed with status ${response.status}`,
      };
    }

    const data = await response.json();

    console.log(`✅ Successfully fetched leaderboard with ${Array.isArray(data) ? data.length : 0} users`);

    return {
      success: true,
      data: Array.isArray(data) ? data : [],
    };
  } catch (error) {
    console.error('❌ Error fetching Shellmates leaderboard:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Shellmates API request timed out after 10 seconds. Please try again.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching Shellmates leaderboard',
    };
  }
}
