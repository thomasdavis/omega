/**
 * Robots.txt Checker
 * Checks if a URL is allowed to be scraped according to robots.txt rules
 * Implements RFC 9309 compliant robots.txt parsing
 */

interface RobotsRules {
  userAgent: string;
  disallow: string[];
  allow: string[];
}

interface CachedRobots {
  rules: RobotsRules[];
  timestamp: number;
}

// Cache robots.txt rules for 1 hour
const CACHE_TTL = 60 * 60 * 1000;
const robotsCache = new Map<string, CachedRobots>();

/**
 * Parse robots.txt content into rules
 */
function parseRobotsTxt(content: string): RobotsRules[] {
  const rules: RobotsRules[] = [];
  let currentRule: RobotsRules | null = null;

  const lines = content.split('\n');

  for (let line of lines) {
    // Remove comments and trim
    line = line.split('#')[0].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      // Start new rule block
      if (currentRule) {
        rules.push(currentRule);
      }
      currentRule = {
        userAgent: value.toLowerCase(),
        disallow: [],
        allow: [],
      };
    } else if (currentRule) {
      if (directive === 'disallow') {
        currentRule.disallow.push(value);
      } else if (directive === 'allow') {
        currentRule.allow.push(value);
      }
    }
  }

  // Push last rule
  if (currentRule) {
    rules.push(currentRule);
  }

  return rules;
}

/**
 * Check if a path matches a robots.txt pattern
 */
function pathMatches(pattern: string, path: string): boolean {
  if (!pattern) return false;

  // Empty pattern matches empty path
  if (pattern === '' && path === '') return true;

  // Convert robots.txt pattern to regex
  // * matches 0 or more characters
  // $ at end means end of path
  let regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
    .replace(/\*/g, '.*'); // * becomes .*

  if (pattern.endsWith('$')) {
    regexPattern = regexPattern.slice(0, -2) + '$'; // Exact match
  } else {
    // Pattern matches if it's a prefix
    if (!regexPattern.endsWith('.*')) {
      regexPattern = '^' + regexPattern;
    } else {
      regexPattern = '^' + regexPattern;
    }
  }

  const regex = new RegExp(regexPattern);
  return regex.test(path);
}

/**
 * Check if a URL is allowed according to robots.txt rules
 */
function isPathAllowed(rules: RobotsRules[], path: string, userAgent: string): boolean {
  // Find applicable rules (check for specific user agent first, then *)
  const applicableRules = rules.filter(
    r => r.userAgent === userAgent.toLowerCase() || r.userAgent === '*'
  );

  if (applicableRules.length === 0) {
    return true; // No rules = allowed
  }

  // Check rules in order - most specific match wins
  let isAllowed = true;

  for (const rule of applicableRules) {
    // Check allows (more specific)
    for (const allowPattern of rule.allow) {
      if (pathMatches(allowPattern, path)) {
        return true; // Explicit allow
      }
    }

    // Check disallows
    for (const disallowPattern of rule.disallow) {
      if (pathMatches(disallowPattern, path)) {
        isAllowed = false;
      }
    }
  }

  return isAllowed;
}

/**
 * Fetch and parse robots.txt for a domain
 */
async function fetchRobotsTxt(origin: string): Promise<RobotsRules[]> {
  const robotsUrl = `${origin}/robots.txt`;

  try {
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'OmegaBot/1.0 (Discord Bot; +https://github.com/thomasdavis/omega)',
      },
    });

    if (!response.ok) {
      // No robots.txt or error = allow all
      return [];
    }

    const content = await response.text();
    return parseRobotsTxt(content);
  } catch (error) {
    console.warn(`Failed to fetch robots.txt from ${robotsUrl}:`, error);
    // On error, allow (be permissive)
    return [];
  }
}

/**
 * Check if a URL can be scraped according to robots.txt
 */
export async function canScrapeUrl(
  url: string,
  userAgent: string = 'OmegaBot'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    const path = urlObj.pathname + urlObj.search;

    // Check cache
    const cached = robotsCache.get(origin);
    let rules: RobotsRules[];

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      rules = cached.rules;
    } else {
      // Fetch and cache
      rules = await fetchRobotsTxt(origin);
      robotsCache.set(origin, {
        rules,
        timestamp: Date.now(),
      });
    }

    const allowed = isPathAllowed(rules, path, userAgent);

    if (!allowed) {
      return {
        allowed: false,
        reason: `Blocked by robots.txt for ${origin}`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking robots.txt:', error);
    // On error, be conservative and disallow
    return {
      allowed: false,
      reason: `Failed to check robots.txt: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
