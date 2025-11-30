/**
 * Create Psycho Analysis Channel Tool
 * Creates a dedicated private channel for psychological analysis sessions
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client, ChannelType, PermissionFlagsBits } from 'discord.js';

// Store Discord client reference
let discordClient: Client | null = null;

export function setDiscordClient(client: Client) {
  discordClient = client;
}

export const createPsychoAnalysisChannelTool = tool({
  description: `Create a dedicated private channel for psycho-analysis sessions.

  This tool will:
  1. Check if Omega has admin/channel management permissions
  2. Create a private text channel named "psycho-analysis-{username}"
  3. Set permissions so only the user and Omega can see/use it
  4. Return the channel details

  If Omega lacks permissions, it will provide instructions for an admin (like ajaxdavis) to create the channel manually.

  Use when:
  - User requests a dedicated space for psychological analysis
  - Starting a psycho-analysis mode session
  - User wants privacy for deep psychological exploration`,

  inputSchema: z.object({
    userId: z.string().describe('Discord user ID to grant access'),
    username: z.string().describe('Discord username (for channel naming)'),
    guildId: z.string().describe('Discord server (guild) ID'),
  }),

  execute: async ({ userId, username, guildId }) => {
    console.log(`🏗️  Creating psycho-analysis channel for ${username} in guild ${guildId}`);

    if (!discordClient) {
      return {
        success: false,
        error: 'Discord client not available',
        message: 'Internal error: Discord client not initialized. Please contact the bot administrator.',
      };
    }

    try {
      // Get guild
      const guild = await discordClient.guilds.fetch(guildId);
      if (!guild) {
        return {
          success: false,
          error: 'Guild not found',
          message: `Could not find server with ID ${guildId}`,
        };
      }

      // Check bot permissions
      const botMember = await guild.members.fetch(discordClient.user!.id);
      const hasPermissions = botMember.permissions.has([
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
      ]);

      if (!hasPermissions) {
        console.log('⚠️  Omega lacks permission to create channels');
        return {
          success: false,
          needsAdmin: true,
          message: `I don't have permission to create channels on this server.

**Please ask an admin (like @ajaxdavis) to:**
1. Create a private text channel named \`psycho-analysis-${username.toLowerCase().replace(/\s+/g, '-')}\`
2. Set permissions so only you and I can see it
3. Use it for our deep psychological exploration sessions

Alternatively, an admin can grant me the "Manage Channels" permission to do this automatically.`,
        };
      }

      // Create channel with appropriate permissions
      const channelName = `psycho-analysis-${username.toLowerCase().replace(/\s+/g, '-')}`;

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Private psycho-analysis session for ${username}. Confidential psychological exploration using multiple frameworks.`,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone role
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: userId, // Target user
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: discordClient.user!.id, // Omega
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      console.log(`✅ Created psycho-analysis channel: ${channel.name} (${channel.id})`);

      return {
        success: true,
        channelId: channel.id,
        channelName: channel.name,
        channelMention: `<#${channel.id}>`,
        message: `✨ Created private psycho-analysis channel: <#${channel.id}>

This is your dedicated space for deep psychological exploration. Everything we discuss here is private between you and me.

I'm ready to begin whenever you are. We can explore:
- Jungian archetypes and shadow work
- Attachment patterns and relational dynamics
- Emotional intelligence development
- Cognitive and communication patterns
- Personal growth insights and recommendations

What would you like to explore first?`,
      };

    } catch (error) {
      console.error('❌ Error creating psycho-analysis channel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to create psycho-analysis channel: ${error instanceof Error ? error.message : 'Unknown error'}

Please ask an admin to create a private channel for our sessions, or check my permissions.`,
      };
    }
  },
});
