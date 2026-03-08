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
 * Normalize a private key from environment variable format to proper PEM format.
 * Handles: literal \n, \\n, base64-encoded keys, space-separated, carriage returns,
 * missing line breaks around headers, and missing trailing newline.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Step 1: Handle double-escaped newlines (\\n -> \n)
  if (key.includes('\\\\n')) {
    key = key.replace(/\\\\n/g, '\n');
  }

  // Step 2: Handle literal \n escape sequences (from env vars)
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  // Step 3: Remove carriage returns
  key = key.replace(/\r/g, '');

  // Step 4: If key now looks like valid PEM, clean it up
  if (key.includes('-----BEGIN')) {
    // Ensure headers are on their own lines
    key = key.replace(/(-----BEGIN [A-Z ]+-----)/g, '\n$1\n');
    key = key.replace(/(-----END [A-Z ]+-----)/g, '\n$1\n');

    // Remove blank lines and normalize
    const lines = key.split('\n').filter((l) => l.trim() !== '');
    key = lines.join('\n') + '\n';
    return key;
  }

  // Step 5: Try base64 decode if it doesn't look like PEM
  try {
    const decoded = Buffer.from(key, 'base64').toString('utf-8');
    if (decoded.includes('-----BEGIN')) {
      // Recursively normalize the decoded result
      return normalizePrivateKey(decoded);
    }
  } catch {
    // Not valid base64, continue
  }

  // Step 6: Maybe the key is the raw PEM body without headers?
  // Try wrapping it as an OpenSSH key
  if (/^[A-Za-z0-9+/=\s]+$/.test(key) && key.length > 100) {
    // Could be base64 key body - try wrapping as OpenSSH private key
    const wrapped = `-----BEGIN OPENSSH PRIVATE KEY-----\n${key.replace(/\s+/g, '\n').match(/.{1,70}/g)?.join('\n') ?? key}\n-----END OPENSSH PRIVATE KEY-----\n`;
    return wrapped;
  }

  // Return as-is if no normalization matched
  return key;
}

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
    const privateKeyEnv = process.env.SSHMAIL_PRIVATE_KEY;
    if (!privateKeyEnv) {
      return {
        success: false,
        error: 'SSHMAIL_PRIVATE_KEY environment variable is not set',
      };
    }

    const normalizedKey = normalizePrivateKey(privateKeyEnv);

    // Validate that the normalized key looks like a valid PEM key
    if (!normalizedKey.includes('-----BEGIN')) {
      console.error('SSHMail: Normalized key does not contain PEM header.');
      console.error(`SSHMail: Raw env var length: ${privateKeyEnv.length}, starts with: "${privateKeyEnv.substring(0, 30)}..."`);
      console.error(`SSHMail: Normalized key length: ${normalizedKey.length}, starts with: "${normalizedKey.substring(0, 40)}..."`);
      return {
        success: false,
        error: 'SSHMAIL_PRIVATE_KEY could not be normalized to a valid PEM format. Check the environment variable value.',
      };
    }

    // Log key diagnostics (non-sensitive info only)
    const keyLines = normalizedKey.split('\n').filter((l) => l.trim());
    console.log(`📧 SSHMail: Key normalized - ${keyLines.length} lines, header: "${keyLines[0]}", footer: "${keyLines[keyLines.length - 1]}"`);

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

      // If key parsing fails, log diagnostic info to help debug
      if (errMsg.includes('privateKey') || errMsg.includes('key format')) {
        const keyLines = normalizedKey.split('\n').filter((l) => l.trim());
        console.error(`SSHMail key debug: ${keyLines.length} lines, total length: ${normalizedKey.length}`);
        console.error(`SSHMail key header: "${keyLines[0]}"`);
        console.error(`SSHMail key footer: "${keyLines[keyLines.length - 1]}"`);
        console.error(`SSHMail raw env starts with: "${privateKeyEnv.substring(0, 40)}..."`);
        console.error(`SSHMail raw env length: ${privateKeyEnv.length}`);
      }

      return {
        success: false,
        action,
        error: errMsg,
      };
    }
  },
});
