# InterviewMinds Deployment Guide

> **Version:** 1.0.0 | **Last Updated:** May 2026

## Table of Contents
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Steps](#deployment-steps)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             DEPLOYMENT ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         FRONTEND (Vercel)                                │    │
│  │  • Global CDN      • Edge Functions     • Automatic SSL                 │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                        │
│                                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         BACKEND (Render/Docker)                         │    │
│  │  • Node.js 20       • Auto-scaling       • Health checks              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│           │                              │                              │          │
│           ▼                              ▼                              ▼          │
│  ┌───────────────┐              ┌───────────────┐              ┌───────────────┐  │
│  │  MongoDB     │              │  Redis        │              │  External    │  │
│  │  Atlas       │              │  (Upstash/    │              │  Services    │  │
│  │  (Primary)   │              │   Cloud)      │              │  (Groq/      │  │
│  └───────────────┘              └───────────────┘              │  Azure/      │  │
│                                                          │  Clerk)      │  │
│                                                          └───────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Accounts

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Vercel** | Frontend hosting | ✅ Yes |
| **Render** | Backend hosting | ✅ Yes |
| **MongoDB Atlas** | Database | ✅ Yes |
| **Redis** | Cache/Queue | ✅ Yes |
| **Clerk** | Authentication | ✅ Yes |
| **Groq** | AI LLM | ✅ Yes |
| **Azure** | TTS/Speech | ⚠️ Paid |

### Local Development

```bash
# Required tools
node --version        # >= 20.0.0
npm --version         # >= 10.0.0
git --version         # >= 2.0.0
docker --version      # >= 24.0.0 (optional)
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/theunstopabble/InterviewMinds.git
cd InterviewMinds
```

### 2. Install Dependencies

```bash
# Install all dependencies (monorepo)
npm install

# Or install individually
cd apps/api && npm install
cd apps/web && npm install
```

### 3. Environment Variables

Create `.env` files:

#### Backend (apps/api/.env)
```env
# Database
MONGODB_URI=mongodb+srv://...
MONGODB_DB=interviewminds

# Redis
REDIS_URL=redis://...

# Auth (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# AI Services
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
AZURE_SPEECH_KEY=...

# App Config
NODE_ENV=development
PORT=8000
JWT_SECRET=your-jwt-secret

# External Services
CLOUDINARY_API_KEY=...
SENDGRID_API_KEY=SG...
STRIPE_SECRET_KEY=sk_...
```

#### Frontend (apps/web/.env)
```env
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_GROQ_API_KEY=gsk_...
```

---

## Deployment Steps

### Option 1: Vercel + Render (Recommended)

#### Frontend (Vercel)

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy"
git push origin main

# 2. Import in Vercel
# - Go to vercel.com
# - Import repository
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist

# 3. Add environment variables in Vercel dashboard
```

#### Backend (Render)

```bash
# 1. Create Render account
# 2. Create new Web Service
# 3. Connect GitHub repo
# 4. Settings:
#    - Build Command: npm run build
#    - Start Command: npm start
#    - Environment: Node
```

### Option 2: Docker (Production)

```bash
# Build Docker image
docker build -t interviewminds/api:latest .
docker build -t interviewminds/web:latest ./web

# Run containers
docker run -p 8000:8000 interviewminds/api:latest
docker run -p 3000:3000 interviewminds/web:latest
```

### Option 3: Kubernetes (Enterprise)

```bash
# Apply manifests
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/secrets.yaml
```

---

## Configuration

### Database Connection

```javascript
// MongoDB Atlas Connection
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### Redis Cache

```javascript
// Redis Client
const redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});
```

### Authentication (Clerk)

```javascript
// Middleware for protected routes
const { requireAuth } = require('@clerk/express');

app.use(requireAuth({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
}));
```

---

## Monitoring

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Basic liveness |
| `/api/health/ready` | Readiness (DB, Redis) |
| `/api/health/live` | Service alive |

### Metrics

| Tool | Metric |
|------|--------|
| **Sentry** | Errors, performance |
| **Prometheus** | Custom metrics |
| **Datadog** | APM |

### Logging

```javascript
// Structured logging
const logger = require('./lib/logger');

logger.info('Request processed', {
  userId: req.userId,
  endpoint: req.path,
  duration: duration_ms,
});
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Connection timeout** | Check MongoDB Atlas network whitelist |
| **Auth errors** | Verify Clerk keys in .env |
| **Build failures** | Clear node_modules, reinstall |
| **Rate limiting** | Check Redis connection |
| **Memory issues** | Increase Node memory limit |

### Debug Commands

```bash
# Check environment
npm run env:check

# Run tests
npm test

# Lint code
npm run lint

# TypeScript check
npm run build
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database indexes created
- [ ] SSL certificates active
- [ ] Rate limiting enabled
- [ ] Error monitoring (Sentry) set up
- [ ] Log aggregation configured
- [ ] Backup strategy in place
- [ ] CI/CD pipeline working
- [ ] Health checks returning 200
- [ ] Load testing passed

---

## Support

- **Email:** devops@interviewminds.com
- **Discord:** https://discord.gg/interviewminds
- **Status:** https://status.interviewminds.com

---

*InterviewMinds Deployment Guide - Production Ready*