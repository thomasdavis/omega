/**
 * Val Town Create Val Tool
 * Allows AI to create new vals on Val Town for rapid prototyping and deployment
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createVal, type CreateValRequest } from '../services/valTownService.js';

export const valTownCreateValTool = tool({
  description: `Create a new val on Val Town for rapid deployment without database migrations.

Use this when:
- User wants to quickly deploy a live webpage, API endpoint, or webhook
- User wants to prototype something without modifying the main codebase
- User wants to create a public-facing tool or service quickly
- User requests a bookmark page, dashboard, or data display page

Val types:
- "http": Web server (default) - responds to HTTP requests
- "script": Run on demand
- "email": Triggered by email
- "interval": Run on a schedule

Privacy levels:
- "public": Anyone can view and run
- "unlisted": Only people with the link can view (default)
- "private": Only you can view

Example use cases:
- Discord link bookmark page (searchable GUI)
- Webhook endpoint for receiving data
- API endpoint for serving data
- Quick prototype of a new feature
- Public dashboard or status page`,

  inputSchema: z.object({
    name: z
      .string()
      .describe(
        'Val name (alphanumeric and underscores only, e.g., "discord_bookmarks")'
      ),
    code: z
      .string()
      .describe(
        'JavaScript/TypeScript code for the val. For HTTP vals, export default a function that receives a Request and returns a Response.'
      ),
    privacy: z
      .enum(['public', 'unlisted', 'private'])
      .default('unlisted')
      .describe('Privacy level for the val'),
    readme: z
      .string()
      .optional()
      .describe('Optional markdown README to document the val'),
    type: z
      .enum(['script', 'http', 'email', 'interval'])
      .default('http')
      .describe('Type of val to create'),
  }),

  execute: async ({ name, code, privacy, readme, type }) => {
    console.log(`🚀 Creating Val Town val: ${name} (type: ${type})`);

    const request: CreateValRequest = {
      name,
      code,
      privacy,
      readme,
      type,
    };

    const result = await createVal(request);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create val',
        code: result.code,
      };
    }

    const val = result.data!;
    const valUrl = val.public_suffix_domain
      ? `https://${val.public_suffix_domain}`
      : `https://${val.author.username}-${val.name}.web.val.run`;

    return {
      success: true,
      message: `Val created successfully! 🎉`,
      val: {
        id: val.id,
        name: val.name,
        url: valUrl,
        privacy: val.privacy,
        type: type,
        author: val.author.username,
        createdAt: val.createdAt,
      },
      instructions: [
        `View your val at: ${valUrl}`,
        `Edit on Val Town: https://val.town/v/${val.author.username}/${val.name}`,
        privacy === 'public'
          ? 'Your val is public and discoverable on Val Town'
          : privacy === 'unlisted'
            ? 'Your val is unlisted - only people with the link can access it'
            : 'Your val is private - only you can access it',
      ],
    };
  },
});
