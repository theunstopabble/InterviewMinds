# Deployment Guide

**Version:** 2.0.0  
**Last Updated:** May 2026

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Production Environment                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐     │
│  │  Vercel  │    │    Render    │    │  MongoDB Atlas    │     │
│  │(Frontend)│    │  (Backend)   │    │                   │     │
│  │          │    │              │    │  Cluster: M10+    │     │
│  │  CDN     │───►│  Docker      │───►│  Pool: 20 conn   │     │
│  │  Edge    │    │  Node 20     │    │  Replica Set      │     │
│  └──────────┘    └──────┬───────┘    └───────────────────┘     │
│                          │                                       │
│                   ┌──────┴───────┐                               │
│                   │ Redis Cloud  │                               │
│                   │              │                               │
│                   │ Sessions     │                               │
│                   │ BullMQ       │                               │
│                   │ Rate Limits  │                               │
│                   └──────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Deployment (Vercel)

### Configuration

**File:** `apps/web/vercel.json`

The frontend is a React SPA deployed to Vercel with:
- Automatic builds on push to `main`
- Edge CDN distribution
- SPA routing (all paths → `index.html`)

### Build Command

```bash
cd apps/web && npm run build
# Runs: tsc -b && vite build
```

### Environment Variables (Vercel Dashboard)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., `https://api.interviewminds.com`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key (`pk_live_...`) |
| `VITE_SENTRY_DSN` | Sentry DSN for frontend error tracking |
| `VITE_SOCKET_URL` | WebSocket server URL |

---

## Backend Deployment (Render / Docker)

### Docker Build

The backend uses a multi-stage Dockerfile for optimized production images:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS base
# Install all deps, compile TypeScript

# Stage 2: Production
FROM node:20-alpine AS production
# Copy only compiled JS + production deps
# Non-root user (nodejs:1001)
# Health check built-in
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

### Build & Run

```bash
# Build the Docker image
docker build -t interviewminds-api -f apps/api/Dockerfile .

# Run the container
docker run -p 8000:8000 --env-file apps/api/.env interviewminds-api
```

### Render Configuration

| Setting | Value |
|---------|-------|
| Runtime | Docker |
| Dockerfile Path | `apps/api/Dockerfile` |
| Health Check | `GET /health` |
| Instance Type | Standard (min 512MB RAM for ML models) |
| Auto-Deploy | On push to `main` |

---

## Environment Variables

### Required (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `8000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `JWT_SECRET` | JWT signing secret (≥32 chars, ≥64 in prod) | `<random-string>` |
| `CLERK_PUBLISHABLE_KEY` | Clerk public key | `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_live_...` |
| `GROQ_API_KEY` | Groq API key for LLM | `gsk_...` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://app.interviewminds.com` |

### Optional Services

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `AZURE_SPEECH_KEY` | Azure Speech SDK key | — |
| `AZURE_SPEECH_REGION` | Azure region | — |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | — |
| `CLOUDINARY_API_KEY` | Cloudinary API key | — |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | — |
| `SENTRY_DSN` | Sentry error tracking DSN | — |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry performance sampling | `0.1` |

### Video Call (WebRTC)

| Variable | Description | Default |
|----------|-------------|---------|
| `STUN_SERVER_URL` | Custom STUN server | `stun:stun.l.google.com:19302` |
| `TURN_SERVER_URL` | TURN relay server | — |
| `TURN_USERNAME` | TURN server username | — |
| `TURN_CREDENTIAL` | TURN server password | — |
| `ADDITIONAL_STUN_URLS` | Comma-separated extra STUN URLs | Google STUN 1 & 2 |
| `SFU_ENABLED` | Enable SFU for large calls | `false` |
| `SFU_PROVIDER` | SFU provider (`mediasoup` or `livekit`) | `none` |
| `SFU_ENDPOINT` | SFU server endpoint URL | — |
| `SFU_API_KEY` | SFU API key | — |
| `SFU_API_SECRET` | SFU API secret | — |
| `SFU_MESH_THRESHOLD` | Participant count to switch to SFU | `4` |
| `RECORDING_SERVICE_URL` | Media recording service endpoint | — |
| `RECORDING_STORAGE_PATH` | Recording file storage path | `./recordings` |
| `RECORDING_FORMAT` | Recording format (`webm` or `mp4`) | `webm` |

---

## Database Setup

### MongoDB Atlas

1. Create an M10+ cluster (recommended for production)
2. Enable replica set (required for change streams)
3. Configure network access (whitelist Render IPs)
4. Create database user with `readWrite` permissions
5. Connection string format:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

### Redis Cloud

1. Create a Redis instance (≥25MB for BullMQ)
2. Enable persistence (AOF recommended)
3. Configure TLS for production
4. Connection string format:
   ```
   redis://default:<password>@<host>:<port>
   ```

---

## CI/CD Pipeline

### GitHub Actions

**File:** `.github/workflows/main.yml`

Triggers on push/PR to `main`:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Typecheck  │───►│    Test     │───►│    Build    │
│  (Backend)  │    │  (Backend)  │    │  (Backend)  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Typecheck  │───►│    Test     │───►│    Build    │
│  (Frontend) │    │  (Frontend) │    │  (Frontend) │
└─────────────┘    └─────────────┘    └─────────────┘
```

Steps:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm install --legacy-peer-deps`)
4. Backend: typecheck → test → build
5. Frontend: typecheck → test → build

---

## Health Checks

### Backend Health Endpoint

`GET /health` returns service status:

```json
{
  "status": "ok",
  "services": {
    "mongo": "connected",
    "redis": "connected",
    "groq": "connected",
    "piston": "connected"
  },
  "circuitBreakers": {
    "groq": "closed",
    "piston": "closed"
  }
}
```

### Docker Health Check

Built into the Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

---

## Scaling Considerations

### Horizontal Scaling

- Backend is stateless (session data in Redis)
- Socket.IO requires sticky sessions or Redis adapter for multi-instance
- BullMQ workers can run on separate instances

### Resource Requirements

| Component | Min RAM | Recommended |
|-----------|---------|-------------|
| Backend (without ML) | 256MB | 512MB |
| Backend (with ML models) | 512MB | 1GB |
| Redis | 25MB | 100MB |
| MongoDB | — | M10+ cluster |

### ML Model Loading

Face-api.js models are loaded at startup from `apps/api/models/face-api/`. If models are not present, the system gracefully falls back to content-derived analysis (no crash, no static values).

---

## Graceful Shutdown

The backend handles `SIGTERM` and `SIGINT` signals:

1. Stop accepting new connections
2. Close BullMQ queues and workers
3. Close Redis connections
4. Close MongoDB connection pool
5. Log shutdown completion
6. Exit process

This ensures zero data loss during deployments and container restarts.

---

## Security Checklist

- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is ≥64 characters
- [ ] `CORS_ORIGINS` restricted to production domains only
- [ ] MongoDB network access restricted to backend IPs
- [ ] Redis TLS enabled
- [ ] Sentry DSN configured for error alerting
- [ ] TURN server credentials rotated regularly
- [ ] Docker runs as non-root user (`nodejs:1001`)
- [ ] Rate limiting configured for production traffic
