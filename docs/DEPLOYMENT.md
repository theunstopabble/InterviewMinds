# InterviewMinds Deployment Guide

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | v20+ | Runtime |
| npm | v10+ | Package manager |
| Docker | v24+ | Containerization |
| MongoDB | v7+ | Database |
| Redis | v7+ | Cache/Queue |

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/theunstopabble/InterviewMinds.git
cd InterviewMinds
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

#### Backend (.env)

```bash
# Required
NODE_ENV=production
PORT=8000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/interviewminds
REDIS_URL=redis://<host>:6379
JWT_SECRET=<generate-64-char-random-string>
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
GROQ_API_KEY=gsk_...

# Optional (for production features)
GEMINI_API_KEY=...
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=centralindia
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SENTRY_DSN=https://...
```

#### Frontend (.env)

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://api.interviewminds.com/api
VITE_SENTRY_DSN=https://...
```

---

## Development Deployment

### Option 1: Local Development

```bash
# Start all services
npm run dev

# API runs on http://localhost:8000
# Web runs on http://localhost:5173
```

### Option 2: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Services Started:**
- MongoDB (port 27017)
- Redis (port 6379)
- API (port 8000)
- Web (port 80)

---

## Production Deployment

### Option 1: Vercel (Frontend) + Render (Backend)

#### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `apps/web/dist`
3. Add Environment Variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_URL`
   - `VITE_SENTRY_DSN`
4. Deploy

**Vercel Features Used:**
- Edge Network (global CDN)
- Automatic SSL
- Serverless Functions (if needed)
- Analytics

#### Backend (Render)

1. Create new Web Service on Render
2. Connect GitHub repository
3. Configure:
   - Root Directory: `apps/api`
   - Build Command: `npm run build`
   - Start Command: `node dist/index.js`
4. Add Environment Variables (from .env)
5. Deploy

**Render Configuration:**
```yaml
# render.yaml
services:
  - type: web
    name: interview-minds-api
    env: node
    region: oregon
    buildCommand: npm run build
    startCommand: node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

---

### Option 2: Docker (Self-Hosted)

#### Build Docker Images

```bash
# Build API image
docker build -t interview-minds-api:latest -f apps/api/Dockerfile .

# Build Web image
docker build -t interview-minds-web:latest -f apps/web/Dockerfile .
```

#### Run with Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly --maxmemory 256mb

  api:
    image: interview-minds-api:latest
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://admin:${MONGO_PASSWORD}@mongo:27017/interviewminds?authSource=admin
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  web:
    image: interview-minds-web:latest
    ports:
      - "80:80"
    depends_on:
      - api
```

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### Option 3: Kubernetes (Enterprise)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: interview-minds-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: interview-minds-api
  template:
    metadata:
      labels:
        app: interview-minds-api
    spec:
      containers:
      - name: api
        image: interview-minds-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: interview-minds-secrets
              key: mongo-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: interview-minds-api
spec:
  selector:
    app: interview-minds-api
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: interview-minds-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.interviewminds.com
    secretName: interview-minds-tls
  rules:
  - host: api.interviewminds.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: interview-minds-api
            port:
              number: 80
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/main.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          # Deploy API
          curl -X POST $RENDER_API_URL/deploys \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -d '{"serviceId":"${{ secrets.RENDER_SERVICE_ID }}"}'
```

---

## Health Checks

### Endpoint: GET /health

```bash
curl https://api.interviewminds.com/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "mongo": "connected",
    "redis": "connected",
    "groq": "connected",
    "piston": "connected"
  },
  "circuitBreakers": {
    "groq": { "state": "closed", "failures": 0 },
    "gemini": { "state": "closed", "failures": 0 },
    "azure-speech": { "state": "closed", "failures": 0 },
    "piston": { "state": "closed", "failures": 0 }
  }
}
```

### Prometheus Metrics

```bash
curl https://api.interviewminds.com/metrics
```

---

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

For self-hosted deployment with Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name interviewminds.com;

    ssl_certificate /etc/letsencrypt/live/interviewminds.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/interviewminds.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Redirect to HTTPS
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name interviewminds.com;
    return 301 https://$server_name$request_uri;
}
```

Auto-renewal with Certbot:
```bash
certbot renew --nginx --deploy-hook "nginx -s reload"
```

---

## Monitoring & Alerts

### Sentry Integration

1. Create Sentry project
2. Add DSN to environment:
   ```
   SENTRY_DSN=https://<key>@o<org>.ingest.us.sentry.io/<project>
   ```
3. Auto-capture:
   - Unhandled exceptions
   - Unhandled promise rejections
   - Performance monitoring

### Uptime Monitoring

Recommended services:
- **Pingdom** - Basic uptime
- **Datadog** - Full monitoring
- **Grafana + Prometheus** - Self-hosted

---

## Rollback Procedures

### Vercel (Frontend)

1. Go to Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

### Render (Backend)

```bash
# Via Render CLI
render deploy --service interview-minds-api --env production --id <service-id>
```

### Docker

```bash
# Rollback to previous image
docker tag interview-minds-api:previous interview-minds-api:latest
docker-compose up -d --force-recreate
```

---

## Performance Tuning

### API Server

```javascript
// cluster mode for multi-core
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start Express server
}
```

### Redis Optimization

```bash
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
```

### MongoDB Optimization

```javascript
// Connection pooling
mongoose.connect(uri, {
  maxPoolSize: 20,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});
```

---

## Disaster Recovery

### Backup Restoration

```bash
# Restore MongoDB
mongorestore --uri="mongodb+srv://..." --drop backup/

# Restore Redis
redis-cli < dump.rdb
```

### Failover Strategy

1. **Database**: Use MongoDB Atlas for automatic failover
2. **Redis**: Redis Sentinel or managed service (Redis Cloud)
3. **API**: Multiple replicas behind load balancer
4. **Frontend**: Vercel's automatic failover

---

## Cost Estimation

| Service | Usage | Estimated Cost |
|---------|-------|-----------------|
| Vercel Pro | 100k requests/month | $20/month |
| MongoDB Atlas M10 | 512MB storage | $25/month |
| Redis Cloud 30MB | Cache + Queue | $0-10/month |
| Groq API | 100k tokens/day | $50/month |
| Domain (Namecheap) | Annual | $12/year |
| **Total** | | **~$100-150/month** |

---

## Enterprise Deployment (Phase 1-7)

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTERPRISE DEPLOYMENT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Load Balancer                                │    │
│  │                    (AWS ALB / Azure LB)                            │    │
│  └────────────────────────────┬────────────────────────────────────────┘    │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                        │
│         │                     │                     │                        │
│         ▼                     ▼                     ▼                        │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │  API Node 1  │      │  API Node 2  │      │  API Node N  │              │
│  │  (Docker)    │      │  (Docker)    │      │  (Docker)    │              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│         │                     │                     │                        │
│         └─────────────────────┼─────────────────────┘                        │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                        │
│         │                     │                     │                        │
│         ▼                     ▼                     ▼                        │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │   MongoDB    │      │    Redis     │      │   MongoDB    │              │
│  │   Cluster    │      │   Cluster    │      │   Replica    │              │
│  │  (Primary)   │      │   (Cache)    │      │  (Secondary) │              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Enterprise Services Deployment

| Service | Docker Image | Scaling | Notes |
|---------|--------------|---------|-------|
| API Server | interviewminds/api | Horizontal | Stateless |
| Worker | interviewminds/worker | Horizontal | BullMQ consumers |
| Proctoring | interviewminds/proctoring | Per-tenant | GPU optional |

### Security Configuration

```yaml
# docker-compose.enterprise.yml
services:
  api:
    environment:
      - NODE_ENV=production
      - E2E_ENABLED=true
      - BIOMETRIC_ENABLED=true
      - FRAUD_DETECTION=true
      - COMPLIANCE_MODE=soc2
    volumes:
      - ./certs:/app/certs:ro
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  redis:
    command: redis-server --requirepass ${REDIS_PASSWORD}
    deploy:
      replicas: 3

  mongodb:
    command: mongod --replSet rs0 --auth
    deploy:
      replicas: 3
```

### Enterprise Environment Variables

```bash
# Security
E2E_ENABLED=true
BIOMETRIC_ENABLED=true
BIOMETRIC_LIVENESS_REQUIRED=true

# Compliance
COMPLIANCE_MODE=soc2
AUDIT_LOG_RETENTION_DAYS=2555
GDPR_DATA_RETENTION_DAYS=730

# Multi-Tenancy
TENANT_ISOLATION=row
MAX_TENANTS=1000

# Enterprise Features
FRAUD_DETECTION=true
GEO_FENCING_ENABLED=true
SSO_PROVIDERS=okta,azure-ad,google-workspace
ATS_INTEGRATION_ENABLED=true
```

### Enterprise Monitoring

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| API Latency p99 | > 500ms | PagerDuty |
| Error Rate | > 1% | PagerDuty |
| CPU Usage | > 80% | Slack |
| Memory Usage | > 90% | PagerDuty |
| Failed Logins | > 10/min | Slack |
| Fraud Detection | Risk > 70 | Email + Slack |

### Enterprise Cost Estimation

| Service | Usage | Estimated Cost |
|---------|-------|-----------------|
| AWS EKS (3 nodes) | t3.xlarge | $300/month |
| MongoDB Atlas M50 | 10GB storage | $75/month |
| Redis Enterprise | 1GB | $50/month |
| Cloudflare Enterprise | WAF + DDoS | $200/month |
| PagerDuty | 24/7 monitoring | $150/month |
| **Total Enterprise** | | **~$775/month** |

---

## Phase 8 Production Checklist

Before deploying Phase 8 features:

- [x] All 40+ services compiled successfully
- [x] All 13 pages integrated with services
- [x] All routes added to App.tsx
- [x] Build passes without errors
- [x] PWA manifest updated
- [x] CSP headers configured
- [x] Environment variables set

### Phase 8 New Routes to Deploy

| Route | Page | Status |
|-------|------|--------|
| `/scheduling` | SchedulingPage | ✅ Ready |
| `/questions` | QuestionBankPage | ✅ Ready |
| `/reports` | ReportsPage | ✅ Ready |
| `/preparation` | PreparationPage | ✅ Ready |
| `/pipeline` | PipelinePage | ✅ Ready |

### New Environment Variables

```bash
# Notification Services (optional)
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
SLACK_WEBHOOK_URL=

# GitHub Integration (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

## Deployment Complete ✅

All 68 features ready for production deployment! |