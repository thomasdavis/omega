/**
 * GET /api/status
 * Returns current agent runtime status
 * Safe for public exposure - no secrets, no PII
 */

import { NextResponse } from 'next/server';
import { statusManager } from '@repo/agent/lib/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = statusManager.getSnapshot();

    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      {
        state: 'error',
        error: 'Failed to fetch status',
        uptimeSec: 0,
        version: '1.0.0',
        startedAt: Date.now(),
        elapsedMs: 0,
      },
      { status: 500 }
    );
  }
}
