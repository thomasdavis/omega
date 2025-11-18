# Dockerfile for Discord AI Bot on Railway
# Build from repository root context

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy bot package
COPY apps/bot ./apps/bot

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build TypeScript
WORKDIR /app/apps/bot
RUN pnpm run build

# Production image
FROM node:20-alpine

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy bot package.json
COPY apps/bot/package.json ./apps/bot/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --filter=bot

# Copy built files from builder
COPY --from=base /app/apps/bot/dist ./apps/bot/dist

# Start the bot
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
