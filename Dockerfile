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

# Copy ONLY dependency files first (better cache hit rate)
# This layer will only rebuild when dependencies change, not when code changes
COPY package.json pnpm-lock.yaml .npmrc* ./

# Install all dependencies (including dev for build)
# Use cache mount for pnpm store to speed up installs
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================================
# Builder Stage - Build the application
# ============================================================================
FROM dependencies AS builder

# Copy source code AFTER dependencies are installed
# This way, code changes don't invalidate the dependency layer
COPY . .

# Build for production (node-server preset)
ENV DEPLOY_TARGET=yandex-cloud

# Build with secret mount (secure - doesn't persist in image)
# The secret is mounted at /run/secrets/sentry_token during build only
# NODE_OPTIONS increases heap for Nitro/Vite build (avoids "JavaScript heap out of memory")
RUN --mount=type=secret,id=sentry_token \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/sentry_token) \
    NODE_OPTIONS="--max-old-space-size=4096" \
    pnpm build

# ============================================================================
# Production Stage - Minimal runtime image
# ============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc* ./

# Install production dependencies only
# Use cache mount for pnpm store to speed up installs
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# Clean up in separate layer (after cache mount is unmounted)
RUN rm -rf /root/.npm /tmp/* /root/.cache

# Copy ONLY the built output from builder (not source code)
COPY --from=builder /app/.output ./.output

# Remove unnecessary files from node_modules to reduce image size
RUN find node_modules -name "*.md" -delete && \
    find node_modules -name "*.ts" -not -path "*/node_modules/@types/*" -delete && \
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "*.map" -delete

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
