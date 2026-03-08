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
 * Railway and other platforms may store keys in various formats:
 * - Literal \n sequences instead of actual newlines
 * - Double-escaped \\n sequences
 * - Base64-encoded entire key
 * - Carriage returns from Windows
 * - Single-line with spaces instead of newlines
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Check if the entire key is base64-encoded (no PEM headers present)
  if (!key.includes('-----') && /^[A-Za-z0-9+/=\s]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf-8');
      if (decoded.includes('-----BEGIN')) {
        key = decoded;
      }
    } catch {
      // Not base64, continue with other normalization
    }
  }

  // Handle double-escaped newlines (\\n in the actual string)
  key = key.replace(/\\\\n/g, '\n');

  // Handle literal \n sequences (single-escaped)
  key = key.replace(/\\n/g, '\n');

  // Remove carriage returns
  key = key.replace(/\r/g, '');

  // Ensure PEM headers/footers are on their own lines
  key = key.replace(/(-----BEGIN [A-Z ]+-----)\s*/g, '$1\n');
  key = key.replace(/\s*(-----END [A-Z ]+-----)/g, '\n$1');

  // Clean up multiple consecutive newlines in the body (but preserve header/footer separation)
  const lines = key.split('\n').filter((line) => line.trim() !== '' || line === '');
  const cleanedLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      cleanedLines.push(trimmed);
    }
  }
  key = cleanedLines.join('\n');

  // Ensure trailing newline (required by some SSH parsers)
  if (!key.endsWith('\n')) {
    key += '\n';
  }

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
    const privateKey = process.env.SSHMAIL_PRIVATE_KEY;
    if (!privateKey) {
      return {
        success: false,
        error: 'SSHMAIL_PRIVATE_KEY environment variable is not set',
      };
    }

    // Normalize the private key from env var format to proper PEM
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
      const errorMsg = error instanceof Error ? error.message : 'SSHMail command failed';
      console.error('SSHMail error:', errorMsg);

      // Log diagnostic info for key parsing errors
      if (errorMsg.includes('privateKey') || errorMsg.includes('key format')) {
        const keyPreview = normalizedKey.substring(0, 40);
        const keyLength = normalizedKey.length;
        const hasBeginHeader = normalizedKey.includes('-----BEGIN');
        const hasEndHeader = normalizedKey.includes('-----END');
        const lineCount = normalizedKey.split('\n').length;
        console.error(
          `SSHMail key diagnostic: length=${keyLength}, lines=${lineCount}, ` +
            `hasBegin=${hasBeginHeader}, hasEnd=${hasEndHeader}, preview="${keyPreview}..."`
        );
      }

      return {
        success: false,
        action,
        error: errorMsg,
      };
    }
  },
});
