import { verifyKey } from 'discord-interactions.js';

/**
 * Reads the raw body from a Request object
 * This is necessary for Discord signature verification
 */
export async function getRawBody(req: Request): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) return '.js';

  const decoder = new TextDecoder();
  let body = '.js';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    body += decoder.decode(value, { stream: true });
  }

  return body;
}

/**
 * Verifies that a request came from Discord
 * Uses Ed25519 signature verification
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The x-signature-ed25519 header
 * @param timestamp - The x-signature-timestamp header
 * @param publicKey - Your Discord application's public key
 * @returns true if the signature is valid, false otherwise
 */
export async function verifyDiscordRequest(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    return await verifyKey(rawBody, signature, timestamp, publicKey);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Extracts and verifies Discord request headers
 * Returns null if headers are missing or invalid
 */
export async function verifyRequest(
  req: Request,
  publicKey: string
): Promise<{ body: string; isValid: boolean }> {
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) {
    console.error('Missing signature headers');
    return { body: '', isValid: false };
  }

  const rawBody = await getRawBody(req);
  const isValid = await verifyDiscordRequest(rawBody, signature, timestamp, publicKey);

  return { body: rawBody, isValid };
}
