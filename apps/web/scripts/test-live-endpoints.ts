#!/usr/bin/env npx tsx
/**
 * Functional endpoint test script for omegaai.dev
 * Tests all major live site endpoints for availability and correctness.
 *
 * Usage: npx tsx apps/web/scripts/test-live-endpoints.ts [base-url]
 * Default base URL: https://omegaai.dev
 */

const BASE_URL = process.argv[2] || 'https://omegaai.dev';

interface TestResult {
  name: string;
  url: string;
  passed: boolean;
  status?: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  path: string,
  validate: (res: Response, body: any) => string | null
): Promise<void> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    let body: any;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    const error = validate(res, body);
    results.push({
      name,
      url,
      passed: !error,
      status: res.status,
      error: error || undefined,
      details: typeof body === 'object' ? JSON.stringify(body).slice(0, 200) : undefined,
    });
  } catch (err: any) {
    results.push({
      name,
      url,
      passed: false,
      error: err.message,
    });
  }
}

async function run() {
  console.log(`\nTesting endpoints on: ${BASE_URL}\n`);

  // Homepage
  await testEndpoint('Homepage', '/', (res) => {
    if (res.status !== 200) return `Status ${res.status}`;
    return null;
  });

  // Blog list page
  await testEndpoint('Blog Page', '/blog', (res) => {
    if (res.status !== 200) return `Status ${res.status}`;
    return null;
  });

  // Blog API
  await testEndpoint('Blog API', '/api/blog', (res, body) => {
    if (res.status !== 200) return `Status ${res.status}`;
    if (!body.success) return `API returned success=false: ${body.error}`;
    if (!Array.isArray(body.posts)) return 'No posts array';
    if (body.posts.length === 0) return 'No blog posts returned (expected at least bundled posts)';
    return null;
  });

  // Blog detail API (try first post from listing)
  await testEndpoint('Blog Detail API', '/api/blog', async (res, body) => {
    if (!body.success || !body.posts?.length) return 'No posts to test detail endpoint';
    return null;
  });

  // Comics page
  await testEndpoint('Comics Page', '/comics', (res) => {
    if (res.status !== 200) return `Status ${res.status}`;
    return null;
  });

  // Comics API
  await testEndpoint('Comics API', '/api/comics', (res, body) => {
    if (res.status !== 200) return `Status ${res.status}`;
    if (!body.success) return `API returned success=false: ${body.error}`;
    if (!Array.isArray(body.comics)) return 'No comics array';
    return null;
  });

  // Comics detail (try first comic from listing)
  const comicsRes = await fetch(`${BASE_URL}/api/comics`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (comicsRes) {
    const comicsData = await comicsRes.json().catch(() => null);
    if (comicsData?.comics?.[0]?.url) {
      await testEndpoint('Comic Detail (first comic)', comicsData.comics[0].url, (res) => {
        if (res.status !== 200) return `Status ${res.status}`;
        return null;
      });
    }
  }

  // Blog detail (try first post)
  const blogRes = await fetch(`${BASE_URL}/api/blog`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (blogRes) {
    const blogData = await blogRes.json().catch(() => null);
    if (blogData?.posts?.[0]?.id) {
      await testEndpoint('Blog Post Detail (first post)', `/api/blog/${blogData.posts[0].id}`, (res, body) => {
        if (res.status !== 200) return `Status ${res.status}`;
        if (!body.success) return `API returned success=false: ${body.error}`;
        if (!body.post?.title) return 'No post title';
        return null;
      });
    }
  }

  // Print results
  console.log('Results:\n');
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   URL: ${r.url}`);
    if (r.status) console.log(`   Status: ${r.status}`);
    if (r.error) console.log(`   Error: ${r.error}`);
    if (r.details) console.log(`   Details: ${r.details}`);
    console.log();
    if (r.passed) passed++;
    else failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
