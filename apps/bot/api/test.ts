/**
 * Simple test endpoint to verify basic setup
 */

export default async function handler(req: Request): Promise<Response> {
  console.log('[TEST] Handler started');

  return Response.json({
    success: true,
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    env: {
      hasDiscordAppId: !!process.env.DISCORD_APP_ID,
      hasDiscordBotToken: !!process.env.DISCORD_BOT_TOKEN,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    },
  });
}
