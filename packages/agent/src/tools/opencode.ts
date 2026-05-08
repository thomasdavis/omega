import { tool } from 'ai';
import { z } from 'zod';
import { spawn } from 'child_process';
import type { Message, ThreadChannel } from 'discord.js';
import {
  isOpenCodeReady,
  getRepoPath,
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
    const safeName = task.replace(/[^\w\s-]/g, '').trim().slice(0, 80);
    const threadName = `OpenCode: ${safeName || 'task'}`;
    console.log(`[OpenCode] Creating thread: "${threadName}"`);
    const thread = await message.startThread({
      name: threadName,
      autoArchiveDuration: 60,
    });
    console.log(`[OpenCode] Thread created: ${thread.id}`);
    return thread;
  } catch (err) {
    console.error('[OpenCode] Failed to create thread:', err instanceof Error ? err.message : err);
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

function buildOpencodeConfig(): string {
  return JSON.stringify({
    provider: {
      'z-ai': {
        api: 'openai',
        options: {
          apiKey: process.env.GLM_API_KEY || '',
          baseURL: 'https://api.z.ai/api/coding/paas/v4',
        },
        models: {
          'glm-4.7': { id: 'glm-4.7', name: 'GLM-4.7' },
        },
      },
    },
    model: 'z-ai/glm-4.7',
  });
}

interface OpenCodeResult {
  output: string;
  filesEdited: string[];
  exitCode: number;
}

type EventCallback = (type: string, summary: string) => void;

function runOpenCodeCli(
  prompt: string,
  cwd: string,
  timeoutMs: number,
  onEvent?: EventCallback,
): Promise<OpenCodeResult> {
  return new Promise((resolve, reject) => {
    const config = buildOpencodeConfig();

    const proc = spawn('opencode', [
      'run',
      '--dangerously-skip-permissions',
      '--format', 'json',
      prompt,
    ], {
      cwd,
      env: {
        ...process.env,
        OPENCODE_CONFIG_CONTENT: config,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    const filesEdited = new Set<string>();
    const textParts: string[] = [];

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;

      for (const line of text.split('\n').filter(Boolean)) {
        try {
          const event = JSON.parse(line);

          if (event.type === 'text' && event.part?.text) {
            textParts.push(event.part.text);
            onEvent?.('text', event.part.text);
          } else if (event.type === 'tool_invocation' || event.type === 'tool-invocation') {
            const inv = event.part?.toolInvocation || event.part || {};
            const toolName = inv.toolName || inv.name || 'unknown';
            const args = inv.args || {};

            if (toolName === 'read' || toolName === 'readFile') {
              const file = args.filePath || args.file_path || args.path || '';
              onEvent?.('read', `📂 Reading: \`${file}\``);
            } else if (toolName === 'write' || toolName === 'writeFile') {
              const file = args.filePath || args.file_path || args.path || '';
              filesEdited.add(file);
              onEvent?.('write', `✏️ Writing: \`${file}\``);
            } else if (toolName === 'edit') {
              const file = args.filePath || args.file_path || args.path || '';
              filesEdited.add(file);
              onEvent?.('edit', `✏️ Editing: \`${file}\``);
            } else if (toolName === 'bash' || toolName === 'shell') {
              const cmd = (args.command || '').slice(0, 150);
              console.log(`[OpenCode] 🔨 ${cmd}`);
              onEvent?.('bash', `🔨 Running: \`${cmd}\``);
            } else if (toolName === 'glob' || toolName === 'find') {
              onEvent?.('find', `🔍 Searching: \`${args.pattern || args.query || toolName}\``);
            } else if (toolName === 'grep') {
              onEvent?.('grep', `🔍 Grep: \`${args.pattern || args.query || ''}\``);
            } else {
              onEvent?.('tool', `🔧 ${toolName}`);
            }
          } else if (event.type === 'tool_result' || event.type === 'tool-result') {
            // tool finished - no need to stream this
          } else if (event.type === 'step_start') {
            onEvent?.('step', '⏳ Thinking...');
          } else if (event.type === 'error') {
            const msg = event.error?.data?.message || event.error?.name || 'Unknown error';
            onEvent?.('error', `❌ ${msg}`);
          }
        } catch {
          // not JSON
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.error(`[OpenCode] stderr: ${text.slice(0, 200)}`);
    });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`OpenCode timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        output: textParts.join('\n') || stdout.slice(0, 2000),
        filesEdited: Array.from(filesEdited),
        exitCode: code || 0,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
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
        error: 'OpenCode is not initialized. The repo may not be cloned yet.',
      };
    }

    let thread: ThreadChannel | null = null;
    const repoPath = getRepoPath();
    const TIMEOUT = 10 * 60 * 1000;

    try {
      console.log('[OpenCode] Pulling latest...');
      await pullLatest();
      console.log('[OpenCode] Pull complete');

      if (currentMessage) {
        thread = await createThread(currentMessage, task);
        await sendToThread(thread, `🚀 **Starting OpenCode session**\n\`\`\`\n${task}\n\`\`\``);
      }

      console.log('[OpenCode] Running opencode CLI...');
      await sendToThread(thread, '🤖 Running OpenCode agent (GLM-4.7)...');

      const prompt = buildOpenCodePrompt(task);

      // Buffer events and flush to Discord periodically to avoid rate limits
      const eventBuffer: string[] = [];
      let flushTimer: ReturnType<typeof setInterval> | null = null;

      const flushToThread = async () => {
        if (eventBuffer.length === 0) return;
        const batch = eventBuffer.splice(0, eventBuffer.length);
        await sendToThread(thread, batch.join('\n'));
      };

      flushTimer = setInterval(flushToThread, 3000);

      const onEvent: EventCallback = (type, summary) => {
        if (type === 'text') {
          // Text output - post immediately if substantial
          if (summary.length > 50) {
            eventBuffer.push(`💬 ${summary.slice(0, 300)}`);
          }
        } else if (type === 'step') {
          // Skip noisy step events
        } else {
          eventBuffer.push(summary);
        }
      };

      const result = await runOpenCodeCli(prompt, repoPath, TIMEOUT, onEvent);

      // Final flush
      if (flushTimer) clearInterval(flushTimer);
      await flushToThread();

      console.log(`[OpenCode] CLI exited with code ${result.exitCode}`);
      console.log(`[OpenCode] Output length: ${result.output.length}`);
      console.log(`[OpenCode] Files edited: ${result.filesEdited.length}`);

      // Post final response
      if (result.output) {
        const preview = result.output.length > 1800 ? result.output.slice(0, 1800) + '...' : result.output;
        await sendToThread(thread, `📝 **OpenCode response:**\n${preview}`);
      }

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
        await sendToThread(thread, '✅ Task completed. No file changes were made.');
      }

      return {
        success: true,
        output: result.output.slice(0, 1000),
        filesEdited: result.filesEdited,
        filesEditedCount: result.filesEdited.length,
        commitSha: commitSha || null,
        commitUrl: commitUrl || null,
        diffSummary,
        message: commitSha
          ? `Edited ${result.filesEdited.length} file(s) and pushed to main. Railway will auto-deploy.`
          : 'Task completed. ' + (result.output ? result.output.slice(0, 300) : 'No output.'),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[OpenCode] Error: ${errorMsg}`);
      await sendToThread(thread, `❌ **OpenCode failed:** ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  },
});
