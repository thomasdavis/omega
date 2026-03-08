/**
 * SSHMail Tool - Send and receive messages via the SSHMail protocol
 * Connects to an encrypted message hub at tarot.rolandsharp.com:2233 via SSH
 * Uses the ssh2 library for programmatic SSH connectivity
 *
 * Environment variables:
 * - SSHMAIL_PRIVATE_KEY: SSH private key for authentication
 * - SSHMAIL_PUBLIC_KEY: SSH public key (optional, for reference)
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client } from 'ssh2';

const SSHMAIL_HOST = 'tarot.rolandsharp.com';
const SSHMAIL_PORT = 2233;

/**
 * Execute an SSH command against the SSHMail server
 * Returns the stdout output as a string
 */
async function executeSSHCommand(
  command: string,
  stdinData?: Buffer
): Promise<string> {
  const privateKey = process.env.SSHMAIL_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      'SSHMAIL_PRIVATE_KEY environment variable is not set. Cannot authenticate with SSHMail server.'
    );
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('SSH connection timed out after 30 seconds'));
    }, 30000);

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          reject(err);
          return;
        }

        stream.on('close', () => {
          clearTimeout(timeout);
          conn.end();
          if (stderr && !stdout) {
            reject(new Error(stderr.trim()));
          } else {
            resolve(stdout.trim());
          }
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        if (stdinData) {
          stream.write(stdinData);
          stream.end();
        }
      });
    });

    conn.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    conn.connect({
      host: SSHMAIL_HOST,
      port: SSHMAIL_PORT,
      username: 'omega',
      privateKey,
    });
  });
}

/**
 * Parse JSON response from SSHMail server, with fallback for non-JSON output
 */
function parseResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export const sshmailTool = tool({
  description:
    'Interact with the SSHMail encrypted message hub. Supports sending messages, reading inbox, polling for new messages, reading the public board, and managing your profile. All communication is over SSH.',
  inputSchema: z.object({
    action: z
      .enum([
        'send',
        'poll',
        'inbox',
        'read',
        'fetch',
        'board',
        'postBoard',
        'agents',
        'bio',
      ])
      .describe(
        'The SSHMail command to execute: send (message to agent), poll (check new messages), inbox (list messages), read (specific message), fetch (download attachment), board (read public board), postBoard (post to public board), agents (list agents on hub), bio (set your bio)'
      ),
    recipient: z
      .string()
      .optional()
      .describe('The recipient agent name (required for send action)'),
    message: z
      .string()
      .optional()
      .describe(
        'The message content (required for send/postBoard/bio actions)'
      ),
    messageId: z
      .number()
      .optional()
      .describe(
        'The message ID (required for read and fetch actions)'
      ),
    fileName: z
      .string()
      .optional()
      .describe('Filename for file attachment when sending (optional for send action)'),
    fileContent: z
      .string()
      .optional()
      .describe(
        'Base64-encoded file content to send as attachment (optional, used with fileName)'
      ),
  }),
  execute: async ({ action, recipient, message, messageId, fileName, fileContent }) => {
    try {
      switch (action) {
        case 'send': {
          if (!recipient) {
            return { success: false, error: 'Recipient is required for send action' };
          }
          if (!message) {
            return { success: false, error: 'Message is required for send action' };
          }

          let command = `send ${recipient} "${message.replace(/"/g, '\\"')}"`;
          let stdinData: Buffer | undefined;

          if (fileName && fileContent) {
            command += ` --file ${fileName}`;
            stdinData = Buffer.from(fileContent, 'base64');
          }

          const result = await executeSSHCommand(command, stdinData);
          return {
            success: true,
            action: 'send',
            recipient,
            response: parseResponse(result),
          };
        }

        case 'poll': {
          const result = await executeSSHCommand('poll');
          return {
            success: true,
            action: 'poll',
            response: parseResponse(result),
          };
        }

        case 'inbox': {
          const result = await executeSSHCommand('inbox');
          return {
            success: true,
            action: 'inbox',
            response: parseResponse(result),
          };
        }

        case 'read': {
          if (messageId === undefined) {
            return { success: false, error: 'Message ID is required for read action' };
          }
          const result = await executeSSHCommand(`read ${messageId}`);
          return {
            success: true,
            action: 'read',
            messageId,
            response: parseResponse(result),
          };
        }

        case 'fetch': {
          if (messageId === undefined) {
            return { success: false, error: 'Message ID is required for fetch action' };
          }
          const result = await executeSSHCommand(`fetch ${messageId}`);
          // fetch returns raw file data - encode as base64
          const base64 = Buffer.from(result).toString('base64');
          return {
            success: true,
            action: 'fetch',
            messageId,
            fileBase64: base64,
            byteLength: Buffer.from(result).length,
          };
        }

        case 'board': {
          const result = await executeSSHCommand('board');
          return {
            success: true,
            action: 'board',
            response: parseResponse(result),
          };
        }

        case 'postBoard': {
          if (!message) {
            return { success: false, error: 'Message is required for postBoard action' };
          }
          const result = await executeSSHCommand(
            `send board "${message.replace(/"/g, '\\"')}"`
          );
          return {
            success: true,
            action: 'postBoard',
            response: parseResponse(result),
          };
        }

        case 'agents': {
          const result = await executeSSHCommand('agents');
          return {
            success: true,
            action: 'agents',
            response: parseResponse(result),
          };
        }

        case 'bio': {
          if (!message) {
            return { success: false, error: 'Bio text is required for bio action' };
          }
          const result = await executeSSHCommand(
            `bio "${message.replace(/"/g, '\\"')}"`
          );
          return {
            success: true,
            action: 'bio',
            response: parseResponse(result),
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      console.error('SSHMail error:', error);
      return {
        success: false,
        action,
        error: error instanceof Error ? error.message : 'SSHMail command failed',
      };
    }
  },
});
