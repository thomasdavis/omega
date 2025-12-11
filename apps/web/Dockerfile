# Multi-stage Dockerfile for Next.js web app
# Build from repository root context (Railway ALWAYS uses repo root for Docker builds)
# Root Directory setting only determines which railway.toml to read, not Docker context!

FROM node:22-alpine AS base

# Cache buster - change this value to force a clean rebuild
ARG CACHE_BUST=2025-12-06

# Install pnpm
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files from repo root
# IMPORTANT: Railway Docker build context is ALWAYS repo root, not apps/web
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.json ./

# Copy workspace packages
COPY packages ./packages

# Copy web app
COPY apps/web ./apps/web

# Copy assets directory (includes SoundFont for MP3 generation)
COPY assets ./assets

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build (turbo will build packages first due to dependsOn)
RUN pnpm build --filter=web

# Production image
FROM node:22-alpine

# Install OpenSSL compatibility for Prisma + FluidSynth for audio rendering
RUN apk add --no-cache openssl libc6-compat fluidsynth

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY --from=base /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./

# Copy package.json files for workspace
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/packages/database/package.json ./packages/database/
COPY --from=base /app/packages/ui/package.json ./packages/ui/
COPY --from=base /app/apps/web/package.json ./apps/web/

# Copy Prisma schema for database package (needed for postinstall hook)
COPY --from=base /app/packages/database/prisma ./packages/database/prisma

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built packages
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/database/dist ./packages/database/dist
COPY --from=base /app/packages/ui/dist ./packages/ui/dist

# Copy built Next.js app
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/next.config.js ./apps/web/

# Copy startup scripts
COPY --from=base /app/apps/web/scripts ./apps/web/scripts

# Start Next.js
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Create startup script that syncs comics then starts the app
RUN echo '#!/bin/sh\n\
set -e\n\
echo "🚀 Starting omega-web..."\n\
\n\
# Sync comics from Docker image to persistent volume\n\
if [ -f "/app/apps/web/scripts/sync-comics-to-volume.sh" ]; then\n\
  sh /app/apps/web/scripts/sync-comics-to-volume.sh\n\
fi\n\
\n\
# Start Next.js\n\
exec pnpm start\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
