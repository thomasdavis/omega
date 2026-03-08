/**
 * SSHMail Tool - Send and receive messages via the SSHMail protocol
 * Uses ssh2 library to communicate with ssh.sshmail.dev
 * Requires SSHMAIL_PRIVATE_KEY environment variable
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Client } from 'ssh2';

const SSHMAIL_HOST = 'ssh.sshmail.dev';
const SSHMAIL_PORT = 2233;

/**
 * Execute an SSH command on the SSHMail server
 */
function execSSHCommand(
  command: string,
  privateKey: string,
  stdinData?: Buffer
): Promise<string> {
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
            resolve(stderr);
          }
          resolve(stdout);
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
 * Try to parse JSON from the SSH response, return raw string if not valid JSON
 */
function parseResponse(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return { message: 'No response' };
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some responses may be JSONL (one JSON per line)
    const lines = trimmed.split('\n').filter((l) => l.trim());
    if (lines.length > 1) {
      try {
        return lines.map((l) => JSON.parse(l));
      } catch {
        // Not JSON at all
      }
    }
    return { raw: trimmed };
  }
}

/**
 * Normalize a private key from environment variable storage.
 * Handles various formats: literal \n, double-escaped \\n, base64-encoded,
 * carriage returns, and other common env var encoding issues.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // If the key looks base64-encoded (no PEM headers), try decoding it
  if (!key.includes('-----') && !key.includes('\n')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf-8');
      if (decoded.includes('-----BEGIN')) {
        key = decoded;
      }
    } catch {
      // Not base64, continue with other normalization
    }
  }

  // Replace double-escaped newlines (\\n) first, then literal \n sequences
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

  // Remove carriage returns
  key = key.replace(/\r/g, '');

  // Ensure PEM headers/footers are on their own lines
  key = key
    .replace(/(-----BEGIN [A-Z ]+-----)/g, '$1\n')
    .replace(/(-----END [A-Z ]+-----)/g, '\n$1')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // Ensure trailing newline (required by some parsers)
  if (!key.endsWith('\n')) {
    key += '\n';
  }

  return key;
}

export const sshmailTool = tool({
  description:
    'Send and receive encrypted messages via the SSHMail protocol (ssh.sshmail.dev). Supports sending/receiving messages, checking inbox, reading the public board, managing groups/channels, and viewing agents.',
  inputSchema: z.object({
    action: z
      .enum([
        'send',
        'inbox',
        'poll',
        'read',
        'board',
        'agents',
        'pubkey',
        'bio',
        'keys',
        'group_create',
        'group_add',
        'group_remove',
        'group_members',
        'channel_create',
      ])
      .describe(
        'The SSHMail action to perform: send (message to agent/group/board), inbox (list messages), poll (check for new), read (specific message by id), board (public board), agents (list active agents), pubkey (get agent public key), bio (set your bio), keys (list your SSH keys), group_create/group_add/group_remove/group_members (group management), channel_create (create public channel)'
      ),
    recipient: z
      .string()
      .optional()
      .describe(
        'The recipient agent name, group name, or "board" for public posts. Required for send, pubkey actions.'
      ),
    message: z
      .string()
      .optional()
      .describe(
        'The message content to send. Required for send action. Also used as description for bio, group_create, channel_create.'
      ),
    messageId: z
      .number()
      .optional()
      .describe('The message ID to read. Required for read action.'),
    groupName: z
      .string()
      .optional()
      .describe(
        'Group or channel name. Required for group_create, group_add, group_remove, group_members, channel_create.'
      ),
    agentName: z
      .string()
      .optional()
      .describe(
        'Agent name for group operations. Required for group_add, group_remove, pubkey.'
      ),
  }),
  execute: async ({ action, recipient, message, messageId, groupName, agentName }) => {
    const privateKey = process.env.SSHMAIL_PRIVATE_KEY;
    if (!privateKey) {
      return {
        success: false,
        error: 'SSHMAIL_PRIVATE_KEY environment variable is not set',
      };
    }

    // Normalize the private key to handle various env var storage formats
    const normalizedKey = normalizePrivateKey(privateKey);

    try {
      let command: string;

      switch (action) {
        case 'send': {
          if (!recipient) {
            return { success: false, error: 'recipient is required for send action' };
          }
          if (!message) {
            return { success: false, error: 'message is required for send action' };
          }
          // Escape double quotes in the message
          const escapedMsg = message.replace(/"/g, '\\"');
          command = `send ${recipient} "${escapedMsg}"`;
          break;
        }

        case 'inbox':
          command = 'inbox';
          break;

        case 'poll':
          command = 'poll';
          break;

        case 'read': {
          if (messageId === undefined) {
            return { success: false, error: 'messageId is required for read action' };
          }
          command = `read ${messageId}`;
          break;
        }

        case 'board':
          command = 'board';
          break;

        case 'agents':
          command = 'agents';
          break;

        case 'pubkey': {
          const target = agentName || recipient;
          if (!target) {
            return {
              success: false,
              error: 'agentName or recipient is required for pubkey action',
            };
          }
          command = `pubkey ${target}`;
          break;
        }

        case 'bio': {
          if (!message) {
            return { success: false, error: 'message is required for bio action (the bio text)' };
          }
          const escapedBio = message.replace(/"/g, '\\"');
          command = `bio "${escapedBio}"`;
          break;
        }

        case 'keys':
          command = 'keys';
          break;

        case 'group_create': {
          if (!groupName) {
            return { success: false, error: 'groupName is required for group_create action' };
          }
          const desc = message ? ` "${message.replace(/"/g, '\\"')}"` : '';
          command = `group create ${groupName}${desc}`;
          break;
        }

        case 'group_add': {
          if (!groupName || !agentName) {
            return {
              success: false,
              error: 'groupName and agentName are required for group_add action',
            };
          }
          command = `group add ${groupName} ${agentName}`;
          break;
        }

        case 'group_remove': {
          if (!groupName || !agentName) {
            return {
              success: false,
              error: 'groupName and agentName are required for group_remove action',
            };
          }
          command = `group remove ${groupName} ${agentName}`;
          break;
        }

        case 'group_members': {
          if (!groupName) {
            return { success: false, error: 'groupName is required for group_members action' };
          }
          command = `group members ${groupName}`;
          break;
        }

        case 'channel_create': {
          if (!groupName) {
            return {
              success: false,
              error: 'groupName is required for channel_create (used as channel name)',
            };
          }
          const chanDesc = message ? ` "${message.replace(/"/g, '\\"')}"` : '';
          command = `channel ${groupName}${chanDesc}`;
          break;
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }

      console.log(`📧 SSHMail: executing "${command}"`);
      const raw = await execSSHCommand(command, normalizedKey);
      const result = parseResponse(raw);

      return {
        success: true,
        action,
        result,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'SSHMail command failed';
      console.error('SSHMail error:', errMsg);

      // Provide more helpful error messages for key-related issues
      if (errMsg.includes('privateKey') || errMsg.includes('key format')) {
        const keyPreview = normalizedKey.substring(0, 40);
        console.error(
          `SSHMail key debug: starts with "${keyPreview}...", length=${normalizedKey.length}, has header=${normalizedKey.includes('-----BEGIN')}`
        );
        return {
          success: false,
          action,
          error: `${errMsg}. The SSHMAIL_PRIVATE_KEY env var may be incorrectly formatted. Ensure it is a valid PEM-encoded private key (OpenSSH or RSA format). Check that the key was not truncated or corrupted when setting the environment variable.`,
        };
      }

      return {
        success: false,
        action,
        error: errMsg,
      };
    }
  },
});
