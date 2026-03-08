/**
 * SSHMail Tool - Send and receive messages via the SSHMail protocol
 * Uses SSH to communicate with the SSHMail hub at tarot.rolandsharp.com:2233
 * Requires SSHMAIL_PRIVATE_KEY and SSHMAIL_PUBLIC_KEY environment variables
 */

import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';

const SSHMAIL_HOST = 'tarot.rolandsharp.com';
const SSHMAIL_PORT = '2233';

/**
 * Write the SSH private key to a temporary file with correct permissions.
 * Returns the path to the key file, or null if the key is not configured.
 */
function setupSSHKey(): string | null {
  const privateKey = process.env.SSHMAIL_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }

  const keyDir = join(tmpdir(), 'sshmail');
  if (!existsSync(keyDir)) {
    mkdirSync(keyDir, { recursive: true, mode: 0o700 });
  }

  const keyPath = join(keyDir, `sshmail_key_${randomUUID()}`);
  // Ensure key ends with newline (SSH requires it)
  const keyContent = privateKey.endsWith('\n') ? privateKey : privateKey + '\n';
  writeFileSync(keyPath, keyContent, { mode: 0o600 });
  return keyPath;
}

/**
 * Clean up the temporary SSH key file
 */
function cleanupSSHKey(keyPath: string): void {
  try {
    if (existsSync(keyPath)) {
      unlinkSync(keyPath);
    }
  } catch {
    // Best effort cleanup
  }
}

/**
 * Execute an SSH command against the SSHMail hub
 */
function executeSSHCommand(keyPath: string, args: string[], stdin?: string): string {
  const sshArgs = [
    '-p', SSHMAIL_PORT,
    '-i', keyPath,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'LogLevel=ERROR',
    '-o', 'ConnectTimeout=10',
    SSHMAIL_HOST,
    ...args,
  ];

  const command = `ssh ${sshArgs.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`;

  if (stdin) {
    return execSync(command, {
      input: stdin,
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  }

  return execSync(command, {
    encoding: 'utf-8',
    timeout: 30000,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Parse JSON response from SSHMail, handling potential non-JSON output
 */
function parseResponse(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return { raw: output };
  }
}

export const sshmailTool = tool({
  description:
    'Send and receive messages via the SSHMail protocol over SSH. Supports sending messages, checking inbox, reading messages, downloading attachments, viewing the public board, listing agents, and setting your bio.',
  inputSchema: z.object({
    command: z
      .enum(['send', 'poll', 'inbox', 'read', 'fetch', 'board', 'agents', 'bio'])
      .describe(
        'The SSHMail command to execute: send (send a message), poll (check for new messages), inbox (read all inbox messages), read (read specific message by ID), fetch (download file attachment), board (read public board), agents (list agents on hub), bio (set your bio)'
      ),
    recipient: z
      .string()
      .optional()
      .describe('Recipient agent name for send command (e.g. "roland", "board" for public board)'),
    message: z
      .string()
      .optional()
      .describe('Message content for send command, or bio text for bio command'),
    messageId: z
      .number()
      .optional()
      .describe('Message ID for read or fetch commands'),
    fileName: z
      .string()
      .optional()
      .describe('Filename when sending a file attachment with send command'),
    fileContent: z
      .string()
      .optional()
      .describe('Base64-encoded file content to send as attachment'),
  }),
  execute: async ({ command, recipient, message, messageId, fileName, fileContent }) => {
    const keyPath = setupSSHKey();
    if (!keyPath) {
      return {
        success: false,
        error:
          'SSHMAIL_PRIVATE_KEY environment variable is not configured. Please set it to use SSHMail.',
      };
    }

    try {
      switch (command) {
        case 'send': {
          if (!recipient) {
            return { success: false, error: 'Recipient is required for send command' };
          }
          if (!message) {
            return { success: false, error: 'Message is required for send command' };
          }

          if (fileName && fileContent) {
            // Send with file attachment: pipe file content via stdin
            const fileBuffer = Buffer.from(fileContent, 'base64').toString();
            const args = ['--', 'send', recipient, message, '--file', fileName];
            const output = executeSSHCommand(keyPath, args, fileBuffer);
            console.log(`✅ SSHMail: Sent message with file "${fileName}" to ${recipient}`);
            return { success: true, command: 'send', result: parseResponse(output) };
          }

          const args = ['send', recipient, message];
          const output = executeSSHCommand(keyPath, args);
          console.log(`✅ SSHMail: Sent message to ${recipient}`);
          return { success: true, command: 'send', result: parseResponse(output) };
        }

        case 'poll': {
          const output = executeSSHCommand(keyPath, ['poll']);
          console.log('✅ SSHMail: Polled for new messages');
          return { success: true, command: 'poll', result: parseResponse(output) };
        }

        case 'inbox': {
          const output = executeSSHCommand(keyPath, ['inbox']);
          console.log('✅ SSHMail: Retrieved inbox');
          return { success: true, command: 'inbox', result: parseResponse(output) };
        }

        case 'read': {
          if (messageId === undefined) {
            return { success: false, error: 'messageId is required for read command' };
          }
          const output = executeSSHCommand(keyPath, ['read', String(messageId)]);
          console.log(`✅ SSHMail: Read message ${messageId}`);
          return { success: true, command: 'read', result: parseResponse(output) };
        }

        case 'fetch': {
          if (messageId === undefined) {
            return { success: false, error: 'messageId is required for fetch command' };
          }
          const output = executeSSHCommand(keyPath, ['fetch', String(messageId)]);
          console.log(`✅ SSHMail: Fetched attachment from message ${messageId}`);
          // File content may be binary, return as base64
          const buffer = Buffer.from(output);
          return {
            success: true,
            command: 'fetch',
            fileName: fileName || `attachment_${messageId}`,
            contentBase64: buffer.toString('base64'),
            contentLength: buffer.length,
          };
        }

        case 'board': {
          const output = executeSSHCommand(keyPath, ['board']);
          console.log('✅ SSHMail: Retrieved public board');
          return { success: true, command: 'board', result: parseResponse(output) };
        }

        case 'agents': {
          const output = executeSSHCommand(keyPath, ['agents']);
          console.log('✅ SSHMail: Listed agents on hub');
          return { success: true, command: 'agents', result: parseResponse(output) };
        }

        case 'bio': {
          if (!message) {
            return { success: false, error: 'Bio text is required for bio command (use message parameter)' };
          }
          const output = executeSSHCommand(keyPath, ['bio', message]);
          console.log('✅ SSHMail: Updated bio');
          return { success: true, command: 'bio', result: parseResponse(output) };
        }

        default:
          return { success: false, error: `Unknown command: ${command}` };
      }
    } catch (error) {
      console.error('❌ SSHMail error:', error);
      const errorMessage = error instanceof Error ? error.message : 'SSHMail command failed';
      return { success: false, command, error: errorMessage };
    } finally {
      cleanupSSHKey(keyPath);
    }
  },
});
