# Architecture

**Version:** 2.0.0  
**Last Updated:** May 2026

---

## System Overview

InterviewMinds follows a monorepo architecture with clear separation between frontend, backend, and shared packages. The system is designed for horizontal scalability with stateless API servers, persistent data stores, and real-time communication via WebSockets.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │  Browser │  │  Mobile  │  │  Webhook │  │  External (ATS/HRIS) │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
└───────┼──────────────┼──────────────┼───────────────────┼───────────────┘
        │              │              │                    │
        ▼              ▼              ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER / CDN                              │
│                    (Vercel Edge / Cloudflare)                            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Frontend    │    │   Backend API    │    │   WebSocket      │
│   (Vercel)    │    │   (Express)      │    │   (Socket.IO)    │
│               │    │                  │    │                  │
│  React 18     │    │  REST + GraphQL  │    │  Real-time       │
│  Vite 7.3     │    │  38 route files  │    │  Collaboration   │
│  Tailwind     │    │  81 services     │    │  Video signaling │
└───────────────┘    └────────┬─────────┘    └────────┬─────────┘
                              │                       │
                              ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MIDDLEWARE PIPELINE                              │
│  CORS → Correlation ID → Metrics → Security Headers → Timeout →        │
│  Sanitization → Rate Limiting → Auth (Clerk) → RBAC → Audit → Handler  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   MongoDB     │    │     Redis        │    │  External APIs   │
│   (Atlas)     │    │   (Cloud)        │    │                  │
│               │    │                  │    │  Groq (LLM)      │
│  7 Models     │    │  Sessions        │    │  Piston (Code)   │
│  Pool: 20     │    │  Rate Limits     │    │  Cloudinary      │
│               │    │  BullMQ Jobs     │    │  Azure Speech    │
└───────────────┘    └──────────────────┘    └──────────────────┘
```

---

## Monorepo Structure

```
interview-minds/
├── apps/
│   ├── api/          # Backend application
│   └── web/          # Frontend application
├── packages/
│   └── shared/       # Shared types and utilities
├── turbo.json        # Build pipeline configuration
└── package.json      # Workspace root
```

**Build orchestration:** Turborepo manages parallel builds, caching, and dependency ordering across workspaces.

---

## Backend Architecture

### Service Layer (81 modules in `apps/api/src/lib/`)

Services are organized by domain concern:

| Domain | Services |
|--------|----------|
| AI & ML | `aiAgent`, `aiAnalysis`, `multimodalAI`, `llmInterviewer`, `smartAssessment`, `faceMLService`, `videoProctoring`, `sentimentAnalysis` |
| Interview | `mockInterview`, `panelInterview`, `dynamicQuestions`, `questionGeneration`, `questionBank`, `answerValidation` |
| Collaboration | `collaborativeEditor`, `whiteboard`, `videoCall`, `collaborationTools`, `waitingRoom` |
| Security | `security`, `e2eEncryption`, `biometricAuth`, `fraudDetection`, `geoFencing`, `piiMasking` |
| Infrastructure | `circuitBreaker`, `connectionPool`, `queue`, `redis`, `responseCache`, `dedup`, `eventBus` |
| Integration | `atsIntegration`, `githubIntegration`, `gitlabIntegration`, `hrisIntegration`, `communicationIntegration`, `ssoIntegration` |
| Observability | `logger`, `metrics`, `metricsAggregator`, `sentry`, `monitoringService`, `loggingService` |
| Analytics | `analytics`, `predictiveAnalytics`, `anomalyDetector`, `reportGenerator`, `reportingService` |
| Compliance | `compliance`, `auditTrail`, `dataRetention` |

### Route Layer (38 files in `apps/api/src/routes/`)

Each route file maps to a REST API domain. Routes are mounted with middleware chains in `src/index.ts`.

### Middleware Pipeline

Request processing follows a strict ordering:

```
1. CORS (environment-driven whitelist)
2. JSON Body Parser (10MB limit)
3. Correlation ID (X-Correlation-ID header injection)
4. Request Logging (Pino structured logs)
5. Trust Proxy (for load balancer IP forwarding)
6. Prometheus Metrics (request duration/counters)
7. Security Headers (Helmet)
8. Request Timeout (30s default)
9. Input Sanitization (NoSQL injection + XSS prevention)
10. Rate Limiting (general: all routes, AI: stricter, upload: file-specific)
11. Authentication (Clerk requireAuth)
12. RBAC (role attachment + permission check)
13. Audit Logging (action recording)
14. Route Handler
```

---

## Authentication & Authorization

### Auth Flow

```
Client → Clerk SDK → JWT Token → Express Middleware → req.auth.userId
                                                          ↓
                                              UserRole Model (MongoDB)
                                                          ↓
                                              req.userRole = "candidate" | "interviewer" | "admin"
                                                          ↓
                                              RBAC Permission Check (with wildcard support)
```

### Role Hierarchy

| Role | Permissions |
|------|------------|
| `candidate` | Own interviews, resume upload, practice sessions |
| `interviewer` | Manage interviews, view candidates, scoring |
| `admin` | Full access (wildcard `*`), user management, audit logs |

---

## Real-Time Architecture

### Socket.IO Events

The Socket.IO server handles multiple real-time domains:

| Namespace | Events | Purpose |
|-----------|--------|---------|
| Collaboration | `collab:*` | CRDT document sync, cursor positions |
| Whiteboard | `whiteboard:*` | Drawing elements, persistence sync |
| Video | `video:*` | WebRTC signaling, participant management |
| Chat | `message:*` | Real-time messaging |

### Collaborative Editor (CRDT Three-Way Merge)

```
User A edits:  "hello" → "hello world"
User B edits:  "hello" → "hello!"
                    ↓
         Three-Way Merge Algorithm
         Base: "hello"
         Current: "hello world" (A's change applied first)
         Incoming: "hello!" (B's change)
                    ↓
         Result: "hello world!" (both changes preserved)
```

The collaborative editor (`src/lib/collaborativeEditor.ts`) implements:
- Per-user base state tracking
- Three-way merge with common prefix/suffix detection
- Non-overlapping change composition
- Overlapping change concatenation (no data loss)
- Version counter for ordering

### Whiteboard Persistence

The whiteboard (`src/lib/whiteboard.ts`) uses a MongoDB persistence layer:
- Elements persist across session recreation via `WhiteboardPersistence` class
- Element-level versioning for conflict resolution
- Room-scoped storage (elements keyed by `roomId`)
- Real-time broadcast via Socket.IO on every mutation

### Video Call (WebRTC + ICE Servers)

```
┌──────────┐                              ┌──────────┐
│  Peer A  │◄─── STUN (NAT Discovery) ──►│  Peer B  │
│          │◄─── TURN (Relay Fallback) ──►│          │
│          │◄─── SDP Offer/Answer ───────►│          │
│          │◄─── ICE Candidates ─────────►│          │
└──────────┘                              └──────────┘
       ↕                                        ↕
       └────── Socket.IO Signaling Server ──────┘
```

The video call system (`src/lib/videoCall.ts`) provides:
- STUN/TURN ICE server configuration from environment variables
- Optional SFU (mediasoup/livekit) for large group calls
- Automatic mesh-to-SFU topology switching based on participant count
- Recording service with lifecycle management
- Session persistence for durability

---

## ML Pipeline Architecture

### Video Proctoring

```
Frame Input (base64)
       ↓
┌──────────────────────────────────┐
│  ML Available?                   │
│  ├── YES: face-api.js inference  │
│  │   ├── SSD MobileNet (detect) │
│  │   ├── 68-point landmarks     │
│  │   └── Expression recognition │
│  └── NO: Content-derived        │
│       ├── Hash-based features    │
│       ├── Entropy analysis       │
│       └── Input-dependent scores │
└──────────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  Analysis Results                │
│  ├── Face Detection (position,   │
│  │   count, confidence)          │
│  ├── Eye Tracking (gaze, blink) │
│  ├── Expressions (7 emotions)   │
│  └── Presence (objects, people)  │
└──────────────────────────────────┘
```

### Multimodal Voice Analysis

```
Audio Transcript
       ↓
┌──────────────────────────────────┐
│  Groq API Available?             │
│  ├── YES: LLM Analysis           │
│  │   ├── Llama 3.3-70b prompt   │
│  │   ├── Acoustic features      │
│  │   └── JSON score extraction   │
│  └── NO: Keyword Heuristic       │
│       ├── Confidence words       │
│       ├── Nervousness markers    │
│       └── Enthusiasm indicators  │
└──────────────────────────────────┘
       ↓
Result: { confidence, nervousness, enthusiasm, clarity, pace, sentiment, source }
```

---

## Data Flow Patterns

### Circuit Breaker

External service calls (Groq, Piston) are wrapped in circuit breakers:

```
CLOSED (normal) → failures exceed threshold → OPEN (reject fast)
                                                    ↓ (timeout)
                                              HALF-OPEN (test one request)
                                                    ↓ (success)
                                              CLOSED (resume normal)
```

### BullMQ Job Processing

```
API Request → Queue Job → Redis (BullMQ) → Worker Process → Result
                                                ↓
                                          MongoDB (persist)
```

Workers handle:
- Resume parsing and chunk embedding
- Interview scoring and feedback generation
- Async video processing

### Graceful Shutdown

```
SIGTERM/SIGINT received
       ↓
1. Stop accepting new connections
2. Close BullMQ queues and workers
3. Close Redis connections
4. Close MongoDB connection pool
5. Exit process
```

---

## Security Architecture

### E2E Encryption

```
Sender                                    Receiver
  │                                          │
  ├── Generate RSA-4096 keypair              │
  ├── Exchange public keys                   │
  ├── Derive AES-256 key (PBKDF2)          │
  ├── Encrypt message (AES-256-GCM)        │
  ├── Sign with RSA private key             │
  │                                          │
  └──────── Encrypted Payload ──────────────►│
                                             ├── Verify RSA signature
                                             ├── Decrypt with AES-256-GCM
                                             └── Plaintext message
```

### Rate Limiting Strategy

| Limiter | Scope | Limit |
|---------|-------|-------|
| General | All routes | Standard requests/window |
| AI | LLM endpoints | Stricter (expensive operations) |
| Upload | File uploads | Size + frequency limited |
| GraphQL | `/graphql` | Query complexity aware |

---

## Deployment Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │     │   Render    │     │   MongoDB   │
│  (Frontend) │     │  (Backend)  │     │   Atlas     │
│             │     │             │     │             │
│  React SPA  │────►│  Docker     │────►│  7 Models   │
│  CDN Edge   │     │  Node 20    │     │  Pool: 20   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │    Redis    │
                    │   Cloud     │
                    │             │
                    │  Sessions   │
                    │  BullMQ     │
                    │  Cache      │
                    └─────────────┘
```
