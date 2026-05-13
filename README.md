<div align="center">
  <img src="apps/web/public/pwa-192x192.png" alt="InterviewMinds" width="100" height="100"/>
  
  # InterviewMinds
  
  **Enterprise-Grade AI Mock Interview Platform**
  
  *AI-driven interview simulation with real-time proctoring, multimodal analysis, CRDT collaboration, and production-grade infrastructure — built for organizations requiring secure, scalable candidate evaluation.*

  <br/>

  [![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-interviewminds.vercel.app-000000?style=for-the-badge)](https://interviewminds.vercel.app/)
  [![GitHub](https://img.shields.io/badge/GitHub-theunstopabble-181717?style=for-the-badge&logo=github)](https://github.com/theunstopabble/InterviewMinds)
  [![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

  <br/>

  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=flat-square&logo=node.js&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
  ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
  ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io&logoColor=white)
  ![TensorFlow](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=flat-square&logo=tensorflow&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=flat-square&logo=vite&logoColor=white)

</div>

---

## 🏗️ Architecture Overview


```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            INTERVIEWMINDS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  FRONTEND — React 18 + Vite 7.3 + Tailwind CSS + Shadcn UI          │  │
│  │  ├── Clerk Auth (OAuth/Email)    ├── Monaco Code Editor              │  │
│  │  ├── face-api.js (Browser ML)    ├── Socket.IO Client                │  │
│  │  ├── Recharts (Analytics)        └── PWA Support                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │ HTTPS + JWT + WebSocket                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  BACKEND — Node.js 20 + Express 4.21 + TypeScript 5.3                │  │
│  │  ├── 81 Service Modules          ├── 38 REST Route Files             │  │
│  │  ├── GraphQL (Apollo Server 4)   ├── Socket.IO 4.8 (Real-time)      │  │
│  │  ├── BullMQ Workers              ├── Circuit Breaker Pattern         │  │
│  │  └── ML Pipeline (face-api.js + TensorFlow.js)                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────────┐  │
│  │  MongoDB     │  │  Redis       │  │  External Services               │  │
│  │  Atlas       │  │  (Upstash)   │  │  ├── Groq (Llama 3.3-70b LLM)   │  │
│  │              │  │              │  │  ├── Azure Speech (TTS/STT)      │  │
│  │  7 Models    │  │  Cache       │  │  ├── Piston (Code Execution)     │  │
│  │  Pool: 20    │  │  BullMQ      │  │  ├── Cloudinary (Media)          │  │
│  │              │  │  Rate Limit  │  │  └── WebRTC (STUN/TURN)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features — 18 Production Phases

| Phase | Domain | Key Features |
|:-----:|--------|-------------|
| **1** | Core Interview | AI-powered chat (Groq Llama 3.3-70b), resume parsing (pdf2json + embeddings), dynamic follow-up questions |
| **2** | Security | E2E encryption (RSA-4096 + AES-256-GCM + PBKDF2), biometric auth, fraud detection, geo-fencing |
| **3** | Video Proctoring | ML face detection (face-api.js), eye tracking, expression analysis, screen monitoring |
| **4** | Assessment | Code execution (Piston API), answer validation, job matching, skill gap analysis |
| **5** | Integrations | SSO (OAuth/SAML), webhooks (HMAC-signed), ATS integration |
| **6** | Enterprise | Multi-tenancy, RBAC (candidate/interviewer/admin), tenant isolation |
| **7** | Analytics | MongoDB aggregation pipelines, trend analysis, top performers, pipeline tracking |
| **8** | Scheduling | Calendar booking, timezone handling, question bank, scorecards, PDF/CSV reports |
| **9** | Next-Gen AI | LLM interviewer with memory/personas, multimodal voice tone analysis (Groq primary), smart assessment |
| **10** | Infrastructure | Circuit breakers, connection pooling, CDN integration, graceful shutdown |
| **11** | Collaboration | CRDT collaborative editor (three-way merge), whiteboard (MongoDB persistence), video calls (WebRTC + STUN/TURN + SFU) |
| **12** | Predictive Analytics | Attrition prediction, performance forecasting, anomaly detection, sentiment analysis |
| **13** | Developer Experience | GitHub/GitLab integration, code review, sandboxed execution, test runner |
| **14** | Compliance | GDPR data export, PII masking, data retention policies, immutable audit trails |
| **15** | Integration Ecosystem | HRIS (Workday/BambooHR/SAP), Slack/Teams/Discord, Zoom/Google Meet, background checks |
| **16** | Mobile | Offline support, push notifications, responsive mobile API |
| **17** | Observability | Prometheus metrics, Pino structured logging, Sentry error tracking, health checks |
| **18** | AI Agents | Autonomous screening/scheduling/feedback agents, workflow automation |

---

## 🛠️ Technology Stack

### Core

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | Node.js | 20.x |
| **Language** | TypeScript | 5.3 |
| **Frontend** | React + Vite + Tailwind CSS + Shadcn UI | 18 / 7.3 / 3.4 |
| **Backend** | Express + Socket.IO + Apollo Server | 4.21 / 4.8 / 4.11 |
| **Database** | MongoDB (Mongoose) | 8.x |
| **Cache/Queue** | Redis (ioredis) + BullMQ | 5.10 / 5.45 |
| **Monorepo** | Turborepo + npm workspaces | latest |

### AI & Machine Learning

| Service | Model/Tech | Purpose |
|---------|-----------|---------|
| Groq | Llama 3.3-70b-versatile | Interview chat, voice analysis, resume screening, AI agents |
| face-api.js | SSD MobileNet + Landmarks + Expressions | Real-time face detection & proctoring |
| TensorFlow.js | Runtime | ML model execution (server-side) |
| Azure Speech SDK | Neural TTS | Text-to-speech for AI interviewer |
| Piston API | Multi-language sandbox | Secure code execution |

### Security

| Feature | Implementation |
|---------|---------------|
| Authentication | Clerk (OAuth + Email) |
| Authorization | Custom RBAC with wildcard admin |
| Encryption | RSA-4096 + AES-256-GCM + PBKDF2 |
| API Security | Helmet CSP + Rate Limiting + CSRF + Input Sanitization |
| Audit | Immutable audit logs with correlation IDs |

---

## 📁 Project Structure

```
InterviewMinds/
├── apps/
│   ├── api/                        # Backend API Server
│   │   ├── src/
│   │   │   ├── config/            # Service configurations (Cloudinary)
│   │   │   ├── graphql/           # Apollo Server schema + resolvers
│   │   │   ├── lib/               # 81 business logic service modules
│   │   │   │   ├── aiAgent.ts             # AI agent orchestration
│   │   │   │   ├── analytics.ts           # MongoDB aggregation analytics
│   │   │   │   ├── collaborativeEditor.ts # CRDT three-way merge editor
│   │   │   │   ├── e2eEncryption.ts       # RSA-4096 + AES-256-GCM
│   │   │   │   ├── faceMLService.ts       # face-api.js model loading
│   │   │   │   ├── multimodalAI.ts        # Groq voice tone analysis
│   │   │   │   ├── videoCall.ts           # WebRTC + STUN/TURN + SFU
│   │   │   │   ├── videoProctoring.ts     # ML-based proctoring
│   │   │   │   ├── whiteboard.ts          # Persistent whiteboard
│   │   │   │   └── ... (81 total)
│   │   │   ├── middleware/         # Auth, RBAC, audit, security
│   │   │   ├── models/            # 7 Mongoose schemas
│   │   │   ├── routes/            # 38 Express route files
│   │   │   └── tests/             # Vitest + fast-check PBT
│   │   ├── models/face-api/       # ML model weights
│   │   └── Dockerfile             # Multi-stage production build
│   │
│   └── web/                        # Frontend Client
│       ├── src/
│       │   ├── components/         # Shadcn UI + custom components
│       │   ├── pages/              # Route pages
│       │   ├── hooks/              # Custom React hooks
│       │   ├── services/           # API client services
│       │   └── lib/                # Utilities
│       └── vercel.json             # Deployment config
│
├── packages/
│   └── shared/                     # Shared TypeScript types & interfaces
├── docs/                           # Comprehensive documentation
│   ├── API.md                      # REST + GraphQL API reference
│   ├── ARCHITECTURE.md             # System design & patterns
│   ├── DB_SCHEMA.md                # MongoDB models & indexes
│   ├── DEPLOYMENT.md               # Production deployment guide
│   ├── EDGE_CASES.md               # Error handling & graceful degradation
│   ├── TECH_STACK.md               # Complete technology inventory
│   └── WORKFLOW.md                 # Development workflow & CI/CD
├── .github/workflows/main.yml      # CI pipeline (typecheck + test + build)
├── turbo.json                      # Turborepo build config
└── package.json                    # Root workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | 20+ | ✅ |
| npm | 10+ | ✅ |
| MongoDB | Atlas (free tier) or local | ✅ |
| Redis | Upstash (free) or local | Optional |

### Installation

```bash
# Clone the repository
git clone https://github.com/theunstopabble/InterviewMinds.git
cd InterviewMinds

# Install all workspace dependencies
npm install --legacy-peer-deps

# Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your API keys (see .env.example for details)

# Start development (frontend + backend simultaneously)
npm run dev
```

### Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React app with hot reload |
| Backend API | http://localhost:8000 | Express REST + WebSocket |
| GraphQL | http://localhost:8000/graphql | Apollo Playground (dev only) |
| Health Check | http://localhost:8000/health | Service status |
| Metrics | http://localhost:8000/metrics | Prometheus format |

---

## 🧪 Testing

```bash
# Run backend tests
cd apps/api && npm run test

# Run with coverage
cd apps/api && npm run test:coverage

# Watch mode
cd apps/api && npm run test:watch
```

**Test Suite:** 39 property-based tests  
- 7 bug condition exploration tests (verify defects are fixed)  
- 32 preservation tests (verify no regressions)  
**Framework:** Vitest 2.1 + fast-check 3.22

---

## 🌐 Deployment

| Component | Platform | Status |
|-----------|----------|--------|
| Frontend | [Vercel](https://interviewminds.vercel.app) | ✅ Live |
| Backend | [Render](https://render.com) (Docker) | ✅ Live |
| Database | MongoDB Atlas (Free M0) | ✅ Connected |
| Cache | Upstash Redis (Free) | ✅ Connected |

### CI/CD Pipeline

```
Push to main → GitHub Actions → Typecheck → Test → Build → Auto-deploy
```

---

## 🔑 Environment Variables

The app requires only **5 keys** to run. All other features gracefully degrade without their keys (no crash).

| Variable | Required | Free Tier Available |
|----------|----------|-------------------|
| `MONGO_URI` | ✅ | MongoDB Atlas Free (512MB) |
| `CLERK_PUBLISHABLE_KEY` | ✅ | Clerk Free (10k MAU) |
| `CLERK_SECRET_KEY` | ✅ | Clerk Free |
| `GROQ_API_KEY` | ✅ | Groq Free (rate limited) |
| `JWT_SECRET` | ✅ | Self-generated |
| `REDIS_URL` | Optional | Upstash Free (10k/day) |
| `CLOUDINARY_*` | Optional | Cloudinary Free (25GB) |
| `AZURE_SPEECH_*` | Optional | Azure Free (5hr/mo) |
| `SENTRY_DSN` | Optional | Sentry Free (5k errors/mo) |

> See [`apps/api/.env.example`](apps/api/.env.example) for the complete list of 50 environment variables.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`docs/API.md`](docs/API.md) | Complete REST + GraphQL API reference |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, middleware pipeline, data flow |
| [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md) | 7 MongoDB models with field-level docs |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Production deployment (Vercel + Render + Docker) |
| [`docs/EDGE_CASES.md`](docs/EDGE_CASES.md) | Error handling & graceful degradation |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Complete technology inventory (50+ packages) |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | Development workflow, testing, CI/CD |

---

## 🏛️ Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Groq over OpenAI** | Sub-500ms latency, free tier, Llama 3.3-70b quality |
| **CRDT over OT** | Simpler implementation, commutative operations, no central server needed |
| **face-api.js with fallback** | ML when models available, content-derived analysis otherwise (never static) |
| **Three-way merge** | Preserves concurrent edits from multiple users without data loss |
| **Circuit breaker pattern** | Prevents cascading failures when external services (Groq, Piston) go down |
| **BullMQ over in-process** | Reliable async jobs with retry, backoff, and persistence |
| **Clerk over custom auth** | Enterprise-grade auth without building from scratch |
| **Turborepo** | Shared types, parallel builds, intelligent caching |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with conventional commits: `git commit -m 'feat: add feature'`
4. Ensure `npm run typecheck` passes
5. Push and open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  
  **Built by [Gautam Kumar](https://gautam-kr.vercel.app)**

  [![Portfolio](https://img.shields.io/badge/Portfolio-gautam--kr.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://gautam-kr.vercel.app)
  [![LinkedIn](https://img.shields.io/badge/LinkedIn-gautamkr62-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/gautamkr62)
  [![GitHub](https://img.shields.io/badge/GitHub-theunstopabble-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/theunstopabble)
  [![Email](https://img.shields.io/badge/Email-gautamkumar43421-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:gautamkumar43421@gmail.com)

</div>
