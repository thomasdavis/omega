# Dockerfile for Discord AI Bot on Railway
# Build from repository root context
# Now includes packages directory for monorepo workspace packages

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy ALL packages (required for @repo/* dependencies)
COPY packages ./packages

# Copy bot package
COPY apps/bot ./apps/bot

# Install dependencies (will install packages too)
RUN pnpm install --frozen-lockfile

# Build packages first (dependencies)
RUN pnpm build --filter=@repo/shared
RUN pnpm build --filter=@repo/database
RUN pnpm build --filter=@repo/agent

# Build bot
WORKDIR /app/apps/bot
RUN pnpm run build

# Production image
FROM node:20-alpine

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files for workspace
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/agent/package.json ./packages/agent/
COPY apps/bot/package.json ./apps/bot/

# Install production dependencies for all packages
RUN pnpm install --frozen-lockfile --prod

# Copy built packages from builder
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/database/dist ./packages/database/dist
COPY --from=base /app/packages/agent/dist ./packages/agent/dist

# Copy built bot from builder
COPY --from=base /app/apps/bot/dist ./apps/bot/dist

# Copy bot public assets (BUILD-TIMESTAMP.txt, etc)
COPY --from=base /app/apps/bot/public ./apps/bot/public

# Copy omega-manifest.json
COPY --from=base /app/apps/bot/omega-manifest.json ./apps/bot/

# Start the bot
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
