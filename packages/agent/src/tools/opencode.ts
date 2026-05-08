import { tool } from 'ai';
import { z } from 'zod';
import { spawn } from 'child_process';
import type { Message, ThreadChannel } from 'discord.js';
import {
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

function runOpenCodeCli(prompt: string, cwd: string, timeoutMs: number): Promise<OpenCodeResult> {
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
    let stderr = '';
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
          } else if (event.type === 'tool-invocation' || event.type === 'tool_invocation') {
            const toolName = event.part?.toolInvocation?.toolName || event.part?.name || '';
            const filePath = event.part?.toolInvocation?.args?.filePath ||
                            event.part?.toolInvocation?.args?.file_path ||
                            event.part?.toolInvocation?.args?.path || '';
            if (filePath) filesEdited.add(filePath);
            if (toolName === 'bash' || toolName === 'shell') {
              const cmd = event.part?.toolInvocation?.args?.command || '';
              if (cmd) console.log(`[OpenCode] 🔨 ${cmd.slice(0, 100)}`);
            }
          }
        } catch {
          // not JSON, skip
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
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
    const REPO_PATH = '/data/omega-repo';
    const TIMEOUT = 10 * 60 * 1000; // 10 minutes

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
      const result = await runOpenCodeCli(prompt, REPO_PATH, TIMEOUT);

      console.log(`[OpenCode] CLI exited with code ${result.exitCode}`);
      console.log(`[OpenCode] Output length: ${result.output.length}`);
      console.log(`[OpenCode] Files edited: ${result.filesEdited.length}`);

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
