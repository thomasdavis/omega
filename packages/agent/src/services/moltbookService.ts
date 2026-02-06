/**
 * Moltbook Service
 * API client for Moltbook social network integration
 * Moltbook is a social network for AI agents
 * Documentation: https://moltbook.com
 */

// --- Types ---

export interface MoltbookPost {
  id: string;
  title: string;
  content?: string;
  url?: string;
  submolt?: string;
  author: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  verification_status?: string;
  verification_required?: boolean;
  verification?: {
    code: string;
    challenge: string;
    expires_at: string;
    instructions: string;
    verify_endpoint: string;
  };
}

export interface MoltbookComment {
  id: string;
  post_id: string;
  content: string;
  author: string;
  parent_id?: string;
  upvotes: number;
  created_at: string;
}

export interface MoltbookSubmolt {
  name: string;
  description?: string;
  subscriber_count: number;
  post_count: number;
  created_at: string;
}

export interface MoltbookAgent {
  name: string;
  description?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  karma: number;
  created_at: string;
}

export interface MoltbookRegistration {
  api_key: string;
  claim_url: string;
  verification_code: string;
  agent_name: string;
}

export interface MoltbookVerification {
  success: boolean;
  message?: string;
}

export interface MoltbookSearchResult {
  posts?: MoltbookPost[];
  comments?: MoltbookComment[];
  agents?: MoltbookAgent[];
  submolts?: MoltbookSubmolt[];
}

interface MoltbookApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Config ---

function getConfig() {
  return {
    apiKey: process.env.MOLTBOOK_API_KEY,
    baseUrl: process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1',
  };
}

// --- Shared fetch helper ---

async function moltbookFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    requireAuth?: boolean;
    params?: Record<string, string | number | undefined>;
  } = {},
): Promise<MoltbookApiResult<T>> {
  const { method = 'GET', body, requireAuth = true, params } = options;
  const config = getConfig();

  if (requireAuth && !config.apiKey) {
    return {
      success: false,
      error:
        'Missing MOLTBOOK_API_KEY environment variable. Register first using the register action, then set the API key in Railway.',
    };
  }

  try {
    const url = new URL(`${config.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OmegaBot/1.0 (Discord Bot; https://github.com/thomasdavis/omega)',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 429) {
      return {
        success: false,
        error: 'Moltbook API rate limit exceeded. Please try again later.',
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Moltbook API request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`,
      };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Moltbook API request timed out after 15 seconds. Please try again.',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calling Moltbook API',
    };
  }
}

// --- Agent Registration (no auth required) ---

export async function moltbookRegister(
  name: string,
  description: string,
): Promise<MoltbookApiResult<MoltbookRegistration>> {
  return moltbookFetch<MoltbookRegistration>('/agents/register', {
    method: 'POST',
    body: { name, description },
    requireAuth: false,
  });
}

// --- Posts ---

export async function moltbookCreatePost(options: {
  title: string;
  content?: string;
  url?: string;
  submolt?: string;
}): Promise<MoltbookApiResult<MoltbookPost>> {
  const payload: Record<string, unknown> = {
    title: options.title,
    submolt: options.submolt,
  };
  if (options.url) {
    payload.url = options.url;
  } else {
    payload.content = options.content;
  }
  return moltbookFetch<MoltbookPost>('/posts', {
    method: 'POST',
    body: payload,
  });
}

export async function moltbookGetFeed(
  sort?: string,
  limit?: number,
  submolt?: string,
): Promise<MoltbookApiResult<MoltbookPost[]>> {
  return moltbookFetch<MoltbookPost[]>('/posts', {
    params: { sort, limit, submolt },
  });
}

export async function moltbookGetPost(postId: string): Promise<MoltbookApiResult<MoltbookPost>> {
  return moltbookFetch<MoltbookPost>(`/posts/${encodeURIComponent(postId)}`);
}

export async function moltbookDeletePost(postId: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
}

export async function moltbookUpvotePost(postId: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/posts/${encodeURIComponent(postId)}/upvote`, { method: 'POST' });
}

export async function moltbookDownvotePost(postId: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/posts/${encodeURIComponent(postId)}/downvote`, { method: 'POST' });
}

// --- Comments ---

export async function moltbookCreateComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<MoltbookApiResult<MoltbookComment>> {
  return moltbookFetch<MoltbookComment>(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: { content, parent_id: parentId },
  });
}

export async function moltbookGetComments(
  postId: string,
  sort?: string,
): Promise<MoltbookApiResult<MoltbookComment[]>> {
  return moltbookFetch<MoltbookComment[]>(`/posts/${encodeURIComponent(postId)}/comments`, {
    params: { sort },
  });
}

export async function moltbookUpvoteComment(commentId: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/comments/${encodeURIComponent(commentId)}/upvote`, {
    method: 'POST',
  });
}

// --- Submolts (Communities) ---

export async function moltbookCreateSubmolt(
  name: string,
  description?: string,
): Promise<MoltbookApiResult<MoltbookSubmolt>> {
  return moltbookFetch<MoltbookSubmolt>('/submolts', {
    method: 'POST',
    body: { name, description },
  });
}

export async function moltbookListSubmolts(): Promise<MoltbookApiResult<MoltbookSubmolt[]>> {
  return moltbookFetch<MoltbookSubmolt[]>('/submolts');
}

export async function moltbookGetSubmolt(
  name: string,
): Promise<MoltbookApiResult<MoltbookSubmolt>> {
  return moltbookFetch<MoltbookSubmolt>(`/submolts/${encodeURIComponent(name)}`);
}

export async function moltbookSubscribeSubmolt(name: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/submolts/${encodeURIComponent(name)}/subscribe`, {
    method: 'POST',
  });
}

export async function moltbookUnsubscribeSubmolt(name: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/submolts/${encodeURIComponent(name)}/subscribe`, {
    method: 'DELETE',
  });
}

// --- Agent Profiles & Following ---

export async function moltbookFollowAgent(name: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/agents/${encodeURIComponent(name)}/follow`, { method: 'POST' });
}

export async function moltbookUnfollowAgent(name: string): Promise<MoltbookApiResult<void>> {
  return moltbookFetch<void>(`/agents/${encodeURIComponent(name)}/follow`, { method: 'DELETE' });
}

export async function moltbookGetMyProfile(): Promise<MoltbookApiResult<MoltbookAgent>> {
  return moltbookFetch<MoltbookAgent>('/agents/me');
}

export async function moltbookGetAgentProfile(
  name: string,
): Promise<MoltbookApiResult<MoltbookAgent>> {
  return moltbookFetch<MoltbookAgent>('/agents/profile', {
    params: { name },
  });
}

export async function moltbookUpdateProfile(
  updates: Record<string, unknown>,
): Promise<MoltbookApiResult<MoltbookAgent>> {
  return moltbookFetch<MoltbookAgent>('/agents/me', {
    method: 'PATCH',
    body: updates,
  });
}

// --- Search ---

export async function moltbookSearch(
  query: string,
  type?: string,
  limit?: number,
): Promise<MoltbookApiResult<MoltbookSearchResult>> {
  return moltbookFetch<MoltbookSearchResult>('/search', {
    params: { q: query, type, limit },
  });
}

// --- Verification ---

export async function moltbookVerify(
  verificationCode: string,
  answer: string,
): Promise<MoltbookApiResult<MoltbookVerification>> {
  return moltbookFetch<MoltbookVerification>('/verify', {
    method: 'POST',
    body: { verification_code: verificationCode, answer },
  });
}

// --- Status ---

export async function moltbookGetStatus(): Promise<MoltbookApiResult<{ status: string }>> {
  return moltbookFetch<{ status: string }>('/agents/status');
}
