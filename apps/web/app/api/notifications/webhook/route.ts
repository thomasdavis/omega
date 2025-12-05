import { NextRequest, NextResponse } from 'next/server';
import { createNotification, isUserNotificationEnabled } from '@repo/database/services/notificationService';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Extract user ID from GitHub issue/PR
 * This looks for the original requester in issue body or labels
 */
function extractRequesterId(payload: any): string | null {
  // Check if there's a "requested-by" label with user ID
  const labels = payload.issue?.labels || payload.pull_request?.labels || [];
  const requestedByLabel = labels.find((label: any) =>
    label.name.startsWith('requested-by:')
  );

  if (requestedByLabel) {
    return requestedByLabel.name.replace('requested-by:', '');
  }

  // Check issue/PR body for Discord user ID pattern
  const body = payload.issue?.body || payload.pull_request?.body || '';
  const userIdMatch = body.match(/Requested by: <@(\d+)>/);
  if (userIdMatch) {
    return userIdMatch[1];
  }

  return null;
}

/**
 * Determine if the event represents a completed feature
 */
function isFeatureComplete(payload: any): boolean {
  const action = payload.action;

  // PR merged
  if (payload.pull_request?.merged === true) {
    return true;
  }

  // Issue closed with specific labels
  if (
    action === 'closed' &&
    payload.issue
  ) {
    const labels = payload.issue.labels.map((l: any) => l.name.toLowerCase());
    return labels.includes('completed') || labels.includes('deployed');
  }

  return false;
}

/**
 * POST /api/notifications/webhook
 * GitHub webhook endpoint for feature completion events
 *
 * Expected headers:
 *   - x-github-event: event type (pull_request, issues, etc.)
 *   - x-hub-signature-256: HMAC signature for verification
 *
 * Expected payload: GitHub webhook payload
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';
    const githubEvent = request.headers.get('x-github-event') || '';

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && !verifyGitHubSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);

    // Only process relevant events
    if (!['pull_request', 'issues'].includes(githubEvent)) {
      return NextResponse.json({
        message: 'Event type not relevant for notifications',
      });
    }

    // Check if this represents a completed feature
    if (!isFeatureComplete(payload)) {
      return NextResponse.json({
        message: 'Event does not represent a completed feature',
      });
    }

    // Extract the original requester
    const requesterId = extractRequesterId(payload);
    if (!requesterId) {
      return NextResponse.json({
        message: 'Could not identify original requester',
      });
    }

    // Check if user has notifications enabled
    const notificationsEnabled = await isUserNotificationEnabled(requesterId);
    if (!notificationsEnabled) {
      return NextResponse.json({
        message: 'User has notifications disabled',
      });
    }

    // Determine source type and details
    const sourceType = payload.pull_request ? 'pr' : 'issue';
    const sourceId = payload.pull_request?.number || payload.issue?.number;
    const sourceUrl = payload.pull_request?.html_url || payload.issue?.html_url;
    const title = payload.pull_request?.title || payload.issue?.title;

    // Create notification
    const notification = await createNotification({
      userId: requesterId,
      eventType: 'feature_complete',
      sourceType,
      sourceId,
      sourceUrl,
      payload: {
        title,
        action: payload.action,
        repository: payload.repository?.full_name,
        sender: payload.sender?.login,
      },
    });

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      message: 'Notification created successfully',
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'github-notification-webhook',
    timestamp: new Date().toISOString(),
  });
}
