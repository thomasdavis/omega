import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Send notification to Discord user
 */
async function sendFeatureCompleteNotification(
  userId: string,
  username: string,
  issueNumber: number,
  issueTitle: string,
  prUrl: string,
  commitSha: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Import Discord service dynamically to avoid circular dependencies
    const { postToDiscordChannel } = await import(
      '@repo/agent'
    );

    const OMEGA_CHANNEL_ID = process.env.DISCORD_OMEGA_CHANNEL_ID || '1207025062006030356';

    const message = `Hi <@${userId}>! Your requested feature **${issueTitle}** (issue #${issueNumber}) has been completed and merged! 🎉\n\n✅ **Merged PR:** ${prUrl}\n📝 **Commit:** \`${commitSha.substring(0, 7)}\`\n\nThe feature is now deployed and ready to use!`;

    const result = await postToDiscordChannel({
      channelId: OMEGA_CHANNEL_ID,
      content: message,
    });

    return result;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle PR merged event
 */
async function handlePullRequestMerged(payload: any) {
  const prNumber = payload.pull_request?.number;
  const prUrl = payload.pull_request?.html_url;
  const commitSha = payload.pull_request?.merge_commit_sha;
  const prTitle = payload.pull_request?.title;

  if (!prNumber || !prUrl || !commitSha) {
    console.log('Missing PR information in webhook payload');
    return { success: false, message: 'Missing PR information' };
  }

  console.log(`Processing merged PR #${prNumber}: ${prTitle}`);

  // Extract issue number from PR title or body
  // Common formats: "Fixes #123", "Closes #123", "#123"
  const issueRegex = /(?:fix|fixes|close|closes|resolve|resolves|#)\s*#?(\d+)/i;
  const titleMatch = prTitle?.match(issueRegex);
  const bodyMatch = payload.pull_request?.body?.match(issueRegex);
  const issueNumber = titleMatch?.[1] || bodyMatch?.[1];

  if (!issueNumber) {
    console.log(`No issue number found in PR #${prNumber}`);
    return { success: false, message: 'No associated issue found' };
  }

  // Look up feature request
  const featureRequest = await prisma.featureRequest.findFirst({
    where: {
      githubIssueNumber: parseInt(issueNumber),
    },
  });

  if (!featureRequest) {
    console.log(`No feature request found for issue #${issueNumber}`);
    return { success: false, message: 'No feature request found' };
  }

  // Update feature request with completion details
  await prisma.featureRequest.update({
    where: { id: featureRequest.id },
    data: {
      status: 'completed',
      githubPrNumber: prNumber,
      completedAt: BigInt(Math.floor(Date.now() / 1000)),
      mergedPrUrl: prUrl,
      mergedCommitSha: commitSha,
      updatedAt: BigInt(Math.floor(Date.now() / 1000)),
    },
  });

  // Check if user wants notifications
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: featureRequest.requesterUserId },
  });

  if (!userProfile?.notifyOnFeatureComplete) {
    console.log(`User ${featureRequest.requesterUserId} has notifications disabled`);
    await prisma.notification.create({
      data: {
        userId: featureRequest.requesterUserId,
        username: featureRequest.requesterUsername,
        eventType: 'feature_complete',
        payload: {
          issueNumber: parseInt(issueNumber),
          prNumber,
          prUrl,
          commitSha,
          title: featureRequest.title,
        },
        sentAt: BigInt(Math.floor(Date.now() / 1000)),
        status: 'skipped',
        errorMessage: 'User has notifications disabled',
      },
    });
    return { success: true, message: 'Notification skipped (user preference)' };
  }

  // Send notification
  const notificationResult = await sendFeatureCompleteNotification(
    featureRequest.requesterUserId,
    featureRequest.requesterUsername || 'User',
    parseInt(issueNumber),
    featureRequest.title,
    prUrl,
    commitSha
  );

  // Log notification attempt
  await prisma.notification.create({
    data: {
      userId: featureRequest.requesterUserId,
      username: featureRequest.requesterUsername,
      eventType: 'feature_complete',
      payload: {
        issueNumber: parseInt(issueNumber),
        prNumber,
        prUrl,
        commitSha,
        title: featureRequest.title,
      },
      sentAt: BigInt(Math.floor(Date.now() / 1000)),
      status: notificationResult.success ? 'sent' : 'failed',
      errorMessage: notificationResult.error || null,
      discordMessageId: notificationResult.messageId || null,
    },
  });

  return {
    success: notificationResult.success,
    message: notificationResult.success
      ? 'Notification sent successfully'
      : `Notification failed: ${notificationResult.error}`,
  };
}

/**
 * POST /api/webhooks/github-events
 * Handles GitHub webhook events for PR merges and CI checks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = JSON.parse(body);

    // Verify webhook signature if secret is configured
    const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
    if (GITHUB_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      const isValid = verifyGitHubSignature(body, signature, GITHUB_WEBHOOK_SECRET);

      if (!isValid) {
        console.error('Invalid GitHub webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Get event type from header
    const eventType = request.headers.get('x-github-event');

    console.log(`Received GitHub webhook: ${eventType}`);

    // Handle pull_request events
    if (eventType === 'pull_request' && payload.action === 'closed' && payload.pull_request?.merged) {
      const result = await handlePullRequestMerged(payload);
      return NextResponse.json(result);
    }

    // Handle workflow_run events (CI checks)
    if (eventType === 'workflow_run' && payload.action === 'completed' && payload.workflow_run?.conclusion === 'success') {
      // Note: In a full implementation, we'd check if this is related to a recently merged PR
      // and only send notification after both PR merge AND CI success
      // For now, we trigger on PR merge only
      return NextResponse.json({ success: true, message: 'CI check passed' });
    }

    return NextResponse.json({
      success: true,
      message: `Event ${eventType} received but not processed`,
    });
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
