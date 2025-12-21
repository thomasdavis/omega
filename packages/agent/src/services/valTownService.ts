/**
 * Val Town API Service
 * Enables programmatic creation, updating, and management of vals
 * API Documentation: https://docs.val.town/api
 */

/**
 * Val Town API Base URL
 */
const VAL_TOWN_API_BASE = 'https://api.val.town/v1';

/**
 * Val object structure from Val Town API
 */
export interface Val {
  id: string;
  name: string;
  code: string;
  privacy: 'public' | 'unlisted' | 'private';
  version: number;
  author: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  readme?: string;
  runStartAt?: string;
  runEndAt?: string;
  public_suffix_domain?: string;
}

/**
 * Request to create a new val
 */
export interface CreateValRequest {
  name: string;
  code: string;
  privacy?: 'public' | 'unlisted' | 'private';
  readme?: string;
  type?: 'script' | 'http' | 'email' | 'interval';
}

/**
 * Request to update an existing val
 */
export interface UpdateValRequest {
  code?: string;
  privacy?: 'public' | 'unlisted' | 'private';
  readme?: string;
}

/**
 * Result wrapper for API operations
 */
export interface ValTownResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Custom error class for Val Town API errors
 */
export class ValTownApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ValTownApiError';
  }
}

/**
 * Val Town API Client
 */
export class ValTownClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey?: string, baseUrl?: string, timeout: number = 30000) {
    this.apiKey = apiKey || process.env.VAL_TOWN_API_KEY || '';
    this.baseUrl = baseUrl || VAL_TOWN_API_BASE;
    this.timeout = timeout;
  }

  /**
   * Make a request to the Val Town API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new ValTownApiError(
        401,
        'MISSING_API_KEY',
        'VAL_TOWN_API_KEY environment variable not configured'
      );
    }

    const url = `${this.baseUrl}${endpoint}`;

    console.log(`🌐 Val Town API Request`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${options.method || 'GET'}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        console.log(`🔍 Error Analysis:`);
        console.log(`   - Endpoint: ${endpoint}`);
        console.log(`   - Method: ${options.method || 'GET'}`);
        console.log(`   - Status Code: ${response.status}`);
        console.log(`   - Error Code: ${errorData.code || 'N/A'}`);
        console.log(`   - Message: ${errorData.message || errorText}`);

        throw new ValTownApiError(
          response.status,
          errorData.code,
          errorData.message ||
            `API request failed with status ${response.status}`,
          errorData
        );
      }

      const data = await response.json();
      console.log(`   ✅ Request successful`);
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ValTownApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ValTownApiError(
          408,
          'TIMEOUT',
          `Request timed out after ${this.timeout}ms`
        );
      }

      throw new ValTownApiError(
        0,
        'NETWORK_ERROR',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Create a new val
   */
  async createVal(request: CreateValRequest): Promise<ValTownResult<Val>> {
    try {
      console.log(`📝 Creating val: ${request.name}`);

      const data = await this.request<Val>('/vals', {
        method: 'POST',
        body: JSON.stringify({
          name: request.name,
          code: request.code,
          privacy: request.privacy || 'unlisted',
          readme: request.readme,
          type: request.type || 'http',
        }),
      });

      console.log(`✅ Val created successfully: ${data.name} (ID: ${data.id})`);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ Error creating val:', error);

      if (error instanceof ValTownApiError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update an existing val
   */
  async updateVal(
    valId: string,
    request: UpdateValRequest
  ): Promise<ValTownResult<Val>> {
    try {
      console.log(`🔄 Updating val: ${valId}`);

      const data = await this.request<Val>(`/vals/${valId}`, {
        method: 'PUT',
        body: JSON.stringify(request),
      });

      console.log(`✅ Val updated successfully: ${data.name}`);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ Error updating val:', error);

      if (error instanceof ValTownApiError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a val by ID
   */
  async getVal(valId: string): Promise<ValTownResult<Val>> {
    try {
      console.log(`🔍 Fetching val: ${valId}`);

      const data = await this.request<Val>(`/vals/${valId}`);

      console.log(`✅ Val fetched successfully: ${data.name}`);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ Error fetching val:', error);

      if (error instanceof ValTownApiError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List user's vals
   */
  async listVals(limit: number = 100): Promise<ValTownResult<Val[]>> {
    try {
      console.log(`📋 Listing vals (limit: ${limit})`);

      const data = await this.request<{ data: Val[] }>(
        `/vals?limit=${limit}`
      );

      console.log(`✅ Found ${data.data.length} vals`);

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('❌ Error listing vals:', error);

      if (error instanceof ValTownApiError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a val
   */
  async deleteVal(valId: string): Promise<ValTownResult<void>> {
    try {
      console.log(`🗑️  Deleting val: ${valId}`);

      await this.request<void>(`/vals/${valId}`, {
        method: 'DELETE',
      });

      console.log(`✅ Val deleted successfully`);

      return {
        success: true,
      };
    } catch (error) {
      console.error('❌ Error deleting val:', error);

      if (error instanceof ValTownApiError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run a val (trigger HTTP val)
   */
  async runVal(
    username: string,
    valName: string,
    params?: Record<string, any>
  ): Promise<ValTownResult<any>> {
    try {
      console.log(`▶️  Running val: ${username}/${valName}`);

      const url = `https://${username}-${valName}.web.val.run`;
      const queryString = params
        ? '?' +
          new URLSearchParams(
            Object.entries(params).map(([k, v]) => [k, String(v)] as [string, string])
          ).toString()
        : '';

      const response = await fetch(`${url}${queryString}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(
          `Val execution failed: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      console.log(`✅ Val executed successfully`);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ Error running val:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Convenience functions for common operations
 */

/**
 * Create a new Val Town val
 */
export async function createVal(
  request: CreateValRequest
): Promise<ValTownResult<Val>> {
  const client = new ValTownClient();
  return client.createVal(request);
}

/**
 * Update an existing Val Town val
 */
export async function updateVal(
  valId: string,
  request: UpdateValRequest
): Promise<ValTownResult<Val>> {
  const client = new ValTownClient();
  return client.updateVal(valId, request);
}

/**
 * Get a val by ID
 */
export async function getVal(valId: string): Promise<ValTownResult<Val>> {
  const client = new ValTownClient();
  return client.getVal(valId);
}

/**
 * List user's vals
 */
export async function listVals(
  limit: number = 100
): Promise<ValTownResult<Val[]>> {
  const client = new ValTownClient();
  return client.listVals(limit);
}

/**
 * Delete a val
 */
export async function deleteVal(
  valId: string
): Promise<ValTownResult<void>> {
  const client = new ValTownClient();
  return client.deleteVal(valId);
}

/**
 * Run a val
 */
export async function runVal(
  username: string,
  valName: string,
  params?: Record<string, any>
): Promise<ValTownResult<any>> {
  const client = new ValTownClient();
  return client.runVal(username, valName, params);
}
