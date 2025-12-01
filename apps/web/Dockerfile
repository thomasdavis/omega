# Dockerfile for Next.js Web App on Railway
# Build from repository root context

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./

# Copy ALL packages (required for @repo/* dependencies)
COPY packages ./packages

# Copy web app
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build everything using turbo (builds packages + web in correct order)
RUN pnpm build --filter=web

# Production image
FROM node:20-alpine

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files for workspace
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/web/package.json ./apps/web/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built packages from builder
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/database/dist ./packages/database/dist

# Copy built Next.js app from builder
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=base /app/apps/web/package.json ./apps/web/package.json

# Start Next.js
WORKDIR /app/apps/web
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
