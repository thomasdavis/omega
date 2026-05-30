const DONTO_MEMORY_URL = process.env.DONTO_MEMORY_URL || 'https://memories.apexpots.com/memorize';
const HOLDER = process.env.DONTO_MEMORY_HOLDER || 'agent:omega-bot';

export interface MemorizeOptions {
  username: string;
  channelName: string;
  channelId: string;
  guildId?: string;
  messageContent: string;
  messageId: string;
}

export function memorizeDiscordMessage(opts: MemorizeOptions): void {
  if (!opts.messageContent || opts.messageContent.trim().length === 0) return;

  const sessionId = opts.guildId
    ? `discord:${opts.guildId}:${opts.channelId}`
    : `discord:dm:${opts.channelId}`;

  const text = `${opts.username} in #${opts.channelName}: ${opts.messageContent}`;

  fetch(DONTO_MEMORY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      holder: HOLDER,
      session_id: sessionId,
      text,
      mode: 'single',
    }),
  }).catch((err) => {
    console.error('⚠️  Failed to save to donto memory:', err instanceof Error ? err.message : err);
  });
}
