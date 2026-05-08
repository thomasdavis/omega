import { tool } from 'ai';
import { z } from 'zod';
import type { Message, ThreadChannel } from 'discord.js';
import {
  getOpenCodeClient,
  isOpenCodeReady,
  pullLatest,
  commitAndPush,
  getDiffSummary,
} from '../services/opencodeService.js';
import { buildOpenCodePrompt } from './opencodeSystemPrompt.js';

let currentMessage: Message | null = null;

export function setOpenCodeContext(message: Message) {
  currentMessage = message;
}

export function clearOpenCodeContext() {
  currentMessage = null;
}

async function createThread(message: Message, task: string): Promise<ThreadChannel | null> {
  try {
    const threadName = `🔧 OpenCode: ${task.slice(0, 90)}`;
    const thread = await message.startThread({
      name: threadName,
      autoArchiveDuration: 60,
    });
    return thread;
  } catch {
    return null;
  }
}

async function sendToThread(thread: ThreadChannel | null, content: string): Promise<void> {
  if (!thread) return;
  try {
    const truncated = content.length > 1900 ? content.slice(0, 1900) + '...' : content;
    await thread.send(truncated);
  } catch {
    // Thread might be archived or deleted
  }
}

export const opencodeTool = tool({
  description: 'Invoke the OpenCode AI coding agent. It has full shell access and can: edit Omega\'s codebase and push changes for auto-deploy, query databases and generate reports, install software, run scripts, analyze data, or perform any complex multi-step task that requires file system and terminal access. Streams real-time progress to a Discord thread.',
  inputSchema: z.object({
    task: z.string().describe('Detailed description of the task. Can be coding work on the Omega codebase, database analysis, system administration, report generation, or any task requiring shell/file access.'),
  }),
  execute: async ({ task }) => {
    if (!isOpenCodeReady()) {
      return {
        success: false,
        error: 'OpenCode is not initialized. The repo may not be cloned or the server may not be running.',
      };
    }

    const client = getOpenCodeClient();
    let thread: ThreadChannel | null = null;

    try {
      // Pull latest before starting
      await pullLatest();

      // Create Discord thread for streaming
      if (currentMessage) {
        thread = await createThread(currentMessage, task);
        await sendToThread(thread, `🚀 **Starting OpenCode session**\n\`\`\`\n${task}\n\`\`\``);
      }

      // Create a new OpenCode session
      const sessionResult = await client.session.create({
        body: { title: `Discord: ${task.slice(0, 100)}` },
      });

      if (!sessionResult.data) {
        return { success: false, error: 'Failed to create OpenCode session' };
      }

      const sessionId = sessionResult.data.id;
      await sendToThread(thread, `📋 Session created: \`${sessionId}\``);

      // Process events while waiting for completion
      const filesEdited = new Set<string>();
      const commandsRun: string[] = [];
      let isComplete = false;
      let lastEventTime = Date.now();
      const EVENT_TIMEOUT = 5 * 60 * 1000;

      // Subscribe to SSE events before sending prompt
      const eventResult = await client.global.event();

      const processEvents = async () => {
        try {
          for await (const event of eventResult.stream) {
            lastEventTime = Date.now();
            const payload = event as any;

            switch (payload.type) {
              case 'file.edited':
                filesEdited.add(payload.properties?.file || 'unknown');
                await sendToThread(thread, `✏️ Edited: \`${payload.properties?.file}\``);
                break;

              case 'command.executed':
                if (payload.properties?.sessionID === sessionId) {
                  const cmd = payload.properties?.name || '';
                  commandsRun.push(cmd);
                  await sendToThread(thread, `🔨 Running: \`${cmd}\``);
                }
                break;

              case 'session.idle':
                if (payload.properties?.sessionID === sessionId) {
                  isComplete = true;
                  return;
                }
                break;

              case 'session.error':
                if (payload.properties?.sessionID === sessionId) {
                  await sendToThread(thread, `❌ Error: ${JSON.stringify(payload.properties)}`);
                  isComplete = true;
                  return;
                }
                break;

              case 'message.part.updated':
                if (payload.properties?.delta && payload.properties.delta.length > 100) {
                  const preview = payload.properties.delta.slice(0, 200);
                  await sendToThread(thread, `💬 ${preview}...`);
                }
                break;
            }
          }
        } catch {
          // Stream ended
        }
      };

      // Send the prompt (blocks until complete)
      const promptPromise = client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: 'text' as const, text: buildOpenCodePrompt(task) }],
        },
      });

      // Race: event processing + prompt completion + timeout
      const timeoutPromise = new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (isComplete || Date.now() - lastEventTime > EVENT_TIMEOUT) {
            clearInterval(check);
            resolve();
          }
        }, 5000);
      });

      await Promise.race([
        Promise.all([processEvents(), promptPromise]),
        timeoutPromise,
      ]);

      // Commit and push changes
      const diffSummary = getDiffSummary();
      const commitMessage = `feat: ${task.slice(0, 72)}\n\nAutomated by OpenCode via Discord`;
      const { commitSha, commitUrl } = await commitAndPush(commitMessage);

      if (commitSha) {
        await sendToThread(thread, [
          `✅ **Changes committed and pushed**`,
          `📊 ${diffSummary}`,
          `🔗 ${commitUrl}`,
          `🚀 Railway will auto-deploy from main`,
        ].join('\n'));
      } else {
        await sendToThread(thread, '⚠️ No changes were made to the codebase.');
      }

      return {
        success: true,
        filesEdited: Array.from(filesEdited),
        filesEditedCount: filesEdited.size,
        commandsRun,
        commitSha: commitSha || null,
        commitUrl: commitUrl || null,
        diffSummary,
        message: commitSha
          ? `Successfully edited ${filesEdited.size} file(s) and pushed to main. Railway will auto-deploy.`
          : 'OpenCode session completed but no files were changed.',
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await sendToThread(thread, `❌ **OpenCode failed:** ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  },
});
