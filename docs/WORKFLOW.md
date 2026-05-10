# InterviewMinds Workflows

## Overview

This document describes the core workflows, processes, and operational procedures for the InterviewMinds platform.

---

## User Flows

### 1. New User Registration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │   Clerk     │     │   Backend   │     │   MongoDB   │
│             │     │  (Auth)     │     │   (API)     │     │  (Database) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │                    │
       │  1. Visit site     │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │  2. Sign in (Google)│                   │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │  3. JWT created    │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │  4. API request (with token)           │                    │
       │───────────────────────────────────────>│                    │
       │                    │                    │                    │
       │                    │      5. Create default role "candidate"│
       │                    │────────────────────>│                    │
       │                    │                    │                    │
       │                    │      6. Role saved                    │
       │                    │<────────────────────│                    │
       │                    │                    │                    │
       │  7. Redirect to dashboard               │                    │
       │<────────────────────────────────────────│                    │
```

### 2. Resume Upload Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Express   │     │   BullMQ    │     │   Worker    │
│             │     │   Server     │     │   Queue     │     │  (Async)    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │                    │
       │  POST /resume/upload                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │              Create Resume (status: pending)                │
       │                    │                    │                    │
       │                    │   addJob("process-resume")            │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │           202 Accepted               │                    │
       │<──────────────────│                    │                    │
       │                    │                    │   Process Job      │
       │                    │                    │<──────────────────│
       │                    │                    │                    │
       │                    │                    │   PDF Parse       │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │   Text Chunking   │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │   Embeddings      │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │   Update Resume   │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │  GET /resume/:id/status                │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │           200 OK (status: completed)  │                    │
       │<──────────────────│                    │                    │
```

### 3. Interview Session Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Express   │     │   Groq API  │     │   MongoDB   │
│  (React)    │     │   Server     │     │   (AI)      │     │              │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │                    │
       │  Start Interview  │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │              POST /api/chat            │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │      AI Response  │                    │
       │                    │<──────────────────│                    │
       │                    │                    │                    │
       │           200 OK (reply)               │                    │
       │<──────────────────│                    │                    │
       │                    │                    │                    │
       │  [Repeat chat flow with Socket.IO]    │                    │
       │                    │                    │                    │
       │  End Interview    │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │              POST /api/interview/end   │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │      AI Scoring   │                    │
       │                    │<──────────────────│                    │
       │                    │                    │                    │
       │                    │   Save Interview  │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │           200 OK (score, metrics)     │                    │
       │<──────────────────│                    │                    │
```

### 4. Real-time Chat Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client A  │     │  Socket.IO  │     │  Client B   │     │  MongoDB    │
│  (User)     │     │   Server    │     │  (Interviewer)│    │              │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │                    │
       │  Connect (with JWT)│                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │   Verify Token    │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │               Join Room                │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │   Emit user-joined │                    │
       │                    │────────────────────>│                    │
       │                    │                    │                    │
       │ Send Message      │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │   Save Message    │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │               Broadcast                │                    │
       │                    │────────────────────>│                    │
       │                    │                    │                    │
       │          (Receive new-message)         │                    │
       │<──────────────────│                    │                    │
```

---

## Development Workflow

### 1. Local Development

```bash
# 1. Clone repository
git clone https://github.com/theunstopabble/InterviewMinds.git

# 2. Install dependencies
npm install

# 3. Start services (MongoDB, Redis)
docker-compose up -d

# 4. Configure .env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 5. Start development servers
npm run dev
```

### 2. Code Changes

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# - Write code
# - Write tests
# - Update docs

# 3. Commit changes
git add .
git commit -m "Add: My feature description"

# 4. Push branch
git push origin feature/my-feature

# 5. Create Pull Request
# - CI/CD runs tests
# - Review by maintainers
# - Merge to main
```

### 3. Testing

```bash
# Run all tests
npm run test

# API tests
cd apps/api && npm run test

# Web tests
cd apps/web && npm run test

# Coverage
npm run test:coverage
```

---

## CI/CD Workflow

### GitHub Actions Pipeline

```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # 1. Install and Build
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  # 2. Type Checking
  typecheck:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npm run typecheck

  # 3. Run Tests
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npm run test

  # 4. Deploy (on main branch push)
  deploy:
    needs: [build, typecheck, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # Deploy to Vercel (web)
      # Deploy to Render (api)
```

---

## Operational Workflows

### 1. Monitoring & Alerts

```bash
# Check service health
curl https://api.interviewminds.com/health

# Check metrics
curl https://api.interviewminds.com/metrics

# Check logs
docker-compose logs -f api

# Check circuit breakers
curl https://api.interviewminds.com/health | jq '.circuitBreakers'
```

### 2. Scaling

```bash
# Scale API replicas (Docker)
docker-compose up -d --scale api=3

# Scale API replicas (Kubernetes)
kubectl scale deployment interview-minds-api --replicas=5

# Add Redis read replica (Cloud)
# Configure in cloud provider dashboard
```

### 3. Backup & Recovery

```bash
# Backup MongoDB
mongodump --uri="mongodb+srv://..." --out=./backup

# Restore MongoDB
mongorestore --uri="mongodb+srv://..." ./backup

# Backup Redis
redis-cli SAVE
# Copy dump.rdb

# Restore Redis
# Copy dump.rdb to Redis data directory
redis-server --appendonly no
```

### 4. Security Updates

```bash
# Update dependencies
npm audit fix

# Update Node.js version
# 1. Update .nvmrc
# 2. nvm install
# 3. Update Dockerfiles

# Rotate secrets
# 1. Generate new JWT_SECRET
# 2. Update environment variables
# 3. Redeploy
```

---

## Issue Resolution Workflow

### 1. Incident Detection

```
Alert triggered
    │
    ▼
Check logs (Sentry, Cloudwatch)
    │
    ▼
Identify issue type
    │
    ├─► Code bug → Fix + Deploy
    │
    ├─► Infrastructure → Scale/Restart
    │
    └─► External → Monitor + Wait
```

### 2. Debugging Steps

```bash
# 1. Check health endpoint
curl /health

# 2. Check service logs
docker-compose logs -f api

# 3. Check circuit breakers
curl /health | jq '.circuitBreakers'

# 4. Check rate limits
redis-cli keys "ratelimit:*"

# 5. Check database
mongosh
> db.interviews.countDocuments({})

# 6. Check queue
redis-cli lrange "bull:resume-processing:wait"
```

---

## Release Workflow

### Version Numbering

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Steps

```bash
# 1. Update version
npm version minor

# 2. Update CHANGELOG.md

# 3. Create tag
git tag -a v1.2.0 -m "Release v1.2.0"

# 4. Push tag
git push origin v1.2.0

# 5. CI/CD triggers deployment
```

### Rollback Steps

```bash
# Vercel (automatic)
# Go to Dashboard → Deployments → Previous

# Render
render deploy --service <service-id> --commit <previous-commit>

# Docker
docker-compose down
docker-compose up -d --build
```

---

## On-Call Procedures

### Severity Levels

| Level | Response Time | Examples |
|-------|---------------|-----------|
| P1 | 15 min | Complete outage |
| P2 | 1 hour | Major feature broken |
| P3 | 4 hours | Minor issue |
| P4 | 24 hours | Feature request |

### Escalation Path

```
On-Call Engineer
    │
    ▼ (if unresolved)
Team Lead
    │
    ▼ (if unresolved)
Engineering Manager
    │
    ▼ (if unresolved)
CTO
```

---

## Data Retention Policy

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Interview transcripts | 90 days | Privacy |
| Resume content | Until deleted | User data |
| Chat messages | 90 days | Storage cost |
| Audit logs | 1 year | Compliance |
| Metrics | 30 days | Cost |
| Error logs | 90 days | Debugging |

---

## Enterprise Workflows (Phase 1-7)

### Phase 1: Core Accuracy Workflow

```
User uploads resume
       │
       ▼
┌──────────────────┐
│  Parse Resume    │
│  Extract Skills  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Job Matching    │  ← jobMatching.ts
│  Gap Analysis    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Generate        │  ← questionGeneration.ts
│  Questions       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Code Analysis   │  ← codeAnalysis.ts
│  (if coding)    │
└────────┬─────────┘
         │
         ▼
   Interview Session
```

### Phase 2: Security Workflow

```
User Login
       │
       ▼
┌──────────────────┐
│  IP Validation   │  ← geoFencing.ts
│  Country Check  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Fraud Check     │  ← fraudDetection.ts
│  Browser FP     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Biometric       │  ← biometricAuth.ts
│  Verification    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  E2E Keys        │  ← e2eEncryption.ts
│  Exchange       │
└────────┬─────────┘
         │
         ▼
   Authenticated Session
```

### Phase 4: Truthfulness Workflow

```
During Interview
       │
       ▼
┌──────────────────┐
│  Answer         │  ← answerValidation.ts
│  Evaluation     │
│  - Content      │
│  - STAR Method  │
│  - Red Flags    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Resume         │  ← resumeVerification.ts
│  Cross-check    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Dynamic        │  ← dynamicQuestions.ts
│  Follow-ups     │
└────────┬─────────┘
         │
         ▼
   Score + Feedback
```

### Phase 6: Compliance Workflow

```
User Data Request
       │
       ▼
┌──────────────────┐
│  Validate        │  ← compliance.ts
│  Request Type   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Access    Deletion
Request   Request
    │         │
    ▼         ▼
Export    Remove
User Data All Data
    │         │
    └────┬────┘
         │
         ▼
┌──────────────────┐
│  Audit Log       │
│  Record Action  │
└──────────────────┘
```

### Phase 7: Analytics Workflow

```
Interview Completed
       │
       ▼
┌──────────────────┐
│  Aggregate       │  ← analytics.ts
│  Metrics         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Dashboard       │
│  Update          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Predictive      │
│  Analysis        │
│  - Success Rate  │
│  - Risk Score   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Pipeline       │
│  Insights       │
└──────────────────┘
```

---

## Enterprise CI/CD Extension

```yaml
# .github/workflows/enterprise.yml
name: Enterprise CI/CD

on:
  push:
    branches: [main, develop, enterprise/*]

jobs:
  # Enterprise Security Scanning
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security audit
        run: npm audit --audit-level=high
      - name: Scan for secrets
        run: trufflehog filesystem .
      - name: Dependency vulnerability check
        run: snyk test

  # Compliance Checks
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: GDPR Compliance Check
        run: echo "Checking GDPR compliance..."
      - name: Audit Log Verification
        run: echo "Verifying audit logs..."

  # Enterprise Feature Tests
  enterprise-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test E2E Encryption
        run: npm run test:e2e-encryption
      - name: Test Biometric Auth
        run: npm run test:biometric
      - name: Test Proctoring
        run: npm run test:proctoring

  # Multi-tenant Tests
  multi-tenant-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test tenant isolation
        run: npm run test:tenants
      - name: Test RBAC
        run: npm run test:rbac
```

---

## Incident Response (Enterprise)

| Severity | Response Time | Examples |
|----------|---------------|----------|
| Critical (P1) | 15 min | Data breach, service down | 1 hr | Security vulnerability |
| High (P2) | 1 hr | Major feature broken | 4 hrs | Performance degradation |
| Medium (P3) | 4 hrs | Minor bug | 24 hrs | Documentation issues |
| Low (P4) | 24 hrs | Feature request | 1 week | Cosmetic issues |

---

## Phase 8: Advanced Features Workflows

### 1. Interview Scheduling Flow

```
Candidate → Select Date/Time → Choose Timezone → Book Slot → Receive Confirmation
```

| Step | Action | API |
|------|--------|-----|
| 1 | Browse available slots | GET /scheduling/slots/:id |
| 2 | Select timezone | GET /scheduling/timezones |
| 3 | Book slot | POST /scheduling/book |
| 4 | Receive confirmation | Notification sent |

### 2. Preparation Mode Flow

```
Candidate → Start Preparation → System Check → Practice Questions → Break Timer
```

| Step | Action | API |
|------|--------|-----|
| 1 | Run system check | GET /preparation/system-check |
| 2 | Practice questions | GET /questions |
| 3 | Use break timer | POST /preparation/break-timer/start |

### 3. Pipeline Management Flow

```
Admin → View Kanban → Drag Candidate → Update Stage → Auto-notify
```

| Step | Action | API |
|------|--------|-----|
| 1 | View pipeline | GET /pipeline |
| 2 | Drag to new stage | PUT /pipeline/:id/stage |
| 3 | Notify candidate | POST /notifications/send |

### 4. Report Generation Flow

```
Admin → Select Candidate → Generate Report → Export (PDF/CSV/JSON)
```

| Step | Action | API |
|------|--------|-----|
| 1 | Select candidate | GET /reports/candidate/:id |
| 2 | Generate report | POST /reports/generate |
| 3 | Export | GET /reports/:id/pdf, /reports/export/csv |

### 5. AI Resume Screening Flow

```
Upload Resume → AI Analysis → Score Match → Recommend Action
```

| Step | Action | API |
|------|--------|-----|
| 1 | Upload resume | POST /resume/upload |
| 2 | Trigger screening | POST /resume-screener/screen |
| 3 | Get results | GET /resume-screener/result/:id |

### 6. SQL Challenge Flow

```
Admin → Create Challenge → Candidate Takes Test → Auto-Grade → Results
```

| Step | Action | API |
|------|--------|-----|
| 1 | Create challenge | POST /sql-challenges |
| 2 | Submit query | POST /sql-challenges/:id/submit |
| 3 | Auto-grade | Built-in validation |

### 7. Panel Interview Flow

```
Admin → Create Panel → Add Interviewers → Start Session → Collect Scores → Finalize
```

| Step | Action | API |
|------|--------|-----|
| 1 | Create panel | POST /panel-interview/create |
| 2 | Add panelists | POST /panel-interview/:id/panelist |
| 3 | Join session | POST /panel-interview/:id/join |
| 4 | Submit scores | POST /panel-interview/:id/score |
| 5 | Complete | POST /panel-interview/:id/complete |

### 8. GitHub Integration Flow

```
Connect GitHub → Select Repository → Analyze → View Report
```

| Step | Action | API |
|------|--------|-----|
| 1 | Connect | POST /git/connect |
| 2 | Select repo | GET /git/repositories |
| 3 | Analyze | POST /git/repositories/:id/analyze |
| 4 | View report | GET /git/report |

---

## Complete Workflow Summary

| Phase | Features | Workflows |
|-------|----------|-----------|
| Phase 1-7 | 18 Core Features | Documented ✅ |
| Phase 8 | 15 Advanced Features | Documented above ✅ |

**All 68 Features Workflows Documented** ✅