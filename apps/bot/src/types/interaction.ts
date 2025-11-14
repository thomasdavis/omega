import type { DiscordInteraction } from './discord.js';

export type CommandHandler = (interaction: DiscordInteraction) => Promise<void>;

export interface CommandDefinition {
  name: string;
  description: string;
  handler: CommandHandler;
}

export interface PersonalityMode {
  name: string;
  systemPrompt: string;
  temperature?: number;
}

export interface AIConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface BotConfig {
  discordPublicKey: string;
  discordBotToken: string;
  discordAppId: string;
  openaiApiKey: string;
}
