import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GITHUB_REPO = 'thomasdavis/omega';
const GITHUB_API = 'https://api.github.com';
const ERROR_EVENTS = ['Deployment.failed', 'Deployment.crashed', 'Deployment.oom_killed'];

// In-memory cooldown: max 1 issue per service per hour
const issueCooldowns = new Map<string, number>();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

interface RailwayWebhookPayload {
  type: string;
  details?: {
    commitHash?: string;
    commitAuthor?: string;
    commitMessage?: string;
    branch?: string;
    error?: string;
  };
  resource?: {
    service?: { name?: string };
    environment?: { name?: string };
  };
  severity?: string;
  timestamp?: string;
}

interface EmbedConfig {
  color: number;
  emoji: string;
  title: string;
}

const EVENT_MAP: Record<string, EmbedConfig> = {
  'Deployment.building': { color: 0x3498db, emoji: '\u{1F528}', title: 'Building' },
  'Deployment.deploying': { color: 0x3498db, emoji: '\u{1F680}', title: 'Deploying' },
  'Deployment.deployed': { color: 0x2ecc71, emoji: '\u2705', title: 'Deployed successfully' },
  'Deployment.redeployed': { color: 0x2ecc71, emoji: '\u2705', title: 'Redeployed successfully' },
  'Deployment.failed': { color: 0xe74c3c, emoji: '\u274C', title: 'Deployment failed' },
  'Deployment.crashed': { color: 0xe67e22, emoji: '\u{1F4A5}', title: 'Crashed' },
  'Deployment.oom_killed': { color: 0xe74c3c, emoji: '\u{1F480}', title: 'OOM killed' },
  'Deployment.removed': { color: 0x95a5a6, emoji: '\u{1F5D1}\uFE0F', title: 'Deployment removed' },
};

function buildEmbed(payload: RailwayWebhookPayload) {
  const config = EVENT_MAP[payload.type];
  if (!config) return null;

  const serviceName = payload.resource?.service?.name ?? 'unknown service';
  const environment = payload.resource?.environment?.name ?? 'unknown';
  const branch = payload.details?.branch;
  const commitHash = payload.details?.commitHash;
  const commitAuthor = payload.details?.commitAuthor;
  const commitMessage = payload.details?.commitMessage;

  const title = `${config.emoji} ${serviceName} — ${config.title}`;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Service', value: serviceName, inline: true },
    { name: 'Environment', value: environment, inline: true },
  ];

  if (branch) {
    fields.push({ name: 'Branch', value: `\`${branch}\``, inline: true });
  }

  if (commitHash) {
    const shortHash = commitHash.substring(0, 7);
    const commitUrl = `https://github.com/${GITHUB_REPO}/commit/${commitHash}`;
    let commitValue = `[\`${shortHash}\`](${commitUrl})`;
    if (commitAuthor) {
      commitValue += ` by ${commitAuthor}`;
    }
    fields.push({ name: 'Commit', value: commitValue, inline: true });
  }

  if (commitMessage) {
    // Extract PR number from "(#123)" pattern and link it
    const formatted = commitMessage.replace(
      /\(#(\d+)\)/g,
      `([#$1](https://github.com/${GITHUB_REPO}/pull/$1))`
    );
    fields.push({ name: 'Message', value: formatted });
  }

  if (payload.details?.error) {
    fields.push({ name: 'Error', value: `\`\`\`\n${payload.details.error.substring(0, 1000)}\n\`\`\`` });
  }

  // Add Railway dashboard link on failure/crash/OOM
  if (ERROR_EVENTS.includes(payload.type)) {
    fields.push({
      name: 'Logs',
      value: `[View on Railway](https://railway.com/project)`,
    });
  }

  return {
    title,
    color: config.color,
    fields,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

// --- GitHub issue creation for error events ---

function isOnCooldown(serviceName: string): boolean {
  const lastCreated = issueCooldowns.get(serviceName);
  if (!lastCreated) return false;
  return Date.now() - lastCreated < COOLDOWN_MS;
}

function setCooldown(serviceName: string) {
  issueCooldowns.set(serviceName, Date.now());
}

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
}

async function findExistingIssue(
  token: string,
  serviceName: string
): Promise<GitHubIssue | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/issues?labels=railway-error&state=open&per_page=50`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) return null;

  const issues: Array<{ number: number; title: string; html_url: string }> = await res.json();
  // Match by service name in the title prefix: "[Railway Error] <service>:"
  return issues.find((i) => i.title.includes(`[Railway Error] ${serviceName}:`)) ?? null;
}

async function addCommentToIssue(
  token: string,
  issueNumber: number,
  payload: RailwayWebhookPayload
): Promise<void> {
  const timestamp = payload.timestamp ?? new Date().toISOString();
  const error = payload.details?.error ?? 'No error details';
  const commitHash = payload.details?.commitHash;
  const shortHash = commitHash ? commitHash.substring(0, 7) : 'unknown';
  const commitUrl = commitHash
    ? `https://github.com/${GITHUB_REPO}/commit/${commitHash}`
    : '';

  const body = [
    `## Recurrence — ${payload.type}`,
    `**Time**: ${timestamp}`,
    '',
    '### Error',
    '```',
    error.substring(0, 1500),
    '```',
    '',
    commitUrl ? `**Commit**: [\`${shortHash}\`](${commitUrl})` : '',
    '',
    '@claude This error has recurred. Please review and investigate.',
  ]
    .filter(Boolean)
    .join('\n');

  await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
}

async function createIssue(
  token: string,
  payload: RailwayWebhookPayload
): Promise<GitHubIssue | null> {
  const serviceName = payload.resource?.service?.name ?? 'unknown service';
  const environment = payload.resource?.environment?.name ?? 'production';
  const error = payload.details?.error ?? 'No error details available';
  const timestamp = payload.timestamp ?? new Date().toISOString();
  const commitHash = payload.details?.commitHash;
  const commitAuthor = payload.details?.commitAuthor;
  const commitMessage = payload.details?.commitMessage;

  const shortError = error.substring(0, 60).replace(/\n/g, ' ');
  const title = `[Railway Error] ${serviceName}: ${shortError}`;

  let commitSection = '';
  if (commitHash) {
    const shortHash = commitHash.substring(0, 7);
    const commitUrl = `https://github.com/${GITHUB_REPO}/commit/${commitHash}`;
    commitSection = `### Commit\n[\`${shortHash}\`](${commitUrl})`;
    if (commitAuthor) commitSection += ` by ${commitAuthor}`;
    if (commitMessage) commitSection += ` — ${commitMessage}`;
    commitSection += '\n';
  }

  const body = [
    '## Railway Deployment Error',
    '',
    `**Service**: ${serviceName} | **Environment**: ${environment}`,
    `**Event**: ${payload.type} | **Time**: ${timestamp}`,
    '',
    '### Error',
    '```',
    error.substring(0, 2000),
    '```',
    '',
    commitSection,
    '### Instructions',
    'Investigate this deployment failure. Check the error message and recent',
    'commits for root cause. Implement a fix if possible.',
    '',
    '[View Railway Logs](https://railway.com/project)',
    '',
    '@claude',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      labels: ['railway-error', 'automated', 'bug'],
    }),
  });

  if (!res.ok) {
    console.error(`GitHub issue creation failed: ${res.status} ${await res.text()}`);
    return null;
  }

  return res.json();
}

async function handleErrorEvent(
  payload: RailwayWebhookPayload,
  webhookUrl: string
): Promise<{ issueNumber?: number; action?: string }> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.log('GITHUB_TOKEN not set — skipping GitHub issue creation');
    return {};
  }

  const serviceName = payload.resource?.service?.name ?? 'unknown service';

  // Cooldown check
  if (isOnCooldown(serviceName)) {
    console.log(`Issue cooldown active for ${serviceName} — skipping`);
    return {};
  }

  try {
    // Check for existing open issue for this service
    const existing = await findExistingIssue(githubToken, serviceName);

    let issueNumber: number;
    let issueUrl: string;
    let action: string;

    if (existing) {
      // Add comment to existing issue
      await addCommentToIssue(githubToken, existing.number, payload);
      issueNumber = existing.number;
      issueUrl = existing.html_url;
      action = 'commented';
    } else {
      // Create new issue
      const issue = await createIssue(githubToken, payload);
      if (!issue) return {};
      issueNumber = issue.number;
      issueUrl = issue.html_url;
      action = 'created';
    }

    setCooldown(serviceName);

    // Post secondary Discord embed about the issue
    const issueEmbed = {
      title: `\u{1F527} Issue #${issueNumber} ${action} — Claude is investigating`,
      url: issueUrl,
      color: 0x9b59b6, // purple
      fields: [
        { name: 'Service', value: serviceName, inline: true },
        { name: 'Action', value: action === 'created' ? 'New issue created' : 'Comment added to existing issue', inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [issueEmbed] }),
    }).catch((err) => console.error('Failed to send issue Discord embed:', err));

    return { issueNumber, action };
  } catch (error) {
    console.error('GitHub issue handling failed:', error);
    return {};
  }
}

// --- Main handler ---

export async function POST(request: NextRequest) {
  // Optional secret validation
  const secret = process.env.RAILWAY_WEBHOOK_SECRET;
  if (secret) {
    const providedSecret = request.nextUrl.searchParams.get('secret');
    if (providedSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const webhookUrl = process.env.DISCORD_DEPLOY_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_DEPLOY_WEBHOOK_URL is not configured');
    return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  let payload: RailwayWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Ignore non-deployment events
  if (!payload.type?.startsWith('Deployment.')) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const embed = buildEmbed(payload);
  if (!embed) {
    console.log(`Unhandled Railway deployment event: ${payload.type}`, JSON.stringify(payload));
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Always send the Discord error/status embed first
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord webhook failed: ${response.status} — ${errorText}`);
    }
  } catch (error) {
    console.error('Failed to send Discord webhook:', error);
  }

  // For error events, create/update a GitHub issue (non-blocking)
  let issueResult = {};
  if (ERROR_EVENTS.includes(payload.type)) {
    issueResult = await handleErrorEvent(payload, webhookUrl);
  }

  return NextResponse.json({ ok: true, type: payload.type, ...issueResult });
}
