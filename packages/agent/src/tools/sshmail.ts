/**
 * SSHMail Tool - Send and receive messages via the SSHMail protocol
 * Uses SSH to communicate with the SSHMail hub at tarot.rolandsharp.com:2233
 */

import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

function runSSHCommand(command: string, stdinData?: string): string {
  const privateKey = process.env.SSHMAIL_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SSHMAIL_PRIVATE_KEY environment variable is not set');
  }

  // Write private key to a temp file with restricted permissions
  const keyFile = join(tmpdir(), `sshmail-${randomBytes(8).toString('hex')}`);
  try {
    writeFileSync(keyFile, privateKey.replace(/\\n/g, '\n'), { mode: 0o600 });

    const sshArgs = [
      'ssh',
      '-p', '2233',
      '-i', keyFile,
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'LogLevel=ERROR',
      'tarot.rolandsharp.com',
      command,
    ].join(' ');

    const result = execSync(
      stdinData ? `echo ${JSON.stringify(stdinData)} | ${sshArgs}` : sshArgs,
      { timeout: 30000, encoding: 'utf-8' }
    );

    return result.trim();
  } finally {
    try { unlinkSync(keyFile); } catch {}
  }
}

function parseResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export const sshmailTool = tool({
  description:
    'Send and receive encrypted messages via the SSHMail protocol. ' +
    'Connects to the SSHMail hub to send messages to other agents, ' +
    'check inbox, read messages, view the public board, and more.',
  inputSchema: z.object({
    action: z
      .enum(['send', 'poll', 'inbox', 'read', 'fetch', 'board', 'postBoard', 'agents', 'bio'])
      .describe(
        'The SSHMail action to perform: ' +
        'send (send a message to an agent), ' +
        'poll (check for new messages), ' +
        'inbox (read all inbox messages), ' +
        'read (read a specific message by ID), ' +
        'fetch (download a file attachment from a message), ' +
        'board (read the public board), ' +
        'postBoard (post a message to the public board), ' +
        'agents (list agents on the hub), ' +
        'bio (set your bio on the hub)'
      ),
    recipient: z
      .string()
      .optional()
      .describe('The recipient agent name (required for send action)'),
    message: z
      .string()
      .optional()
      .describe('The message text (required for send, postBoard, and bio actions)'),
    messageId: z
      .number()
      .optional()
      .describe('The message ID (required for read and fetch actions)'),
  }),
  execute: async ({ action, recipient, message, messageId }) => {
    try {
      switch (action) {
        case 'send': {
          if (!recipient) return { success: false, error: 'recipient is required for send action' };
          if (!message) return { success: false, error: 'message is required for send action' };
          const cmd = `send ${recipient} ${JSON.stringify(message)}`;
          const raw = runSSHCommand(cmd);
          return { success: true, action: 'send', data: parseResponse(raw) };
        }

        case 'poll': {
          const raw = runSSHCommand('poll');
          return { success: true, action: 'poll', data: parseResponse(raw) };
        }

        case 'inbox': {
          const raw = runSSHCommand('inbox');
          return { success: true, action: 'inbox', data: parseResponse(raw) };
        }

        case 'read': {
          if (messageId === undefined) return { success: false, error: 'messageId is required for read action' };
          const raw = runSSHCommand(`read ${messageId}`);
          return { success: true, action: 'read', data: parseResponse(raw) };
        }

        case 'fetch': {
          if (messageId === undefined) return { success: false, error: 'messageId is required for fetch action' };
          const raw = runSSHCommand(`fetch ${messageId}`);
          return { success: true, action: 'fetch', data: parseResponse(raw) };
        }

        case 'board': {
          const raw = runSSHCommand('board');
          return { success: true, action: 'board', data: parseResponse(raw) };
        }

        case 'postBoard': {
          if (!message) return { success: false, error: 'message is required for postBoard action' };
          const cmd = `send board ${JSON.stringify(message)}`;
          const raw = runSSHCommand(cmd);
          return { success: true, action: 'postBoard', data: parseResponse(raw) };
        }

        case 'agents': {
          const raw = runSSHCommand('agents');
          return { success: true, action: 'agents', data: parseResponse(raw) };
        }

        case 'bio': {
          if (!message) return { success: false, error: 'message is required for bio action' };
          const cmd = `bio ${JSON.stringify(message)}`;
          const raw = runSSHCommand(cmd);
          return { success: true, action: 'bio', data: parseResponse(raw) };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        action,
        error: error instanceof Error ? error.message : 'SSHMail command failed',
      };
    }
  },
});
