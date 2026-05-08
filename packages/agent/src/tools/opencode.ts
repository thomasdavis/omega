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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
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
      console.log('[OpenCode] Pulling latest...');
      await withTimeout(pullLatest(), 30_000, 'git pull');
      console.log('[OpenCode] Pull complete');

      if (currentMessage) {
        thread = await createThread(currentMessage, task);
        await sendToThread(thread, `🚀 **Starting OpenCode session**\n\`\`\`\n${task}\n\`\`\``);
      }

      console.log('[OpenCode] Creating session...');
      const sessionResult = await withTimeout(
        client.session.create({ body: { title: `Discord: ${task.slice(0, 100)}` } }),
        15_000,
        'session.create',
      );

      if (!sessionResult.data) {
        console.error('[OpenCode] session.create returned no data:', sessionResult);
        return { success: false, error: `Failed to create OpenCode session: ${JSON.stringify(sessionResult.error || 'no data')}` };
      }

      const sessionId = sessionResult.data.id;
      console.log(`[OpenCode] Session created: ${sessionId}`);
      await sendToThread(thread, `📋 Session created: \`${sessionId}\``);

      const filesEdited = new Set<string>();
      const commandsRun: string[] = [];
      let isComplete = false;

      // Send the prompt — this blocks until the LLM finishes all steps
      console.log('[OpenCode] Sending prompt...');
      await sendToThread(thread, '🤖 Sending task to OpenCode agent...');

      const promptResult = await withTimeout(
        client.session.prompt({
          path: { id: sessionId },
          body: {
            parts: [{ type: 'text' as const, text: buildOpenCodePrompt(task) }],
          },
        }),
        5 * 60 * 1000, // 5 min timeout
        'session.prompt',
      );

      console.log('[OpenCode] Prompt completed');
      isComplete = true;

      // Extract results from the prompt response
      const response = promptResult.data;
      let responseText = '';
      if (response && 'parts' in (response as any)) {
        const parts = (response as any).parts || [];
        for (const part of parts) {
          if (part.type === 'text') {
            responseText += part.text + '\n';
          } else if (part.type === 'tool-invocation') {
            const toolName = part.toolInvocation?.toolName || part.name || 'unknown';
            if (toolName === 'write' || toolName === 'edit') {
              const filePath = part.toolInvocation?.args?.filePath || part.args?.file_path || '';
              filesEdited.add(filePath);
            }
            commandsRun.push(toolName);
          }
        }
      }

      // Post response summary to thread
      if (responseText) {
        const preview = responseText.length > 1800 ? responseText.slice(0, 1800) + '...' : responseText;
        await sendToThread(thread, `📝 **OpenCode response:**\n${preview}`);
      }

      // Check for file changes via git
      const diffSummary = getDiffSummary();
      console.log(`[OpenCode] Diff summary: ${diffSummary}`);

      // Commit and push if there are changes
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
        await sendToThread(thread, '✅ Task completed. No file changes were made.');
      }

      return {
        success: true,
        responsePreview: responseText.slice(0, 500),
        filesEdited: Array.from(filesEdited),
        filesEditedCount: filesEdited.size,
        commandsRun,
        commitSha: commitSha || null,
        commitUrl: commitUrl || null,
        diffSummary,
        message: commitSha
          ? `Successfully edited ${filesEdited.size} file(s) and pushed to main. Railway will auto-deploy.`
          : 'OpenCode session completed. ' + (responseText ? responseText.slice(0, 300) : 'No output.'),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[OpenCode] Error: ${errorMsg}`);
      await sendToThread(thread, `❌ **OpenCode failed:** ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  },
});
