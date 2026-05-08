# Multi-stage build for production-ready API
FROM node:20-alpine AS base

# Install dependencies for native modules (sharp, canvas, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

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

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts and node_modules
COPY --from=base --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nodejs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=base --chown=nodejs:nodejs /app/packages/shared ./packages/shared

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER nodejs

EXPOSE 8000

CMD ["node", "dist/index.js"]
