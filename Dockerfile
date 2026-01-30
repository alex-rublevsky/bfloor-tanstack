# Yandex Serverless Container - TanStack Start
# Optimized for fast builds and small image size

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# ============================================================================
# Dependencies Stage - Cache layer for faster rebuilds
# ============================================================================
FROM base AS dependencies

COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev for build)
# Use cache mount for pnpm store to speed up installs
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================================
# Builder Stage - Build the application
# ============================================================================
FROM dependencies AS builder

# Copy source code
COPY . .

# Build for production (node-server preset)
ENV DEPLOY_TARGET=yandex-cloud

# Build with secret mount (secure - doesn't persist in image)
# The secret is mounted at /run/secrets/sentry_token during build only
RUN --mount=type=secret,id=sentry_token \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/sentry_token) \
    pnpm build

# ============================================================================
# Production Stage - Minimal runtime image
# ============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
# Use cache mount for pnpm store to speed up installs
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/.output ./.output

# Expose port 8080 (required by Yandex Serverless Containers)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", ".output/server/index.mjs"]
