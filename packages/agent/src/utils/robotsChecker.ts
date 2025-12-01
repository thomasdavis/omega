/**
 * Robots.txt Checker Utility
 * Checks if a URL can be scraped according to robots.txt rules
 */

export interface RobotsCheckResult {
  allowed: boolean;
  reason?: string;
  robotsUrl?: string;
  crawlDelay?: number;
  matchedRules?: string[];
}

/**
 * Simple robots.txt parser and checker
 * Checks if a given URL is allowed to be scraped according to robots.txt
 */
export class RobotsChecker {
  private cache: Map<string, { rules: RobotsRules; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Check if a URL is allowed to be fetched according to robots.txt
   */
  async isAllowed(url: string, userAgent = 'OmegaBot'): Promise<RobotsCheckResult> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      // Get or fetch robots.txt rules
      const rules = await this.getRobotRules(robotsUrl, userAgent);

      // Check if the path is allowed
      const path = urlObj.pathname + urlObj.search;
      const { allowed, matchedRules } = this.isPathAllowed(path, rules);

      return {
        allowed,
        reason: allowed
          ? 'URL is allowed by robots.txt'
          : 'URL is disallowed by robots.txt rules',
        robotsUrl,
        crawlDelay: rules.crawlDelay,
        matchedRules,
      };
    } catch (error) {
      // If robots.txt cannot be fetched, assume allowed (fail open)
      // This is standard practice for robots.txt
      return {
        allowed: true,
        reason: `No robots.txt found or error fetching it: ${error instanceof Error ? error.message : 'unknown error'}`,
      };
    }
  }

  /**
   * Fetch and parse robots.txt rules for a given domain
   */
  private async getRobotRules(robotsUrl: string, userAgent: string): Promise<RobotsRules> {
    // Check cache first
    const cached = this.cache.get(robotsUrl);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.rules;
    }

    // Fetch robots.txt
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': userAgent,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      // If robots.txt doesn't exist (404) or error, return empty rules (allow all)
      const emptyRules: RobotsRules = { disallowedPaths: [], allowedPaths: [] };
      this.cache.set(robotsUrl, { rules: emptyRules, timestamp: Date.now() });
      return emptyRules;
    }

    const robotsTxt = await response.text();
    const rules = this.parseRobotsTxt(robotsTxt, userAgent);

    // Cache the rules
    this.cache.set(robotsUrl, { rules, timestamp: Date.now() });

    return rules;
  }

  /**
   * Parse robots.txt content and extract rules for the given user agent
   */
  private parseRobotsTxt(content: string, userAgent: string): RobotsRules {
    const lines = content.split('\n');
    const rules: RobotsRules = {
      disallowedPaths: [],
      allowedPaths: [],
    };

    let isRelevantSection = false;
    let isWildcardSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }

      // Check for User-agent directive
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.substring(11).trim().toLowerCase();
        isRelevantSection = agent === userAgent.toLowerCase() || agent === '*';
        isWildcardSection = agent === '*';
        continue;
      }

      // Only process directives if we're in a relevant section
      if (isRelevantSection || isWildcardSection) {
        // Disallow directive
        if (trimmed.toLowerCase().startsWith('disallow:')) {
          const path = trimmed.substring(9).trim();
          if (path) {
            rules.disallowedPaths.push(path);
          }
        }

        // Allow directive
        if (trimmed.toLowerCase().startsWith('allow:')) {
          const path = trimmed.substring(6).trim();
          if (path) {
            rules.allowedPaths.push(path);
          }
        }

        // Crawl-delay directive
        if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
          const delay = trimmed.substring(12).trim();
          const delayNum = parseFloat(delay);
          if (!isNaN(delayNum)) {
            rules.crawlDelay = delayNum;
          }
        }
      }
    }

    return rules;
  }

  /**
   * Check if a path is allowed based on robots.txt rules
   * Allow rules take precedence over Disallow rules
   */
  private isPathAllowed(path: string, rules: RobotsRules): { allowed: boolean; matchedRules: string[] } {
    const matchedRules: string[] = [];

    // Check if explicitly allowed first (Allow takes precedence)
    for (const allowedPath of rules.allowedPaths) {
      if (this.pathMatches(path, allowedPath)) {
        matchedRules.push(`Allow: ${allowedPath}`);
        return { allowed: true, matchedRules };
      }
    }

    // Check if disallowed
    for (const disallowedPath of rules.disallowedPaths) {
      if (this.pathMatches(path, disallowedPath)) {
        matchedRules.push(`Disallow: ${disallowedPath}`);
        return { allowed: false, matchedRules };
      }
    }

    // If no rules match, allow by default
    return { allowed: true, matchedRules: ['Default: Allow (no matching rules)'] };
  }

  /**
   * Check if a path matches a robots.txt pattern
   * Supports wildcards: * and $
   */
  private pathMatches(path: string, pattern: string): boolean {
    // Exact match
    if (path === pattern) {
      return true;
    }

    // Pattern ends with $ (exact end match)
    if (pattern.endsWith('$')) {
      const patternWithoutDollar = pattern.slice(0, -1);
      return path === patternWithoutDollar;
    }

    // Pattern contains * (wildcard)
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*/g, '.*'); // Replace * with .*
      const regex = new RegExp(`^${regexPattern}`);
      return regex.test(path);
    }

    // Prefix match (standard robots.txt behavior)
    return path.startsWith(pattern);
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

interface RobotsRules {
  disallowedPaths: string[];
  allowedPaths: string[];
  crawlDelay?: number;
}

// Export a singleton instance
export const robotsChecker = new RobotsChecker();
