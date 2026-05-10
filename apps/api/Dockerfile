# Multi-stage build for production-ready API
FROM node:20-alpine AS base

WORKDIR /app

# Copy package files for monorepo root
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY turbo.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build the API
RUN cd apps/api && npm run build

# Production stage - optimized minimal image
FROM node:20-alpine AS production

# Install only production dependencies needed
WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY turbo.json ./

# Install only production dependencies (no dev deps)
RUN npm ci --omit=dev --legacy-peer-deps && \
    rm -rf /root/.npm

# Copy built artifacts
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/node_modules ./node_modules
COPY --from=base /app/packages/shared ./packages/shared

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER nodejs

EXPOSE 8000

CMD ["node", "dist/index.js"]