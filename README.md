<div align="center">
  <img src="apps/web/public/pwa-192x192.png" alt="InterviewMinds - AI Mock Interview Platform by Gautam Kumar" width="100" height="100"/>
  
  # InterviewMinds — Production-grade AI Mock Interview Platform
  
  **Created & Developed by [Gautam Kumar](https://gautam-kr.vercel.app) | Full-Stack Developer | Solo-shipped 4 SaaS products | AI integration
**

_Production-grade AI interview simulation platform with real-time ML proctoring, CRDT collaborative coding, multimodal candidate analysis, and WebRTC video — serving production-level candidate evaluation at scale._

  <br/>

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-interviewminds.vercel.app-000000?style=for-the-badge)](https://interviewminds.vercel.app/)
[![Portfolio](https://img.shields.io/badge/👨‍💻_Developer-gautam--kr.vercel.app-6366f1?style=for-the-badge)](https://gautam-kr.vercel.app)
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

## 👨‍💻 About the Developer

**InterviewMinds** is designed, architected, and built by **[Gautam Kumar](https://gautam-kr.vercel.app)** — a Full-Stack Developer and AI Engineer specializing in production-grade web applications with machine learning integration.

- 🌐 **Portfolio:** [gautam-kr.vercel.app](https://gautam-kr.vercel.app)
- 💼 **LinkedIn:** [linkedin.com/in/gautamkr62](https://www.linkedin.com/in/gautamkr62)
- 🐙 **GitHub:** [github.com/theunstopabble](https://github.com/theunstopabble)
- 📧 **Email:** gautamkumar43421@gmail.com

---

## 📸 Screenshots

<div align="center">

### Dashboard — Real-time Analytics & Performance Metrics

<img src="screenshots/dashboard.png" alt="InterviewMinds Dashboard - AI Interview Analytics by Gautam Kumar" width="90%"/>

<br/><br/>

### Live AI Interview — Voice & Video Analysis

<img src="screenshots/interview.png" alt="InterviewMinds AI Interview - Real-time Voice Analysis and Feedback" width="90%"/>

<br/><br/>

### Code Editor — Collaborative Coding with CRDT Merge

<img src="screenshots/code-editor.png" alt="InterviewMinds Code Editor - Monaco Editor with Real-time Collaboration" width="90%"/>

<br/><br/>

### AI Proctoring — ML Face Detection & Eye Tracking

<img src="screenshots/proctoring.png" alt="InterviewMinds Proctoring - face-api.js ML Face Detection and Expression Analysis" width="90%"/>

</div>

---

## 🏗️ System Architecture

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

InterviewMinds implements **91 enterprise features** across 18 development phases, all production-ready with real API integrations (no mock data):

| Phase  | Domain                  | Key Features                                                                                                          |
| :----: | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **1**  | Core Interview Engine   | AI-powered chat (Groq Llama 3.3-70b), resume parsing (pdf2json + vector embeddings), dynamic follow-up questions      |
| **2**  | Enterprise Security     | E2E encryption (RSA-4096 + AES-256-GCM + PBKDF2), biometric auth, fraud detection, geo-fencing                        |
| **3**  | Video Proctoring        | ML face detection (face-api.js), eye tracking via landmarks, expression analysis, screen monitoring                   |
| **4**  | Smart Assessment        | Sandboxed code execution (Piston API), answer validation, job matching, skill gap analysis                            |
| **5**  | Integrations            | SSO (OAuth/SAML), webhooks (HMAC-signed), ATS integration (Greenhouse/Lever)                                          |
| **6**  | Enterprise Ops          | Multi-tenancy, RBAC (candidate/interviewer/admin), tenant isolation                                                   |
| **7**  | Analytics               | MongoDB aggregation pipelines, trend analysis, top performers, pipeline tracking                                      |
| **8**  | Scheduling & Reports    | Calendar booking, timezone handling, question bank, scorecards, PDF/CSV exports                                       |
| **9**  | Next-Gen AI             | LLM interviewer with memory/personas, multimodal voice tone analysis (Groq primary), smart adaptive assessment        |
| **10** | Infrastructure          | Circuit breakers, connection pooling, CDN integration, graceful shutdown                                              |
| **11** | Real-Time Collaboration | CRDT collaborative editor (three-way merge), whiteboard (MongoDB persistence), video calls (WebRTC + STUN/TURN + SFU) |
| **12** | Predictive Analytics    | Attrition prediction, performance forecasting, anomaly detection, sentiment analysis                                  |
| **13** | Developer Experience    | GitHub/GitLab integration, code review, sandboxed execution, test runner                                              |
| **14** | Compliance & Governance | GDPR data export, PII masking, data retention policies, immutable audit trails                                        |
| **15** | Integration Ecosystem   | HRIS (Workday/BambooHR/SAP), Slack/Teams/Discord, Zoom/Google Meet, background checks                                 |
| **16** | Mobile & Multi-Platform | Offline support, push notifications, responsive mobile API                                                            |
| **17** | Observability           | Prometheus metrics, Pino structured logging, Sentry error tracking, health checks                                     |
| **18** | AI Agents & Automation  | Autonomous screening/scheduling/feedback agents, workflow automation engine                                           |

---

## 🛠️ Technology Stack

### Core Platform

| Layer             | Technology                                    | Version           |
| ----------------- | --------------------------------------------- | ----------------- |
| **Runtime**       | Node.js                                       | 20.x              |
| **Language**      | TypeScript                                    | 5.3               |
| **Frontend**      | React + Vite + Tailwind CSS + Shadcn UI       | 18 / 7.3 / 3.4    |
| **Backend**       | Express + Socket.IO + Apollo Server (GraphQL) | 4.21 / 4.8 / 4.11 |
| **Database**      | MongoDB (Mongoose ODM)                        | 8.x               |
| **Cache & Queue** | Redis (ioredis) + BullMQ                      | 5.10 / 5.45       |
| **Monorepo**      | Turborepo + npm workspaces                    | latest            |

### AI & Machine Learning Stack

| Service                 | Model/Technology                        | Purpose                                                     |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------- |
| **Groq**                | Llama 3.3-70b-versatile                 | Interview chat, voice analysis, resume screening, AI agents |
| **face-api.js**         | SSD MobileNet + Landmarks + Expressions | Real-time face detection & proctoring                       |
| **TensorFlow.js**       | Runtime engine                          | Server-side ML model execution                              |
| **Azure Speech SDK**    | Neural TTS/STT                          | Text-to-speech for AI interviewer voice                     |
| **Piston API**          | Multi-language sandbox                  | Secure code execution (20+ languages)                       |
| **Xenova Transformers** | all-MiniLM-L6-v2                        | Resume text embeddings for semantic search                  |

### Security & Auth

| Feature         | Implementation                                         |
| --------------- | ------------------------------------------------------ |
| Authentication  | Clerk (OAuth + Email + Magic Links)                    |
| Authorization   | Custom RBAC with wildcard admin permissions            |
| Data Encryption | RSA-4096 + AES-256-GCM + PBKDF2 key derivation         |
| API Security    | Helmet CSP + Rate Limiting + CSRF + Input Sanitization |
| Audit Trail     | Immutable logs with correlation IDs and IP tracking    |

---

## 📁 Project Structure

```
InterviewMinds/
├── apps/
│   ├── api/                        # Backend API Server
│   │   ├── src/
│   │   │   ├── config/            # Service configurations
│   │   │   ├── graphql/           # Apollo Server schema + resolvers
│   │   │   ├── lib/               # 81 business logic service modules
│   │   │   │   ├── aiAgent.ts             # AI agent orchestration (Groq)
│   │   │   │   ├── analytics.ts           # MongoDB aggregation analytics
│   │   │   │   ├── collaborativeEditor.ts # CRDT three-way merge editor
│   │   │   │   ├── e2eEncryption.ts       # RSA-4096 + AES-256-GCM
│   │   │   │   ├── faceMLService.ts       # face-api.js model management
│   │   │   │   ├── multimodalAI.ts        # Groq voice tone analysis
│   │   │   │   ├── videoCall.ts           # WebRTC + STUN/TURN + SFU
│   │   │   │   ├── videoProctoring.ts     # ML-based proctoring pipeline
│   │   │   │   ├── whiteboard.ts          # Persistent whiteboard (MongoDB)
│   │   │   │   └── ... (81 total modules)
│   │   │   ├── middleware/         # Auth, RBAC, audit, security
│   │   │   ├── models/            # 7 Mongoose schemas
│   │   │   ├── routes/            # 38 Express route files
│   │   │   └── tests/             # Vitest + fast-check property-based tests
│   │   ├── models/face-api/       # ML model weights
│   │   └── Dockerfile             # Multi-stage production build
│   │
│   └── web/                        # Frontend Client
│       ├── src/
│       │   ├── components/         # Shadcn UI + custom components
│       │   ├── pages/              # Route pages (15+)
│       │   ├── hooks/              # Custom React hooks
│       │   ├── services/           # API client services
│       │   └── lib/                # Utilities
│       └── vercel.json             # Deployment config
│
├── packages/
│   └── shared/                     # Shared TypeScript types & interfaces
├── docs/                           # Comprehensive documentation (8 files)
├── screenshots/                    # Application screenshots
├── .github/workflows/              # CI/CD (GitHub Actions)
├── turbo.json                      # Turborepo build config
└── package.json                    # Root workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites

| Tool    | Version                    | Required |
| ------- | -------------------------- | -------- |
| Node.js | 20+                        | ✅       |
| npm     | 10+                        | ✅       |
| MongoDB | Atlas (free tier) or local | ✅       |
| Redis   | Upstash (free) or local    | Optional |

### Installation

```bash
# Clone the repository
git clone https://github.com/theunstopabble/InterviewMinds.git
cd InterviewMinds

# Install all workspace dependencies
npm install --legacy-peer-deps

# Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your API keys

# Start development (frontend + backend)
npm run dev
```

### Development URLs

| Service      | URL                           | Description                  |
| ------------ | ----------------------------- | ---------------------------- |
| Frontend     | http://localhost:5173         | React app with hot reload    |
| Backend API  | http://localhost:8000         | Express REST + WebSocket     |
| GraphQL      | http://localhost:8000/graphql | Apollo Playground (dev only) |
| Health Check | http://localhost:8000/health  | Service connectivity status  |
| Metrics      | http://localhost:8000/metrics | Prometheus exposition format |

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

**Test Suite:** 39 property-based tests using Vitest 2.1 + fast-check 3.22

- 7 bug condition exploration tests (verify ML proctoring, CRDT merge, persistence, WebRTC)
- 32 preservation tests (verify no regressions across all 18 phases)

---

## 🌐 Deployment

| Component   | Platform                                    | Status       |
| ----------- | ------------------------------------------- | ------------ |
| Frontend    | [Vercel](https://interviewminds.vercel.app) | ✅ Live      |
| Backend     | [Render](https://render.com) (Docker)       | ✅ Live      |
| Database    | MongoDB Atlas (Free M0)                     | ✅ Connected |
| Cache/Queue | Upstash Redis (Free)                        | ✅ Connected |

### CI/CD Pipeline (GitHub Actions)

```
Push to main → Typecheck (Backend + Frontend) → Test Suite → Build → Auto-deploy
```

---

## 🔑 Environment Configuration

The app requires only **5 keys** to run. All other 45+ features gracefully degrade without their keys (no crash):

| Variable                | Required | Free Tier                       |
| ----------------------- | -------- | ------------------------------- |
| `MONGO_URI`             | ✅       | MongoDB Atlas Free (512MB)      |
| `CLERK_PUBLISHABLE_KEY` | ✅       | Clerk Free (10k MAU)            |
| `CLERK_SECRET_KEY`      | ✅       | Clerk Free                      |
| `GROQ_API_KEY`          | ✅       | Groq Free (rate limited)        |
| `JWT_SECRET`            | ✅       | Self-generated                  |
| `REDIS_URL`             | Optional | Upstash Free (10k commands/day) |
| `CLOUDINARY_*`          | Optional | Cloudinary Free (25GB)          |
| `AZURE_SPEECH_*`        | Optional | Azure Free (5hr/month)          |
| `SENTRY_DSN`            | Optional | Sentry Free (5k errors/month)   |

> Full list of 50 environment variables in [`apps/api/.env.example`](apps/api/.env.example)

---

## 🏛️ Key Technical Decisions

| Decision                      | Rationale                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Groq over OpenAI**          | Sub-500ms latency, generous free tier, Llama 3.3-70b quality                                         |
| **CRDT Three-Way Merge**      | Preserves concurrent edits without data loss, no central coordination needed                         |
| **face-api.js with fallback** | ML inference when models available, content-derived analysis otherwise (never returns static values) |
| **Circuit Breaker Pattern**   | Prevents cascading failures when Groq/Piston services go down                                        |
| **BullMQ with rate limiting** | Reliable async jobs with pause-on-error to prevent Redis quota exhaustion                            |
| **Clerk over custom auth**    | Production-grade auth (OAuth, MFA, session management) without building from scratch                 |
| **Turborepo monorepo**        | Shared types, parallel builds, intelligent caching across frontend + backend                         |

---

## 📚 Documentation

| Document                                                                         | Description                                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`docs/AI_DISCOVERABILITY_FRAMEWORKS.md`](docs/AI_DISCOVERABILITY_FRAMEWORKS.md) | AI answer engine & generative search optimization (AEO, GEO, LLMO, AISEO, E-E-A-T, SEO) |
| [`docs/API.md`](docs/API.md)                                                     | Complete REST + GraphQL API reference (150+ endpoints)                                  |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                                   | System design, middleware pipeline, CRDT algorithm, ML pipeline                         |
| [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md)                                         | 7 MongoDB models with field-level documentation                                         |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)                                       | Production deployment (Vercel + Render + Docker)                                        |
| [`docs/EDGE_CASES.md`](docs/EDGE_CASES.md)                                       | Error handling, graceful degradation, failure modes                                     |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md)                                       | Complete technology inventory (50+ packages)                                            |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md)                                           | Development workflow, testing strategy, CI/CD                                           |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with conventional commits: `git commit -m 'feat: add feature'`
4. Ensure `npm run typecheck` passes
5. Push and open a Pull Request — CI runs automatically

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

## 👨‍💻 Built by Gautam Kumar

**InterviewMinds** is a solo-developed Production-grade AI Mock Interview Platform showcasing full-stack engineering, AI/ML integration, real-time systems, and production-grade infrastructure.

[![Portfolio](https://img.shields.io/badge/🌐_Portfolio-gautam--kr.vercel.app-6366f1?style=for-the-badge)](https://gautam-kr.vercel.app)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-gautamkr62-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/gautamkr62)
[![GitHub](https://img.shields.io/badge/GitHub-theunstopabble-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/theunstopabble)
[![Email](https://img.shields.io/badge/Email-gautamkumar43421-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:gautamkumar43421@gmail.com)

<br/>

**[Gautam Kumar](https://gautam-kr.vercel.app)** — Full-Stack Developer | Solo-shipped 4 SaaS products | AI integration

_Building production-grade applications with React, Node.js, TypeScript, MongoDB, and AI/ML_

</div>

---

## 🌐 More Projects by Gautam Kumar

| Project       | Description                                         | Link                                                             |
| ------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| **Portfolio** | Personal portfolio & developer profile              | [gautam-kr.vercel.app](https://gautam-kr.vercel.app)             |
| **SwadKart**  | Multi-vendor food delivery platform with AI chatbot | [swadkart.vercel.app](https://swadkart.vercel.app)               |
| **Satark-AI** | Deepfake detection & speaker verification platform  | [satark-deepfake.vercel.app](https://satark-deepfake.vercel.app) |
| **TexFolio**  | AI-powered LaTeX resume builder with RBAC           | [texfolio.vercel.app](https://texfolio.vercel.app)               |
