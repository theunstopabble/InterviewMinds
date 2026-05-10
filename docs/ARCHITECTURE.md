# InterviewMinds Architecture

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│  │   Vercel        │    │   Mobile App     │    │    Web App       │    │
│  │   (Frontend)    │    │   (PWA)           │    │   (React SPA)    │    │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    │
│           │                      │                      │               │
└───────────┼──────────────────────┼──────────────────────┼───────────────┘
            │                      │                      │
            └──────────────────────┴──────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOAD BALANCER / CDN                                │
│                    (Vercel Edge Network / Nginx)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (Express)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Middleware Stack                                                     │   │
│  │  1. CORS → 2. Correlation ID → 3. Metrics → 4. Helmet → 5. Timeout  │   │
│  │  6. Sanitization → 7. Rate Limit → 8. Auth → 9. RBAC → 10. Audit   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   REST API      │    │   GraphQL       │    │   WebSocket     │
│   (Express)     │    │   (Apollo)      │    │   (Socket.IO)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │   Groq      │   │   Gemini    │   │   Azure     │   │   Piston    │  │
│  │   (AI)      │   │   (AI)      │   │   (TTS)     │   │   (Compiler)│  │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘  │
│         │                │                │                │          │
│         └────────────────┬┴────────────────┴────────────────┘          │
│                          │                                               │
│                   ┌──────┴──────┐                                        │
│                   │ Circuit     │                                        │
│                   │ Breakers    │                                        │
│                   └─────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                         │
│                                                                              │
│  ┌─────────────────────────┐         ┌─────────────────────────┐         │
│  │      MongoDB            │         │         Redis            │         │
│  │  (Primary Database)     │         │  (Cache + Queue)         │         │
│  │                         │         │                         │         │
│  │  - Users                │         │  - Rate Limiting        │         │
│  │  - Resumes              │         │  - Session Cache        │         │
│  │  - Interviews           │         │  - Compiler Cache       │         │
│  │  - Messages             │         │  - BullMQ Jobs          │         │
│  │  - Audit Logs           │         │  - CSRF Tokens          │         │
│  └─────────────────────────┘         └─────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Microservices Architecture (Monorepo)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        InterviewMinds Monorepo                              │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                         Root Package.json                           │    │
│   │                    npm workspaces: apps/*, packages/*              │    │
│   │                    turbo.json (build orchestration)                │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐  │
│  │         apps/api            │    │          apps/web               │  │
│  │  ┌────────────────────────┐ │    │  ┌───────────────────────────┐   │  │
│  │  │ Express Server         │ │    │  │ React + Vite + TypeScript│   │  │
│  │  │                        │ │    │  │                           │   │  │
│  │  │ ┌────────────────────┐ │ │    │  │ Components:              │   │  │
│  │  │ │ Routes            │ │ │    │  │ - CodeEditor (Monaco)    │   │  │
│  │  │ │ - chat.ts         │ │ │    │  │ - WebcamAnalysis (TF.js)│   │  │
│  │  │ │ - compiler.ts      │ │ │    │  │ - OutputConsole          │   │  │
│  │  │ │ - interview.ts    │ │ │    │  │ - ResumeUpload           │   │  │
│  │  │ │ - resume.ts       │ │ │    │  │ - ProctoringUI           │   │  │
│  │  │ │ - tts.ts          │ │ │    │  │                           │   │  │
│  │  │ └────────────────────┘ │ │    │  │ Hooks:                    │   │  │
│  │  │                        │ │    │  │ - useSpeech (STT/TTS)     │   │  │
│  │  │ ┌────────────────────┐ │ │    │  │ - useSocket (Real-time)   │   │  │
│  │  │ │ Middleware        │ │ │    │  │ - useProctoring          │   │  │
│  │  │ │ - auth.ts         │ │ │    │  │ - useAudioAnalysis       │   │  │
│  │  │ │ - rbac.ts         │ │ │    │  │                           │   │  │
│  │  │ │ - audit.ts        │ │ │    │  └───────────────────────────┘   │  │
│  │  │ │ - upload.ts       │ │ │    │                                  │  │
│  │  │ └────────────────────┘ │ │    │  Pages:                          │  │
│  │  │                        │ │    │  - DashboardPage               │  │
│  │  │ ┌────────────────────┐ │ │    │  - InterviewPage               │  │
│  │  │ │ Models            │ │ │    │  - FeedbackPage                │  │
│  │  │ │ - Interview       │ │ │    │  - SignInPage                  │  │
│  │  │ │ - Resume          │ │ │    │                                  │  │
│  │  │ │ - Message         │ │ │    └─────────────────────────────────┘  │
│  │  │ │ - UserRole        │ │ │                                          │
│  │  │ │ - AuditLog        │ │ │    ┌─────────────────────────────────┐  │
│  │  │ └────────────────────┘ │ │    │         packages/shared        │  │
│  │  │                        │ │    │  - IResume interface           │  │
│  │  │ ┌────────────────────┐ │ │    │  - ChatMessage interface      │  │
│  │  │ │ Lib                │ │ │    │  - IInterview interface       │  │
│  │  │ │ - security.ts     │ │ │    │  - IFeedback interface        │  │
│  │  │ │ - circuitBreaker  │ │ │    └─────────────────────────────────┘  │
│  │  │ │ - queue.ts        │ │ │                                          │
│  │  │ │ - redis.ts        │ │ │                                          │
│  │  │ │ - socket.ts       │ │ │                                          │
│  │  │ └────────────────────┘ │ │                                          │
│  │  └────────────────────────┘ │                                          │
│  └─────────────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Request Processing Flow                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Client Request
        │
        ▼
┌───────────────────┐
│  DNS Resolution   │
│  (Vercel Edge)   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Cloudflare      │
│  WAF (CSP, DDoS) │
└────────┬──────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Express Middleware Stack                      │
├────────────────────────────────────────────────────────────────────┤
│  1. CORS              - Validate origin, allow credentials          │
│  2. Correlation ID    - Generate/extract request ID                │
│  3. Metrics           - Record request duration                    │
│  4. Helmet           - Security headers (CSP, HSTS, etc.)         │
│  5. Request Timeout  - 30s default timeout                       │
│  6. Sanitization     - Block XSS, NoSQL injection                 │
│  7. Rate Limiter     - Redis-backed, 200 req/15min                │
│  8. Auth (Clerk)     - Validate JWT token                         │
│  9. RBAC             - Attach user role to request                │
│  10. Audit Log       - Log request (async, non-blocking)          │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────┐
│   Route Handler      │
│   (Controller)       │
└────────┬──────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────────┐
│ Read │  │ Write      │
│      │  │            │
└──────┘  └─────┬──────┘
               │
               ▼
        ┌──────────────────┐
        │ Business Logic   │
        │ + AI Calls       │
        │ + Circuit Breaker│
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Response        │
        │ + Set Headers   │
        │ + Format JSON    │
        └──────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ Audit Log       │ (async, fire-and-forget)
        │ Finish Event    │
        └──────────────────┘
```

---

## Data Flow Diagrams

### Resume Upload Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │     │  Express     │     │   BullMQ     │     │  Worker     │
│              │     │   Server     │     │   Queue      │     │  (Resume)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ POST /resume/upload                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │              Create Resume              │                    │
       │              (status: pending)          │                    │
       │                    │                    │                    │
       │                    │   addJob()         │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │              202 Accepted              │                    │
       │<──────────────────│                    │                    │
       │                    │                    │                    │
       │                    │                    │      Process Job   │
       │                    │                    │<──────────────────│
       │                    │                    │                    │
       │                    │                    │    PDF Parse      │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │   Text Splitter   │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │  Embeddings (TF)  │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │  Update Resume     │
       │                    │                    │  (status: done)   │
       │                    │                    │                    │
       │  GET /resume/:id/status                  │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │              200 OK                    │                    │
       │<──────────────────│                    │                    │
```

### Interview Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │     │  Express     │     │    Groq      │     │  MongoDB    │
│  (React)     │     │   Server     │     │   (AI LLM)   │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ POST /chat         │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │              Check Circuit              │                    │
       │              Breaker State             │                    │
       │                    │                    │                    │
       │              Load Resume               │                    │
       │                    │────────────────────>│                    │
       │                    │                    │                    │
       │                    │              AI Chat Completion        │
       │                    │<────────────────────│                    │
       │                    │                    │                    │
       │              200 OK                    │                    │
       │<──────────────────│                    │                    │
       │                    │                    │                    │
       │                    │                    │                    │
       │ POST /interview/end                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │              AI Scoring                │                    │
       │              (weighted ensemble)       │                    │
       │                    │────────────────────>│                    │
       │                    │                    │                    │
       │              Save Interview            │                    │
       │                    │────────────────────>│                    │
       │                    │                    │                    │
       │              200 OK (score, metrics)  │                    │
       │<──────────────────│                    │                    │
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Security Layer Architecture                          │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌────────────────────┐
                          │   External Threats  │
                          │  - DDoS             │
                          │  - SQL/NoSQL Inject │
                          │  - XSS              │
                          │  - CSRF             │
                          └──────────┬──────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Defense Layers                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Network Security                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  • Cloudflare WAF                                                    │    │
│  │  • Vercel DDoS Protection                                            │    │
│  │  • Nginx Rate Limiting                                              │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 2: Transport Security                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  • TLS 1.3 (HTTPS only)                                             │    │
│  │  • HSTS (Strict-Transport-Security)                                 │    │
│  │  • Certificate Pinning                                              │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 3: Application Security                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  • Helmet.js (CSP, X-Frame-Options, etc.)                          │    │
│  │  • CSRF Tokens (Double-submit cookie pattern)                       │    │
│  │  • Input Sanitization (XSS, NoSQL injection prevention)            │    │
│  │  • JWT Verification (Clerk)                                         │    │
│  │  • RBAC (Role-based access control)                                │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 4: API Security                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  • Redis-backed Rate Limiting                                       │    │
│  │  • GraphQL Query Depth Limiting                                     │    │
│  │  • Request Size Limits (10MB max)                                   │    │
│  │  • Request Timeout (30s)                                           │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 5: External Service Protection                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  • Circuit Breakers (Groq, Gemini, Azure, Piston)                 │    │
│  │  • API Key Rotation                                                  │    │
│  │  • Service Mesh (internal only)                                     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Observability Stack                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │                    Metrics (Prometheus)                            │
  │                                                                    │
  │  • HTTP Request Duration (histogram)                               │
  │  • HTTP Request Total (counter)                                    │
  │  • AI Call Duration (histogram)                                   │
  │  • Interviews Completed (counter)                                  │
  │  • Resumes Uploaded (counter)                                     │
  │  • Code Executions (counter)                                       │
  │  • Active Socket Connections (gauge)                              │
  │                                                                    │
  │  Endpoint: /metrics                                                │
  └────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                    Logging (Pino)                                  │
  │                                                                    │
  │  • Structured JSON logs                                            │
  │  • Correlation IDs for request tracing                             │
  │  • Log levels: fatal, error, warn, info, debug                     │
  │  • Pretty printing in development                                  │
  │  • JSON output in production                                       │
  └────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                    Tracing (Sentry + Correlation)                 │
  │                                                                    │
  │  • Exception tracking                                              │
  │  • Performance monitoring                                          │
  │  • Custom breadcrumbs                                              │
  │  • User context                                                    │
  │  • Release tracking                                                │
  └────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                    Health Checks                                   │
  │                                                                    │
  │  GET /health                                                       │
  │  {                                                                 │
  │    "status": "ok",                                                 │
  │    "services": { "mongo": "connected", "redis": "connected" },   │
  │    "circuitBreakers": { "groq": "closed", "gemini": "closed" }    │
  │  }                                                                 │
  └────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Production Deployment                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Vercel (Frontend)                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  • Edge Network (Global CDN)                                        │    │
│  │  • Automatic SSL                                                   │    │
│  │  • ISR (Incremental Static Regeneration)                           │    │
│  │  • Serverless Functions (API routes)                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ API Calls
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Render / Docker (Backend)                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Container Orchestration                                           │    │
│  │  • Docker Compose (dev)                                            │    │
│  │  • Kubernetes (production, optional)                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   API Server    │  │   Redis         │  │   MongoDB      │            │
│  │   (Node.js)    │  │   (Cache/Queue) │  │   (Database)    │            │
│  │                 │  │                 │  │                 │            │
│  │ • Express       │  │ • Rate Limit    │  │ • Resumes       │            │
│  │ • Apollo GraphQL│  │ • BullMQ       │  │ • Interviews    │            │
│  │ • Socket.IO    │  │ • Cache        │  │ • Messages      │            │
│  │                 │  │                 │  │ • Audit Logs   │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Decisions

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Monorepo** | Turborepo | Efficient builds, shared code, caching |
| **Frontend** | React 18 + Vite | Fast HMR, optimized bundles |
| **UI** | Shadcn UI + Tailwind | Modern, accessible, customizable |
| **Backend** | Express + TypeScript | Type safety, middleware ecosystem |
| **Database** | MongoDB | Flexible schema for interviews/messages |
| **Cache** | Redis | Rate limiting, session, BullMQ |
| **AI** | Groq (Llama 3) | Ultra-low latency (<500ms) |
| **Auth** | Clerk | Simple integration, social login |
| **Observability** | Sentry + Prometheus | Error tracking + metrics |

---

## Scalability Considerations

1. **Horizontal Scaling**: API server stateless, can add more instances
2. **Database Sharding**: MongoDB supports sharding for large datasets
3. **Caching Strategy**: Redis for rate limits, compiler cache, sessions
4. **Async Processing**: BullMQ for resume processing, heavy computations
5. **CDN**: Vercel edge for static assets, API responses cached
6. **Connection Pooling**: MongoDB pool size 5-20, Redis connection reuse

---

## Enterprise Services Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTERPRISE SERVICES LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐             │
│  │  Core Accuracy   │ │    Security      │ │   Proctoring     │             │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤             │
│  │ jobMatching.ts   │ │ e2eEncryption.ts │ │ videoProctoring  │             │
│  │ questionGeneration│ │ biometricAuth.ts│ │ .ts              │             │
│  │ codeAnalysis.ts  │ │ fraudDetection.ts│ │                  │             │
│  │                  │ │ geoFencing.ts    │ │                  │             │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘             │
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐             │
│  │ Truthfulness     │ │  Integrations    │ │  Infrastructure  │             │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤             │
│  │ resumeVerification│ │ ssoIntegration.ts│ │ multiTenancy.ts  │             │
│  │ answerValidation │ │ webhooks.ts      │ │ compliance.ts    │             │
│  │ dynamicQuestions │ │ atsIntegration.ts│ │                  │             │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                           Analytics                                  │    │
│  ├──────────────────────────────────────────────────────────────────────┤    │
│  │                        analytics.ts                                │    │
│  │    (Dashboard + Predictive + Pipeline + Training Recommendations)  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Enterprise Feature Summary

| Phase | Services | Count |
|-------|-----------|-------|
| Phase 1: Core Accuracy | jobMatching, questionGeneration, codeAnalysis | 3 |
| Phase 2: Security | e2eEncryption, biometricAuth, fraudDetection, geoFencing | 4 |
| Phase 3: Proctoring | videoProctoring | 1 |
| Phase 4: Truthfulness | resumeVerification, answerValidation, dynamicQuestions | 3 |
| Phase 5: Integrations | ssoIntegration, webhooks, atsIntegration | 3 |
| Phase 6: Infrastructure | multiTenancy, compliance | 2 |
| Phase 7: Analytics | analytics | 1 |

**Total: 18 Enterprise Services | 17 Route Files | 24 API Prefixes**

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY STACK                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Authentication                                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │  Clerk   │  │Biometric │  │   E2E    │  │   SSO    │           │    │
│  │  │   JWT    │  │   Face/  │  │ Encryption│  │ OAuth/   │           │    │
│  │  │          │  │ Voice/FP │  │   RSA    │  │   SAML   │           │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Authorization                                 │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │   RBAC   │  │  Audit   │  │ Rate     │  │ Geo-     │           │    │
│  │  │ Role-Based│  │  Logging │  │ Limiting │  │ Fencing  │           │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       Fraud Detection                                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │ Browser  │  │ Behavior │  │ Session  │  │  Anomaly │           │    │
│  │  │Fingerprint│  │ Analysis │  │ Monitoring│ │ Detection│           │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Compliance Architecture

| Framework | Components |
|-----------|------------|
| **SOC 2** | Audit logging, encryption, access controls, security monitoring |
| **GDPR** | Data export, deletion, consent management, data subject requests |
| **HIPAA** | Enhanced encryption, BAA-ready, PHI protection |
| **ISO 27001** | ISMS, risk assessment, security controls |

---