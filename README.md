<div align="center">
  <img src="apps/web/public/pwa-192x192.png" alt="InterviewMinds" width="80" height="80"/>
  <h1>InterviewMinds</h1>
  <p><b>AI-Powered Mock Interview Platform</b></p>
  <p>
    <a href="https://interviewminds.vercel.app/"><img alt="Live Demo" src="https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel"/></a>
    <a href="https://github.com/theunstopabble/InterviewMinds"><img alt="GitHub" src="https://img.shields.io/badge/GitHub_Repo-181717?style=for-the-badge&logo=github"/></a>
    <a href="LICENSE"><img alt="License MIT" src="https://img.shields.io/badge/License-MIT-000000?style=for-the-badge"/></a>
  </p>
  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>
    <img alt="React" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white"/>
    <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white"/>
    <img alt="Redis" src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white"/>
  </p>
</div>

# InterviewMinds
**Production-Grade AI Mock Interview Platform**

> Transform your interview preparation with a hyper-realistic, AI-driven simulation that analyzes your resume, proctors your session, and provides actionable feedback.

## Enterprise Features

| Feature | Status |
|---------|--------|
| Circuit Breakers (Groq, Gemini, Azure, Piston) | ✅ |
| Redis-backed Rate Limiting | ✅ |
| CSRF Protection | ✅ |
| JWT Verification on Socket.IO | ✅ |
| GraphQL with Introspection Control | ✅ |
| Prometheus Metrics | ✅ |
| Sentry Error Tracking | ✅ |
| BullMQ Async Job Processing | ✅ |
| Graceful Shutdown | ✅ |
| Health Checks with Circuit Status | ✅ |

## Table of Contents
- [Overview](#overview)
- [Why InterviewMinds?](#why-interviewminds)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Enterprise Features](#enterprise-features)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

InterviewMinds is a **production-grade, full-stack AI platform** designed to simulate high-pressure technical interviews. Unlike generic chatbots, InterviewMinds parses your uploaded resume to generate context-aware questions specific to your projects and tech stack.

**Architecture:**
- **Turborepo Monorepo** for efficient builds
- **React 18/Vite** frontend with **Shadcn UI**
- **Node.js 20/Express** backend with **MongoDB**
- **Groq (Llama 3)** for ultra-low latency AI
- **TensorFlow.js** for real-time proctoring
- **Redis** for rate limiting & caching
- **BullMQ** for async job processing

**Live Demo**: [https://interviewminds.vercel.app/](https://interviewminds.vercel.app/)

## Why InterviewMinds?

| Feature | InterviewMinds | Generic Chatbots | Pramp/Interviewing.io |
|---------|----------------|------------------|----------------------|
| **Resume-Based Questions** | ✅ Personalized | ❌ Static | ❌ Human only |
| **Real-time Proctoring** | ✅ Face + Emotion | ❌ None | ❌ None |
| **Live Code Compiler** | ✅ Instant | ❌ None | ✅ Human graded |
| **AI Voice Interviewer** | ✅ Natural | ⚠️ Text only | ❌ Human only |
| **Free & Open Source** | ✅ 100% | ❌ Paid | ❌ Paid |
| **Low Latency AI** | ✅ <500ms | ❌ Slow | N/A |
| **Circuit Breakers** | ✅ | ❌ | ❌ |
| **Rate Limiting** | ✅ Redis | ❌ | ❌ |

## Key Features

### AI-Driven Intelligence
- **Deep Resume Analysis**: PDF parsing → tech stack extraction → personalized questions
- **Adaptive Personas**: Vikram (Strict Tech), Neha (HR Friendly), Sam (System Design)
- **Contextual Questioning**: Questions evolve based on your responses

### Immersive Interview Experience
- **Voice-to-Voice**: Real-time STT + TTS for natural conversation
- **Live Coding Sandbox**: CodeEditor + compiler with instant execution
- **Ultra Low Latency**: Groq API (<500ms responses)

### Smart Proctoring
- **Face Detection**: Monitors presence (TensorFlow.js)
- **Anti-Cheating**: Tab-switch + full-screen enforcement
- **Emotion Analysis**: Confidence/stress level tracking

### Analytics & Feedback
- **Detailed Scorecards**: Technical + Communication scores
- **Radar Charts**: Visual strength/weakness analysis
- **Video Review**: Timestamped feedback playback

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Monorepo** | TurboRepo, npm workspaces |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI |
| **Backend** | Node.js 20, Express, TypeScript |
| **Database** | MongoDB (Mongoose ODM) |
| **Cache/Queue** | Redis, BullMQ |
| **Auth** | Clerk (Google/GitHub/Email) |
| **AI/ML** | Groq (Llama 3), Google Gemini, Azure Speech, TensorFlow.js |
| **Observability** | Sentry, Prometheus |
| **Media** | Cloudinary, WebRTC |
| **Deployment** | Vercel (Frontend), Render/Docker (Backend) |

## Folder Structure

```
InterviewMinds/
├── apps/
│   ├── api/                           # Backend Server
│   │   ├── src/
│   │   │   ├── config/               # Cloudinary config
│   │   │   ├── graphql/              # Apollo Server (schema + resolvers)
│   │   │   ├── lib/                  # Security, Redis, Queue, CircuitBreaker
│   │   │   ├── middleware/           # Auth, RBAC, Audit, Upload
│   │   │   ├── models/               # MongoDB schemas
│   │   │   ├── routes/               # API routes
│   │   │   ├── tests/                # Vitest test suite
│   │   │   └── index.ts              # Entry point
│   │   └── Dockerfile
│   └── web/                          # Frontend Client
│       ├── src/
│       │   ├── components/          # UI components
│       │   ├── hooks/                # Custom React hooks
│       │   ├── pages/                # Route pages
│       │   ├── services/             # API services
│       │   └── lib/                  # Utilities
│       ├── public/models/            # TensorFlow.js models
│       └── Dockerfile
├── packages/
│   └── shared/                       # Shared types
├── .github/
│   └── workflows/                    # CI/CD pipeline
└── docker-compose.yml                # Local development
```

## Quick Start

### Prerequisites
- Node.js **v20+**
- MongoDB (Atlas recommended)
- Redis (for rate limiting)
- Clerk Account (https://clerk.com)
- Groq API Key

### Installation

```bash
git clone https://github.com/theunstopabble/InterviewMinds.git
cd InterviewMinds
npm install
```

### Development

```bash
# Run all apps (API + Web)
npm run dev
```

```text
Backend: http://localhost:8000
Frontend: http://localhost:5173
```

### Docker (Production)

```bash
docker-compose up -d
```

## Environment Variables

### Backend (apps/api/.env)

```bash
# Environment
NODE_ENV=development
PORT=8000

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/interviewminds
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=<generate-strong-secret-min-32-chars>
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Auth (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Services
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...

# Azure TTS (Optional)
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=centralindia

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Observability (Optional)
SENTRY_DSN=https://...
```

### Frontend (apps/web/.env)

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:8000/api
VITE_SENTRY_DSN=https://...
```

## Enterprise Features

### Security
- **Helmet.js** - Security headers (CSP, HSTS, etc.)
- **Rate Limiting** - Redis-backed with memory fallback
- **Circuit Breakers** - For Groq, Gemini, Azure, Piston APIs
- **CSRF Protection** - Token-based validation
- **Input Sanitization** - NoSQL injection & XSS prevention
- **RBAC** - Role-based access control (candidate, interviewer, admin)

### Reliability
- **Graceful Shutdown** - SIGTERM/SIGINT handling
- **Error Boundaries** - React error boundaries + Sentry
- **Health Checks** - DB, Redis, AI services + circuit breaker status
- **Request Timeout** - 30s default, 20s for AI calls
- **AbortController** - Compiler timeout handling

### Observability
- **Prometheus Metrics** - HTTP, AI, business metrics
- **Sentry** - Error tracking with context
- **Correlation IDs** - Request tracing
- **Structured Logging** - Pino with levels

### Performance
- **BullMQ** - Async resume processing
- **Redis Caching** - Compiler results caching
- **MongoDB Indexes** - Optimized queries
- **Turborepo** - Parallel builds, caching

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8000 in use | `lsof -ti:8000 | xargs kill -9` (Linux/Mac) |
| MongoDB connection | Check Atlas IP whitelist + correct URI |
| Clerk auth fail | Verify publishable/secret keys match |
| AI API errors | Check rate limits in Groq dashboard |
| Circuit breaker open | Wait for reset timeout, check service status |
| Rate limited | Reduce request frequency |

## Contributing

1. Fork the project
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/theunstopabble" target="_blank">Gautam Kumar</a></p>
  <p>
    <a href="https://www.linkedin.com/in/gautamkr62" target="_blank">
      <img src="https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" />
    </a>
  </p>
</div>