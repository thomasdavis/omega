#!/usr/bin/env tsx
/**
 * Functional tests for omegaai.dev live site endpoints.
 * Run: npx tsx apps/web/scripts/test-live-endpoints.ts [base-url]
 * Default base URL: https://omegaai.dev
 */

const BASE_URL = process.argv[2] || 'https://omegaai.dev';

interface TestResult {
  name: string;
  passed: boolean;
  status?: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error });
    console.log(`  ❌ ${name}: ${error}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function fetchJSON(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE_URL}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

async function fetchHead(path: string): Promise<{ status: number; contentType: string }> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'HEAD' });
  return { status: res.status, contentType: res.headers.get('content-type') || '' };
}

// --- Health & Status ---

async function testHealth() {
  console.log('\n📡 Health & Status');

  await test('GET /api/health returns 200', async () => {
    const { status, body } = await fetchJSON('/api/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.status === 'ok', `Expected status ok, got ${body.status}`);
  });

  await test('GET /api/status returns 200', async () => {
    const { status, body } = await fetchJSON('/api/status');
    assert(status === 200 || status === 503, `Expected 200 or 503, got ${status}`);
    assert(body.status !== undefined, 'Missing status field');
    assert(body.timestamp !== undefined, 'Missing timestamp field');
  });
}

// --- Blog ---

async function testBlog() {
  console.log('\n📝 Blog');

  await test('GET /api/blog returns 200 with posts array', async () => {
    const { status, body } = await fetchJSON('/api/blog');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, `Expected success=true, got ${body.success}: ${body.error || body.message || ''}`);
    assert(Array.isArray(body.posts), 'posts should be an array');
    assert(typeof body.count === 'number', 'count should be a number');
  });

  await test('Blog posts have required fields', async () => {
    const { body } = await fetchJSON('/api/blog');
    if (!body.success || body.posts.length === 0) {
      throw new Error('No blog posts available to validate');
    }
    const post = body.posts[0];
    assert(typeof post.id === 'string', 'post.id should be a string');
    assert(typeof post.title === 'string', 'post.title should be a string');
    assert(typeof post.date === 'string', 'post.date should be a string');
  });

  await test('Blog posts are sorted by date (newest first)', async () => {
    const { body } = await fetchJSON('/api/blog');
    if (!body.success || body.posts.length < 2) return; // Skip if not enough posts
    const dates = body.posts.map((p: any) => new Date(p.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      assert(dates[i - 1] >= dates[i], `Posts not sorted by date: ${body.posts[i - 1].date} < ${body.posts[i].date}`);
    }
  });

  await test('GET /api/blog/:id returns post detail', async () => {
    const { body: listBody } = await fetchJSON('/api/blog');
    if (!listBody.success || listBody.posts.length === 0) {
      throw new Error('No blog posts available to test detail endpoint');
    }
    const postId = listBody.posts[0].id;
    const { status, body } = await fetchJSON(`/api/blog/${postId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, `Expected success=true: ${body.error || ''}`);
    assert(typeof body.post.content === 'string', 'post.content should be a string');
    assert(body.post.content.length > 0, 'post.content should not be empty');
  });

  await test('GET /api/blog/:id returns 404 for non-existent post', async () => {
    const { status, body } = await fetchJSON('/api/blog/non-existent-post-12345');
    assert(status === 404, `Expected 404, got ${status}`);
    assert(body.success === false, 'Expected success=false for missing post');
  });

  await test('GET /blog page loads (HTML)', async () => {
    const res = await fetch(`${BASE_URL}/blog`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('text/html'), `Expected HTML, got ${contentType}`);
  });
}

// --- Comics ---

async function testComics() {
  console.log('\n🎨 Comics');

  await test('GET /api/comics returns 200 with comics array', async () => {
    const { status, body } = await fetchJSON('/api/comics');
    // Accept 200 (with comics) or 404 (no comics found)
    assert(status === 200 || status === 404, `Expected 200 or 404, got ${status}`);
    if (status === 200) {
      assert(body.success === true, `Expected success=true: ${body.error || ''}`);
      assert(Array.isArray(body.comics), 'comics should be an array');
    }
  });

  await test('Comics have required fields', async () => {
    const { status, body } = await fetchJSON('/api/comics');
    if (status !== 200 || !body.success || body.comics.length === 0) {
      throw new Error('No comics available to validate');
    }
    const comic = body.comics[0];
    assert(typeof comic.id === 'number', 'comic.id should be a number');
    assert(typeof comic.url === 'string', 'comic.url should be a string');
    assert(typeof comic.createdAt === 'string', 'comic.createdAt should be a string');
  });

  await test('Comic image/content is accessible', async () => {
    const { status, body } = await fetchJSON('/api/comics');
    if (status !== 200 || !body.success || body.comics.length === 0) {
      throw new Error('No comics available to test');
    }
    const comic = body.comics[0];
    const res = await fetch(`${BASE_URL}${comic.url}`);
    assert(res.status === 200, `Expected 200 for comic content, got ${res.status}`);
  });

  await test('GET /comics page loads (HTML)', async () => {
    const res = await fetch(`${BASE_URL}/comics`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('text/html'), `Expected HTML, got ${contentType}`);
  });
}

// --- Other Pages ---

async function testPages() {
  console.log('\n📄 Pages');

  const pages = [
    '/',
    '/blog',
    '/comics',
    '/messages',
    '/shared-links',
    '/tools',
    '/profiles',
    '/todos',
  ];

  for (const page of pages) {
    await test(`GET ${page} returns 200`, async () => {
      const res = await fetch(`${BASE_URL}${page}`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }
}

// --- Run all tests ---

async function main() {
  console.log(`\n🔍 Testing live endpoints at: ${BASE_URL}\n`);

  await testHealth();
  await testBlog();
  await testComics();
  await testPages();

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  ❌ ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
