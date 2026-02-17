/**
 * TPMJS API Client
 * Provides authenticated access to the TPMJS registry API for searching
 * and executing tools. Uses TPMJS_API_KEY for authentication.
 *
 * API Reference: https://tpmjs.com/llms.txt
 */

const TPMJS_BASE_URL = 'https://tpmjs.com';
const TPMJS_SITE_URL = 'https://tpmjs.com';
const TPMJS_EXECUTOR_URL = process.env.TPMJS_EXECUTOR_URL || 'https://executor.tpmjs.com';
const DEFAULT_TIMEOUT = 30000;

export interface TpmjsSearchResult {
  toolId: string;
  name: string;
  description: string;
  package: string;
  exportName: string;
  version?: string;
  category?: string;
  keywords?: string[];
  parameters?: TpmjsToolParameter[];
  author?: string;
  repository?: string;
}

export interface TpmjsToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface TpmjsExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
  toolId: string;
}

export interface TpmjsToolMetadata {
  toolId: string;
  name: string;
  description: string;
  package: string;
  exportName: string;
  version: string;
  category?: string;
  keywords?: string[];
  parameters?: TpmjsToolParameter[];
  envVars?: string[];
  author?: string;
  repository?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TpmjsLlmsSpec {
  name: string;
  description: string;
  apiBase: string;
  version: string;
  tools: TpmjsToolMetadata[];
  categories: string[];
}

/**
 * Get the TPMJS API key from environment
 */
function getApiKey(): string | undefined {
  return process.env.TPMJS_API_KEY;
}

/**
 * Build authorization headers for TPMJS API requests
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'OmegaBot/1.0 (TPMJS Integration)',
    'Accept': 'application/json',
  };

  const apiKey = getApiKey();
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['X-API-Key'] = apiKey;
  }

  return headers;
}

/**
 * Make an authenticated request to the TPMJS API
 */
async function tpmjsRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    timeout?: number;
    baseUrl?: string;
  } = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const { method = 'GET', body, timeout = DEFAULT_TIMEOUT, baseUrl = TPMJS_BASE_URL } = options;
  const url = `${baseUrl}${path}`;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(timeout),
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        data: null,
        error: `TPMJS API error (${response.status}): ${errorText}`,
        status: response.status,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json() as T;
      return { data, error: null, status: response.status };
    }

    // For non-JSON responses (like llms.txt), return raw text
    const text = await response.text();
    return { data: text as unknown as T, error: null, status: response.status };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { data: null, error: 'TPMJS API request timed out', status: 0 };
    }
    return {
      data: null,
      error: `TPMJS API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 0,
    };
  }
}

/**
 * Search the TPMJS registry for tools
 */
export async function searchTpmjsRegistry(
  query: string,
  options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ results: TpmjsSearchResult[]; total: number; error: string | null }> {
  const { category, limit = 10, offset = 0 } = options;

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
  });

  if (category) {
    params.set('category', category);
  }

  // biome-ignore lint/suspicious/noExplicitAny: API response format varies
  const apiResult = await tpmjsRequest<any>(`/api/tools/search?${params.toString()}`);

  if (apiResult.data && !apiResult.error) {
    // TPMJS API returns: { results: { total, returned, tools: [...] } }
    // Map the nested tools array to our TpmjsSearchResult format
    const rawTools: any[] = apiResult.data.results?.tools  // nested format: { results: { tools } }
      || apiResult.data.tools                               // flat format: { tools }
      || (Array.isArray(apiResult.data.results) ? apiResult.data.results : []);  // array format

    const results: TpmjsSearchResult[] = rawTools.map((t: any) => ({
      toolId: t.toolId || `${t.package?.npmPackageName || t.package}::${t.name}`,
      name: t.name || t.exportName || '',
      description: t.description || '',
      package: t.package?.npmPackageName || t.package || '',
      exportName: t.name || t.exportName || '',
      version: t.package?.npmVersion || t.version,
      category: t.package?.category || t.category,
      keywords: t.package?.npmKeywords || t.keywords,
    }));

    const total = apiResult.data.results?.total || apiResult.data.total || results.length;
    return { results, total, error: null };
  }

  return {
    results: [],
    total: 0,
    error: apiResult.error || 'Search endpoint failed',
  };
}

/**
 * Execute a tool from the TPMJS registry.
 * Tries the TPMJS API first (/api/registry/execute), then falls back
 * to calling the executor service directly.
 */
export async function executeTpmjsTool(
  toolId: string,
  params: Record<string, unknown>,
  env?: Record<string, string>
): Promise<TpmjsExecutionResult> {
  const startTime = Date.now();

  // Try TPMJS API endpoint first (handles version lookup internally)
  const apiResult = await tpmjsRequest<{
    success?: boolean;
    result?: unknown;
    error?: string | null;
    toolId?: string;
    executionTimeMs?: number;
  }>('/api/registry/execute', {
    method: 'POST',
    body: { toolId, params, env: env || {} },
    timeout: 60000,
  });

  if (apiResult.data && !apiResult.error) {
    return {
      success: apiResult.data.success !== false,
      result: apiResult.data.result,
      error: apiResult.data.error ?? undefined,
      executionTimeMs: Date.now() - startTime,
      toolId,
    };
  }

  // Fallback: call executor directly
  // Parse toolId format: "package::exportName"
  const separatorIndex = toolId.lastIndexOf('::');
  if (separatorIndex === -1) {
    return {
      success: false,
      error: `Invalid toolId format. Expected "package::exportName", got "${toolId}"`,
      executionTimeMs: Date.now() - startTime,
      toolId,
    };
  }

  const packageName = toolId.substring(0, separatorIndex);
  const exportName = toolId.substring(separatorIndex + 2);

  if (!packageName || !exportName) {
    return {
      success: false,
      error: `Invalid toolId format. Expected "package::exportName", got "${toolId}"`,
      executionTimeMs: Date.now() - startTime,
      toolId,
    };
  }

  try {
    const response = await fetch(`${TPMJS_EXECUTOR_URL}/execute-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageName,
        name: exportName,
        version: 'latest',
        importUrl: `https://esm.sh/${packageName}@latest`,
        params,
        env: env || {},
      }),
      signal: AbortSignal.timeout(60000),
    });

    const result = await response.json() as {
      success?: boolean;
      result?: unknown;
      output?: unknown;
      error?: string;
    };

    return {
      success: result.success !== false,
      result: result.result || result.output,
      error: result.error,
      executionTimeMs: Date.now() - startTime,
      toolId,
    };
  } catch (error) {
    return {
      success: false,
      error: apiResult.error || `Executor request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTimeMs: Date.now() - startTime,
      toolId,
    };
  }
}

/**
 * Get detailed metadata for a specific tool
 */
export async function getTpmjsToolMetadata(
  toolId: string
): Promise<{ metadata: TpmjsToolMetadata | null; error: string | null }> {
  // Try direct tool lookup
  const result = await tpmjsRequest<TpmjsToolMetadata>(
    `/api/tools/${encodeURIComponent(toolId)}`
  );

  if (result.data && !result.error) {
    return { metadata: result.data, error: null };
  }

  // Try with package::exportName format split
  if (toolId.includes('::')) {
    const [pkg, exportName] = toolId.split('::');
    const altResult = await tpmjsRequest<TpmjsToolMetadata>(
      `/api/tools/${encodeURIComponent(pkg)}/${encodeURIComponent(exportName)}`
    );

    if (altResult.data && !altResult.error) {
      return { metadata: altResult.data, error: null };
    }
  }

  return {
    metadata: null,
    error: result.error || `Tool '${toolId}' not found in TPMJS registry`,
  };
}

/**
 * Fetch and parse the TPMJS llms.txt specification
 */
export async function fetchTpmjsSpec(): Promise<{
  spec: TpmjsLlmsSpec | null;
  rawContent: string | null;
  error: string | null;
}> {
  const result = await tpmjsRequest<string>('/llms.txt', {
    baseUrl: TPMJS_SITE_URL,
  });

  if (result.error || !result.data) {
    // Try alternative path
    const altResult = await tpmjsRequest<string>('/llms.txt', {
      baseUrl: TPMJS_BASE_URL,
    });

    if (altResult.error || !altResult.data) {
      return {
        spec: null,
        rawContent: null,
        error: result.error || altResult.error || 'Failed to fetch TPMJS spec',
      };
    }

    const parsed = parseLlmsTxt(String(altResult.data));
    return { spec: parsed, rawContent: String(altResult.data), error: null };
  }

  const parsed = parseLlmsTxt(String(result.data));
  return { spec: parsed, rawContent: String(result.data), error: null };
}

/**
 * List available tool categories
 */
export async function listTpmjsCategories(): Promise<{
  categories: string[];
  error: string | null;
}> {
  const result = await tpmjsRequest<{
    categories?: string[];
  }>('/api/categories');

  if (result.data && !result.error) {
    return {
      categories: result.data.categories || [],
      error: null,
    };
  }

  // Return known categories as fallback
  return {
    categories: [
      'web-scraping',
      'data-processing',
      'file-operations',
      'communication',
      'database',
      'api-integration',
      'image-processing',
      'text-analysis',
      'automation',
      'ai-ml',
      'security',
      'monitoring',
    ],
    error: result.error,
  };
}

/**
 * Validate that the TPMJS API key is configured and working
 */
export async function validateTpmjsApiKey(): Promise<{
  valid: boolean;
  message: string;
}> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      valid: false,
      message: 'TPMJS_API_KEY is not configured. Set it in environment variables for authenticated access.',
    };
  }

  // Try a simple authenticated request
  const result = await tpmjsRequest<{ authenticated?: boolean; user?: string }>(
    '/api/auth/validate'
  );

  if (result.status === 401 || result.status === 403) {
    return {
      valid: false,
      message: 'TPMJS_API_KEY is invalid or expired. Please check your API key.',
    };
  }

  if (result.error) {
    // If the validation endpoint doesn't exist, try a search to verify
    const searchResult = await searchTpmjsRegistry('test', { limit: 1 });
    if (!searchResult.error) {
      return {
        valid: true,
        message: 'TPMJS_API_KEY appears valid (verified via search).',
      };
    }
    return {
      valid: false,
      message: `Could not validate TPMJS_API_KEY: ${result.error}`,
    };
  }

  return {
    valid: true,
    message: 'TPMJS_API_KEY is valid and authenticated.',
  };
}

/**
 * Parse the llms.txt content into structured data
 */
function parseLlmsTxt(content: string): TpmjsLlmsSpec {
  const lines = content.split('\n');
  const spec: TpmjsLlmsSpec = {
    name: 'TPMJS',
    description: '',
    apiBase: TPMJS_BASE_URL,
    version: '1.0',
    tools: [],
    categories: [],
  };

  let currentSection = '';
  let currentTool: Partial<TpmjsToolMetadata> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse headers
    if (trimmed.startsWith('# ')) {
      spec.name = trimmed.substring(2).trim();
      continue;
    }

    // Parse section headers
    if (trimmed.startsWith('## ')) {
      // Save current tool if exists
      if (currentTool && currentTool.toolId) {
        spec.tools.push(currentTool as TpmjsToolMetadata);
      }
      currentSection = trimmed.substring(3).trim().toLowerCase();
      currentTool = null;
      continue;
    }

    // Parse subsection (tool) headers
    if (trimmed.startsWith('### ')) {
      // Save previous tool
      if (currentTool && currentTool.toolId) {
        spec.tools.push(currentTool as TpmjsToolMetadata);
      }
      const toolName = trimmed.substring(4).trim();
      currentTool = {
        toolId: toolName,
        name: toolName,
        description: '',
        package: '',
        exportName: '',
        version: '',
      };
      continue;
    }

    // Parse description lines
    if (trimmed.startsWith('> ')) {
      const desc = trimmed.substring(2).trim();
      if (currentTool) {
        currentTool.description = (currentTool.description || '') + desc + ' ';
      } else if (currentSection === '' || currentSection === 'description') {
        spec.description += desc + ' ';
      }
      continue;
    }

    // Parse key-value pairs
    if (trimmed.includes(':') && !trimmed.startsWith('http')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIdx).trim().toLowerCase();
      const value = trimmed.substring(colonIdx + 1).trim();

      if (currentTool) {
        switch (key) {
          case 'package':
            currentTool.package = value;
            break;
          case 'export':
          case 'exportname':
            currentTool.exportName = value;
            break;
          case 'toolid':
          case 'tool_id':
          case 'id':
            currentTool.toolId = value;
            break;
          case 'category':
            currentTool.category = value;
            if (!spec.categories.includes(value)) {
              spec.categories.push(value);
            }
            break;
          case 'version':
            currentTool.version = value;
            break;
          case 'description':
            currentTool.description = value;
            break;
          case 'keywords':
            currentTool.keywords = value.split(',').map(k => k.trim());
            break;
          case 'author':
            currentTool.author = value;
            break;
          case 'repository':
          case 'repo':
            currentTool.repository = value;
            break;
          case 'env':
          case 'environment':
          case 'env_vars':
            currentTool.envVars = value.split(',').map(e => e.trim());
            break;
        }
      } else {
        switch (key) {
          case 'api_base':
          case 'apibase':
          case 'base_url':
            spec.apiBase = value;
            break;
          case 'version':
            spec.version = value;
            break;
          case 'description':
            spec.description = value;
            break;
        }
      }
    }

    // Parse plain text as description continuation
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('-') && !trimmed.includes(':')) {
      if (currentTool) {
        currentTool.description = ((currentTool.description || '') + ' ' + trimmed).trim();
      }
    }
  }

  // Save last tool if exists
  if (currentTool && currentTool.toolId) {
    spec.tools.push(currentTool as TpmjsToolMetadata);
  }

  // Clean up descriptions
  spec.description = spec.description.trim();
  spec.tools.forEach(t => {
    t.description = t.description.trim();
  });

  return spec;
}

/**
 * Check if TPMJS API key is available
 */
export function hasTpmjsApiKey(): boolean {
  return !!getApiKey();
}
