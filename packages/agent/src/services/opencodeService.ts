import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { OpencodeClient } from '@opencode-ai/sdk';

const REPO_PATH = '/data/omega-repo';
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENCODE_PORT = 4096;

let opencodeClient: OpencodeClient | null = null;
let opencodeServer: { url: string; close(): void } | null = null;

function git(cmd: string, cwd = REPO_PATH): string {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8', timeout: 60_000 }).trim();
}

export function ensureRepo(): void {
  if (!GITHUB_TOKEN) {
    console.warn('⚠️ GITHUB_TOKEN not set — OpenCode repo clone skipped');
    return;
  }

  const repoUrl = `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git`;

  if (existsSync(join(REPO_PATH, '.git'))) {
    console.log('📂 Repo exists at /data/omega-repo, pulling latest...');
    try {
      git('fetch origin main');
      git('reset --hard origin/main');
      console.log('✅ Repo updated to latest main');
    } catch (err) {
      console.error('❌ Failed to update repo:', err);
    }
  } else {
    console.log('📥 Cloning repo to /data/omega-repo...');
    execSync(`git clone --depth 50 ${repoUrl} ${REPO_PATH}`, {
      encoding: 'utf-8',
      timeout: 120_000,
    });
    console.log('✅ Repo cloned');
  }

  git('config user.name "Omega Bot"');
  git('config user.email "omega@bot.dev"');

  writeOpencodeConfig();
}

function writeOpencodeConfig(): void {
  const configPath = join(REPO_PATH, 'opencode.json');
  const config: Record<string, unknown> = {
    provider: {
      'z-ai': {
        api: 'openai',
        options: {
          apiKey: '{env:GLM_API_KEY}',
          baseURL: 'https://api.z.ai/api/coding/paas/v4',
        },
        models: {
          'glm-4.7': { id: 'glm-4.7', name: 'GLM-4.7' },
        },
      },
    },
    model: 'z-ai/glm-4.7',
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export async function initializeOpenCode(): Promise<void> {
  try {
    ensureRepo();

    if (!existsSync(join(REPO_PATH, '.git'))) {
      console.warn('⚠️ No repo at /data/omega-repo — OpenCode initialization skipped');
      return;
    }

    process.env.OPENCODE_PROJECT_DIR = REPO_PATH;
    const { createOpencode } = await import('@opencode-ai/sdk');
    const result = await createOpencode({
      port: OPENCODE_PORT,
      hostname: '127.0.0.1',
      timeout: 30_000,
    });

    opencodeClient = result.client;
    opencodeServer = result.server;

    console.log(`✅ OpenCode server initialized at ${result.server.url}`);
  } catch (err) {
    console.error('❌ Failed to initialize OpenCode:', err);
  }
}

export function getOpenCodeClient(): OpencodeClient {
  if (!opencodeClient) {
    throw new Error('OpenCode not initialized. Call initializeOpenCode() first.');
  }
  return opencodeClient;
}

export function isOpenCodeReady(): boolean {
  return opencodeClient !== null && existsSync(join(REPO_PATH, '.git'));
}

export async function pullLatest(): Promise<void> {
  git('fetch origin main');
  git('reset --hard origin/main');
}

export async function commitAndPush(message: string): Promise<{ commitSha: string; commitUrl: string }> {
  git('add -A');

  const status = git('status --porcelain');
  if (!status) {
    return { commitSha: '', commitUrl: '' };
  }

  git(`commit -m "${message.replace(/"/g, '\\"')}"`);
  git('push origin main');

  const commitSha = git('rev-parse HEAD');
  const commitUrl = `https://github.com/${GITHUB_REPO}/commit/${commitSha}`;

  return { commitSha, commitUrl };
}

export function getDiffSummary(): string {
  try {
    return git('diff --stat HEAD~1');
  } catch {
    return 'No changes';
  }
}

export function shutdownOpenCode(): void {
  if (opencodeServer) {
    opencodeServer.close();
    opencodeServer = null;
    opencodeClient = null;
    console.log('🔌 OpenCode server shut down');
  }
}
