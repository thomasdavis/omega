/**
 * Simplified Command Registration - No imports
 */

export default async function handler(req: Request): Promise<Response> {
  console.log('[REGISTER-SIMPLE] Handler started');

  try {
    const appId = process.env.DISCORD_APP_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    console.log('[REGISTER-SIMPLE] Environment check:', {
      hasAppId: !!appId,
      hasToken: !!botToken,
    });

    if (!appId || !botToken) {
      console.error('[REGISTER-SIMPLE] Missing env vars');
      return Response.json(
        {
          success: false,
          error: 'Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN',
        },
        { status: 500 }
      );
    }

    const commands = [
      {
        name: 'ask',
        description: 'Ask the AI anything',
        options: [
          {
            type: 3, // STRING
            name: 'prompt',
            description: 'Your question',
            required: true,
          },
        ],
      },
      {
        name: 'help',
        description: 'Show help',
      },
    ];

    console.log('[REGISTER-SIMPLE] Calling Discord API...');

    const url = `https://discord.com/api/v10/applications/${appId}/commands`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify(commands),
    });

    console.log('[REGISTER-SIMPLE] Discord API response:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[REGISTER-SIMPLE] Discord API error:', error);
      return Response.json(
        {
          success: false,
          error: `Discord API error: ${error}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[REGISTER-SIMPLE] Success!');

    return Response.json({
      success: true,
      message: 'Commands registered successfully!',
      commands: result,
    });
  } catch (error) {
    console.error('[REGISTER-SIMPLE] Exception:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
