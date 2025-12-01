import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Try to read from bot's public directory
    const botPublicPath = join(process.cwd(), '..', 'bot', 'public', 'BUILD-TIMESTAMP.txt');

    if (existsSync(botPublicPath)) {
      const timestamp = readFileSync(botPublicPath, 'utf-8');
      return new NextResponse(timestamp, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    // Fallback: return current timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000).toString();
    return new NextResponse(currentTimestamp, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error reading BUILD-TIMESTAMP:', error);
    const fallbackTimestamp = Math.floor(Date.now() / 1000).toString();
    return new NextResponse(fallbackTimestamp, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
