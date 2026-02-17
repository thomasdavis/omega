import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GITHUB_REPO = 'thomasdavis/omega';

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
  'Deployment.building': { color: 0x3498db, emoji: '🔨', title: 'Building' },
  'Deployment.deploying': { color: 0x3498db, emoji: '🚀', title: 'Deploying' },
  'Deployment.deployed': { color: 0x2ecc71, emoji: '✅', title: 'Deployed successfully' },
  'Deployment.redeployed': { color: 0x2ecc71, emoji: '✅', title: 'Redeployed successfully' },
  'Deployment.failed': { color: 0xe74c3c, emoji: '❌', title: 'Deployment failed' },
  'Deployment.crashed': { color: 0xe67e22, emoji: '💥', title: 'Crashed' },
  'Deployment.oom_killed': { color: 0xe74c3c, emoji: '💀', title: 'OOM killed' },
  'Deployment.removed': { color: 0x95a5a6, emoji: '🗑️', title: 'Deployment removed' },
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
  if (['Deployment.failed', 'Deployment.crashed', 'Deployment.oom_killed'].includes(payload.type)) {
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

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord webhook failed: ${response.status} — ${errorText}`);
      return NextResponse.json({ error: 'Discord webhook failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, type: payload.type });
  } catch (error) {
    console.error('Failed to send Discord webhook:', error);
    return NextResponse.json({ error: 'Failed to send webhook' }, { status: 502 });
  }
}
