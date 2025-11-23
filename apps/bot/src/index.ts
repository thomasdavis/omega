/**
 * Discord AI Bot - Main Entry Point
 * Uses Gateway API to listen to messages and AI SDK v6 for agent protocol
 */

import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import dotenv from 'dotenv';
import { handleMessage } from './handlers/messageHandler.js';
import { startArtifactServer } from './server/artifactServer.js';
import { initializeStorage } from './utils/storage.js';
import { initializeDatabase, closeDatabase } from './database/client.js';
import { initializeSchema } from './database/schema.js';
import { initializeScheduler } from './services/scheduler.js';
import { initializePusher } from './lib/pusher.js';
import { initializeErrorMonitoring } from './services/errorMonitoringService.js';

dotenv.config();

// Initialize persistent storage directories
initializeStorage();

// Initialize database
try {
  initializeDatabase();
  await initializeSchema();
  console.log('✅ Database initialized and ready');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

// Validate environment variables
if (!process.env.DISCORD_BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required');
  process.exit(1);
}

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required to read message content
    GatewayIntentBits.DirectMessages,
  ],
});

// Initialize Pusher for real-time collaboration
initializePusher();

// Initialize error monitoring and GitHub issue automation
initializeErrorMonitoring();

// Start artifact preview server
// Railway requires listening on PORT env var for healthchecks
const artifactPort = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : (process.env.ARTIFACT_SERVER_PORT
      ? parseInt(process.env.ARTIFACT_SERVER_PORT, 10)
      : 3001);
startArtifactServer({ port: artifactPort });

// Bot ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Bot is online as ${readyClient.user.tag}`);
  console.log(`📊 Connected to ${readyClient.guilds.cache.size} servers`);
  console.log(`🤖 Using AI SDK v6 with agent protocol`);

  // Initialize scheduled tasks (daily blog generation, etc.)
  initializeScheduler();
});

// Message create event - handle all messages
client.on(Events.MessageCreate, async (message: Message) => {
  try {
    await handleMessage(message);
  } catch (error) {
    console.error('Error handling message:', error);
    // Don't crash the bot on errors
  }
});

// Error handling
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  client.destroy();
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  client.destroy();
  await closeDatabase();
  process.exit(0);
});

// Connect to Discord
console.log('🔌 Connecting to Discord Gateway...');
client.login(process.env.DISCORD_BOT_TOKEN);
