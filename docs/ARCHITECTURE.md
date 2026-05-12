# InterviewMinds Architecture

> **Version:** 1.0.0 | **Last Updated:** May 2026 | **Status:** Production Ready

## Table of Contents
- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [Monorepo Structure](#monorepo-structure)
- [Backend Services](#backend-services)
- [Frontend Architecture](#frontend-architecture)
- [Database Design](#database-design)
- [Security Architecture](#security-architecture)
- [Infrastructure](#infrastructure)
- [Deployment](#deployment)
- [Scalability](#scalability)

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENTS                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────┐ │
│  │   Web App       │    │   PWA           │    │   Mobile App    │    │  API     │ │
│  │   (React 18)    │    │   (Vite PWA)    │    │   (React Native)│    │  Client  │ │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    └────┬─────┘ │
│           │                      │                      │                 │        │
└───────────┼──────────────────────┼──────────────────────┼─────────────────┼────────┘
            │                      │                      │                 │
            └──────────────────────┴──────────────────────┴─────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EDGE NETWORK (Vercel)                                    │
│                    Global CDN • SSL/TLS • DDoS Protection                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Express)                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  Middleware Stack (Top to Bottom)                                           │    │
│  │  1. CORS → 2. Correlation ID → 3. Metrics → 4. Security Headers → 5. Timeout  │    │
│  │  6. Input Sanitization → 7. Rate Limiting → 8. Authentication → 9. RBAC     │    │
│  │  10. Audit Logging → 11. Circuit Breaker → 12. Route Handler                │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
            │
            ├──────────────────────────────────────────┬────────────────────────────────┤
            │                                          │                                │
            ▼                                          ▼                                ▼
┌─────────────────────────────┐    ┌─────────────────────────────────┐    ┌──────────────┐
│    EXTERNAL SERVICES         │    │    INTERNAL MICROSERVICES       │    │   DATABASE   │
├─────────────────────────────┤    ├─────────────────────────────────┤    ├──────────────┤
│  ┌──────────┐  ┌──────────┐   │    │  ┌──────────┐  ┌──────────┐      │    │  ┌────────┐  │
│  │  Groq   │  │  Gemini  │   │    │  │  Queue  │  │  Cache  │      │    │  │ MongoDB│  │
│  │ (LLM)   │  │ (Vision) │   │    │  │ (BullMQ)│  │ (Redis) │      │    │  │        │  │
│  └──────────┘  └──────────┘   │    │  └──────────┘  └──────────┘      │    │  └────────┘  │
│  ┌──────────┐  ┌──────────┐   │    │  ┌──────────┐  ┌──────────┐      │    │              │
│  │  Azure  │  │ Piston   │   │    │  │  Socket  │  │  Sentry  │      │    │              │
│  │ (TTS)   │  │(Compiler)│   │    │  │   (IO)   │  │(Tracing)│      │    │              │
│  └──────────┘  └──────────┘   │    │  └──────────┘  └──────────┘      │    │              │
└─────────────────────────────┘    └─────────────────────────────────┘    └──────────────┘
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | Node.js | 20.x | Backend execution |
| **Language** | TypeScript | 5.x | Type safety |
| **Framework** | Express | 4.x | Web framework |
| **Frontend** | React | 18.x | UI library |
| **Build Tool** | Vite | 5.x | Fast bundling |
| **UI** | Tailwind + Shadcn | Latest | Styling |
| **Monorepo** | Turborepo | 2.x | Build orchestration |

### Data & Cache

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Primary DB** | MongoDB (Atlas) | Document storage |
| **Cache** | Redis | Rate limiting, sessions |
| **Queue** | BullMQ | Async job processing |
| **Search** | MongoDB Atlas Search | Full-text search |

### AI & ML

| Service | Provider | Model | Use Case |
|---------|-----------|-------|----------|
| **LLM** | Groq | Llama 3 70B | Interview chat |
| **Vision** | Google Gemini | Pro | Image analysis |
| **TTS** | Azure Speech | Neural | Voice output |
| **Proctoring** | TensorFlow.js | Face/Focus | Browser-based ML |

### External Integrations

| Service | Purpose |
|---------|---------|
| **Clerk** | Authentication |
| **Cloudinary** | Media storage |
| **SendGrid** | Email delivery |
| **Twilio** | SMS notifications |
| **Stripe** | Payment processing |

---

## Monorepo Structure

```
InterviewMinds/
├── apps/
│   ├── api/                    # Express Backend
│   │   ├── src/
│   │   │   ├── lib/          # 79 service files
│   │   │   ├── routes/       # 32 route files
│   │   │   ├── middleware/   # Auth, RBAC, audit
│   │   │   ├── models/        # MongoDB schemas
│   │   │   ├── graphql/        # GraphQL schema
│   │   │   ├── tests/          # Unit tests
│   │   │   └── index.ts        # App entry
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # React Frontend
│       ├── src/
│       │   ├── components/    # UI components
│       │   ├── pages/         # 15 page components
│       │   ├── services/      # 45 API services
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # Utilities
│       │   ├── stores/         # State management
│       │   └── App.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│       ├── types/
│       └── utils/
│
├── docs/                       # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DB_SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── ...
│
├── turbo.json                 # Turborepo config
├── package.json               # Root package.json
└── README.md
```

---

## Backend Services

### Phase 1-8: Core Services (31 files)

| Service | File | Description |
|---------|------|-------------|
| Job Matching | `jobMatching.ts` | Resume-Job matching |
| Question Generation | `questionGeneration.ts` | AI question creation |
| Code Analysis | `codeAnalysis.ts` | Code quality/scanning |
| E2E Encryption | `e2eEncryption.ts` | RSA-2048 encryption |
| Biometric Auth | `biometricAuth.ts` | Face/Voice/Fingerprint |
| Fraud Detection | `fraudDetection.ts` | Browser fingerprinting |
| Video Proctoring | `videoProctoring.ts` | TensorFlow.js proctoring |
| Resume Verification | `resumeVerification.ts` | Entity extraction |
| Answer Validation | `answerValidation.ts` | Plagiarism/AI detection |
| SSO Integration | `ssoIntegration.ts` | OAuth/SAML |
| Webhooks | `webhooks.ts` | Event notifications |
| ATS Integration | `atsIntegration.ts` | Greenhouse/Lever |
| Multi-tenancy | `multiTenancy.ts` | Tenant management |
| Compliance | `compliance.ts` | GDPR/SOC2 |
| Analytics | `analytics.ts` | Dashboard data |
| Question Bank | `questionBank.ts` | Question library |
| Scorecard | `scorecard.ts` | Evaluation rubrics |
| Report Generator | `reportGenerator.ts` | PDF/CSV export |
| Async Video | `asyncVideo.ts` | Pre-recorded interviews |
| Take Home | `takeHome.ts` | Coding challenges |
| Preparation | `preparation.ts` | System check |
| Waiting Room | `waitingRoom.ts` | Queue management |
| Mock Interview | `mockInterview.ts` | Practice mode |
| Panel Interview | `panelInterview.ts` | Multi-interviewer |
| AI Analysis | `aiAnalysis.ts` | Confidence scoring |
| Notifications | `notifications.ts` | Email/SMS/Slack |
| Resume Screener | `resumeScreener.ts` | Auto-screening |
| SQL Challenges | `sqlChallenges.ts` | Database testing |
| Git Integration | `gitIntegration.ts` | GitHub import |

### Phase 9-18: Enterprise Services (48 files)

| Phase | Services |
|-------|----------|
| **Phase 9: AI & LLM** | llmInterviewer, multimodalAI, smartAssessment |
| **Phase 10: Infrastructure** | connectionPool, responseCache, cdnIntegration, eventBus, queryOptimization |
| **Phase 11: Collaboration** | collaborativeEditor, whiteboard, videoCall, collaborationTools |
| **Phase 12: Analytics** | predictiveAnalytics, sentimentAnalysis, reportingService, metricsAggregator, anomalyDetector |
| **Phase 13: Developer** | githubIntegration, gitlabIntegration, codeReview, testRunner, sandboxService |
| **Phase 14: Compliance** | dataRetention, piiMasking, accessRequest, auditTrail |
| **Phase 15: Integration** | hrisIntegration, communicationIntegration, backgroundCheck |
| **Phase 16: Mobile** | pushNotification, offlineSupport, mobileAPI |
| **Phase 17: Observability** | monitoringService, loggingService |
| **Phase 18: AI Agents** | aiAgent, automationService |

**Total: 79 Backend Services**

---

## Frontend Architecture

### Pages (15 total)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Resume upload, job matching |
| `/interview` | Interview | Live coding interview |
| `/interview/:id` | InterviewSession | Active session |
| `/feedback/:id` | Feedback | Results & scores |
| `/analytics` | Analytics | Dashboard & trends |
| `/pipeline` | Pipeline | Kanban candidate board |
| `/scheduling` | Scheduling | Calendar booking |
| `/questions` | QuestionBank | Question library |
| `/reports` | Reports | PDF/CSV export |
| `/preparation` | Preparation | System check, practice |
| `/settings` | Settings | Enterprise config |
| `/admin` | Admin | Compliance, audit |
| `/candidate-portal` | CandidatePortal | Self-service |
| `/auth/*` | Auth | Clerk login/signup |

### Services (45 total)

All API calls centralized in `services/enterprise.ts`:

```typescript
// Example: Using services
import { llmInterviewerService, collaborationService } from '@/services/enterprise';

// Start LLM interview
const session = await llmInterviewerService.createSession(config);

// Join collaborative editor
await collaborationService.joinEditor(sessionId);
```

---

## Database Design

### Collections

```
┌─────────────────────────────────────────────────────────────────┐
│                        MongoDB Collections                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  users              - User accounts & profiles                  │
│  resumes            - Uploaded resumes                           │
│  interviews         - Interview sessions                         │
│  questions          - Question bank                             │
│  answers            - Candidate responses                       │
│  scores             - Evaluation scores                          │
│  reports            - Generated reports                          │
│  tenants            - Multi-tenant organizations                │
│  audit_logs         - Compliance audit trail                    │
│  sessions           - Active interview sessions                │
│  notifications      - User notifications                       │
│  webhooks           - Webhook configurations                   │
│  jobs               - Async job queue                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Indexes

```javascript
// interviews
{ candidateId: 1, status: 1 }
{ scheduledAt: 1 }

// questions
{ role: 1, difficulty: 1 }
{ category: 1, tags: 1 }

// audit_logs
{ tenantId: 1, timestamp: -1 }
{ userId: 1, action: 1 }
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYERS                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐   │
│  │    AUTHENTICATION   │    │    AUTHORIZATION     │    │    DATA SECURITY     │   │
│  ├──────────────────────┤    ├──────────────────────┤    ├──────────────────────┤   │
│  │                      │    │                      │    │                      │   │
│  │  • Clerk JWT        │    │  • RBAC (4 roles)   │    │  • E2E Encryption    │   │
│  │  • Biometric        │    │  • Permission Matrix │    │  • Field-level       │   │
│  │    (Face/Voice/FP)  │    │  • Resource Access   │    │  • Input Sanitization│   │
│  │  • SSO (OAuth)     │    │  • Audit Logging     │    │  • SQL Injection     │   │
│  │  • 2FA             │    │  • API Key Mgmt      │    │    Prevention        │   │
│  │                     │    │                      │    │                      │   │
│  └──────────────────────┘    └──────────────────────┘    └──────────────────────┘   │
│                                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐   │
│  │   NETWORK SECURITY   │    │   FRAUD PREVENTION   │    │   COMPLIANCE         │   │
│  ├──────────────────────┤    ├──────────────────────┤    ├──────────────────────┤   │
│  │                      │    │                      │    │                      │   │
│  │  • Rate Limiting     │    │  • Browser FP        │    │  • GDPR Data Export  │   │
│  │  • IP Whitelisting   │    │  • Behavior Analysis │    │  • Consent Mgmt      │   │
│  │  • Geo-fencing      │    │  • Anomaly Detection│    │  • Audit Trails      │   │
│  │  • DDoS Protection  │    │  • Session Binding  │    │  • SOC 2 Ready       │   │
│  │                     │    │                      │    │                      │   │
│  └──────────────────────┘    └──────────────────────┘    └──────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure

### Cloud Architecture (Production)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AWS / VERCEL                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              FRONTEND                                        │    │
│  │  Vercel Edge Network → Global CDN → SSL → PWA                               │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                            │
│                                         ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              BACKEND                                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │    │
│  │  │  API Pod 1  │  │  API Pod 2  │  │  API Pod N  │  │  Worker     │          │    │
│  │  │  (Auto-     │  │  (Auto-     │  │  (Auto-     │  │  (BullMQ)   │          │    │
│  │  │   Scale)    │  │   Scale)    │  │   Scale)    │  │             │          │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │    │
│  │         │                │                │                │                 │    │
│  └─────────┼────────────────┼────────────────┼────────────────┼──────────────────┘    │
│            │                │                │                │                    │
│            ▼                ▼                ▼                ▼                    │
│  ┌──────────────────┐  ┌────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   MongoDB Atlas   │  │   Redis    │  │  S3 Bucket  │  │   Sentry    │            │
│  │   (Primary DB)    │  │  (Cache)   │  │  (Media)    │  │  (Tracing)  │            │
│  └──────────────────┘  └────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Scaling Strategy

| Component | Strategy |
|-----------|----------|
| **API Server** | Horizontal Pod Autoscaling (HPA) |
| **Database** | MongoDB Atlas Multi-Region |
| **Cache** | Redis Cluster with Read Replicas |
| **CDN** | Vercel Edge Network |
| **Queue** | BullMQ with Redis |

---

## Deployment

### Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Development** | localhost:8000 | Local development |
| **Staging** | staging.interviewminds.com | Pre-production testing |
| **Production** | api.interviewminds.com | Live production |

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD Pipeline                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PUSH      →  2. BUILD        →  3. TEST      →  4. DEPLOY            │
│     GitHub        Turborepo          Vitest         Vercel/Render          │
│                   (Parallel)       (28 tests)      (Auto)                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Pre-commit Checks:                                                  │   │
│  │  • ESLint → Prettier → TypeScript → Tests                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Deployment:                                                          │   │
│  │  • Frontend: Vercel (automatic on main branch)                      │   │
│  │  • Backend: Render/Docker (triggered on tag)                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Scalability

### Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time | < 200ms (p95) |
| AI Response Time | < 500ms (Groq) |
| Page Load Time | < 2s (LCP) |
| Uptime | 99.9% |
| Concurrent Users | 10,000+ |

### Optimization Strategies

- **Caching:** Redis for API responses, CDN for static assets
- **Database:** Connection pooling, query optimization, indexing
- **Code Splitting:** React lazy loading, route-based splitting
- **Image Optimization:** WebP, lazy loading, CDN

---

## Monitoring & Observability

| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking, performance monitoring |
| **Prometheus** | Metrics collection |
| **Grafana** | Dashboards, visualization |
| **Datadog** | APM, log aggregation |
| **OpenTelemetry** | Distributed tracing |

---

## Production Ready Features

- ✅ **79 Backend Services** - All enterprise features implemented
- ✅ **45 Frontend Services** - Complete API integration
- ✅ **15 Pages** - Full user interface
- ✅ **32 API Routes** - RESTful endpoints
- ✅ **Full Security** - E2E, biometric, SSO, RBAC
- ✅ **Video Proctoring** - TensorFlow.js real-time analysis
- ✅ **AI/ML** - Groq LLM, multimodal analysis
- ✅ **Multi-tenant** - Enterprise isolation
- ✅ **GDPR Compliant** - Data export, consent, audit

**InterviewMinds - Enterprise-Grade AI Mock Interview Platform**