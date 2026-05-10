# Multi-stage build for production-ready frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
COPY turbo.json ./

# Install all dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build the web app
RUN cd apps/web && npm run build

# Production stage with nginx - ultra minimal
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]