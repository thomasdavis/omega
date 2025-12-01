# Multi-stage Dockerfile for Next.js web app
# Build from repository root context with root directory set to apps/web

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files from repo root (two levels up)
COPY ../../pnpm-workspace.yaml ../../package.json ../../pnpm-lock.yaml ../../turbo.json ../../tsconfig.json ./

# Copy workspace packages
COPY ../../packages ./packages

# Copy web app
COPY . ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build (turbo will build packages first due to dependsOn)
RUN pnpm build --filter=web

# Production image
FROM node:20-alpine

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace files
COPY --from=base /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./

# Copy package.json files for workspace
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/packages/database/package.json ./packages/database/
COPY --from=base /app/apps/web/package.json ./apps/web/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built packages
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/database/dist ./packages/database/dist

# Copy built Next.js app
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/next.config.js ./apps/web/

# Start Next.js
WORKDIR /app/apps/web
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
