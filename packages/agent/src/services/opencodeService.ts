import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const REPO_PATH = '/data/omega-repo';
const GITHUB_REPO = process.env.GITHUB_REPO || 'thomasdavis/omega';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

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
}

export async function initializeOpenCode(): Promise<void> {
  try {
    ensureRepo();
    if (existsSync(join(REPO_PATH, '.git'))) {
      console.log('✅ OpenCode ready (repo at /data/omega-repo)');
    } else {
      console.warn('⚠️ No repo at /data/omega-repo — OpenCode unavailable');
    }
  } catch (err) {
    console.error('❌ Failed to initialize OpenCode:', err);
  }
}

export function isOpenCodeReady(): boolean {
  return existsSync(join(REPO_PATH, '.git'));
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
  // No server to shut down — CLI-based approach
}
