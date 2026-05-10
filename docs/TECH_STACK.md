# InterviewMinds Tech Stack

## Overview

InterviewMinds uses a modern, enterprise-grade technology stack optimized for performance, scalability, and developer experience.

---

## Frontend Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI Framework |
| TypeScript | 5.3 | Type safety |
| Vite | 7.3 | Build tool |
| Tailwind CSS | 3.4 | Styling |

### UI Components

| Library | Version | Purpose |
|---------|---------|---------|
| Shadcn UI | Latest | Component library |
| Radix UI | Latest | Headless primitives |
| Lucide React | 0.300 | Icons |
| Recharts | 2.15 | Charts |

### State Management

```typescript
// React hooks for state
useState      // Local state
useEffect     // Side effects
useContext    // Global state (Clerk auth)
useReducer    // Complex state
```

### Code Editor

| Library | Version | Purpose |
|---------|---------|---------|
| @monaco-editor/react | 4.7 | VS Code editor |

### AI/ML (Browser)

| Library | Version | Purpose |
|---------|---------|---------|
| face-api.js | 0.22 | Face detection |
| TensorFlow.js | Latest | ML inference |

### Real-time Communication

| Library | Version | Purpose |
|---------|---------|---------|
| socket.io-client | 4.8 | WebSocket client |

---

## Backend Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 | Runtime |
| Express | 4.21 | HTTP server |
| TypeScript | 5.3 | Type safety |

### API Layer

| Technology | Purpose |
|------------|---------|
| Express | REST API |
| Apollo Server | GraphQL |
| Socket.IO | WebSocket |

### Authentication

| Library | Purpose |
|---------|---------|
| @clerk/express | JWT auth |
| Custom RBAC | Role-based access |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| MongoDB | 7 | Primary database |
| Mongoose | 8 | ODM |

### Caching & Queue

| Technology | Purpose |
|------------|---------|
| Redis | Cache, rate limiting |
| BullMQ | Job queue |

### AI Services

| Service | Purpose |
|---------|---------|
| Groq (Llama 3) | AI chat |
| Google Gemini | Alternative AI |
| Azure Speech | TTS |
| Piston | Code execution |

### Observability

| Library | Purpose |
|---------|---------|
| Sentry | Error tracking |
| Prometheus | Metrics |
| Pino | Logging |

---

## DevOps & Infrastructure

### Container

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Local dev |

### CI/CD

| Technology | Purpose |
|------------|---------|
| GitHub Actions | CI/CD pipeline |
| Vercel | Frontend hosting |
| Render | Backend hosting |

### Monitoring

| Service | Purpose |
|---------|---------|
| Vercel Analytics | Frontend metrics |
| Prometheus | Custom metrics |
| Datadog | Full monitoring |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Vite + Tailwind CSS                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  Components: CodeEditor, WebcamAnalysis, ProctoringUI          │   │
│  │  Hooks: useSpeech, useSocket, useProctoring, useAudioAnalysis  │   │
│  │  State: React hooks + Context                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS + JWT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Node.js 20 + Express + TypeScript                             │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  Routes: Chat, Interview, Resume, Compiler, TTS, Admin          │   │
│  │  Middleware: Auth, RBAC, Audit, Rate Limit, Security            │   │
│  │  GraphQL: Apollo Server with resolvers                           │   │
│  │  Socket.IO: Real-time chat                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   MongoDB        │    │   Redis          │    │   External APIs  │
│                  │    │                  │    │                  │
│ - Users          │    │ - Rate Limiting  │    │ - Groq (LLM)    │
│ - Resumes        │    │ - Session Cache  │    │ - Azure (TTS)   │
│ - Interviews     │    │ - BullMQ Queue  │    │ - Piston (Code)  │
│ - Messages       │    │ - CSRF Tokens   │    │ - Cloudinary    │
│ - Audit Logs     │    │                  │    │ - Clerk (Auth)  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## Package Dependencies

### Root (package.json)

```json
{
  "dependencies": {
    "socket.io": "^4.8.3",
    "socket.io-client": "^4.8.3"
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "^3.0.0"
  }
}
```

### API (apps/api/package.json)

```json
{
  "dependencies": {
    "@apollo/server": "^4.11.0",
    "@clerk/express": "^1.3.0",
    "@google/generative-ai": "^0.1.0",
    "@langchain/core": "^1.1.15",
    "@sentry/node": "^8.9.0",
    "@xenova/transformers": "^2.17.2",
    "axios": "^1.15.2",
    "bullmq": "^5.45.2",
    "cloudinary": "^2.9.0",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "graphql": "^16.14.0",
    "groq-sdk": "^0.37.0",
    "helmet": "^8.0.0",
    "ioredis": "^5.10.1",
    "microsoft-cognitiveservices-speech-sdk": "^1.47.0",
    "mongoose": "^8.0.0",
    "pino": "^9.5.0",
    "socket.io": "^4.8.1",
    "zod": "^3.23.8"
  }
}
```

### Web (apps/web/package.json)

```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.61.6",
    "@monaco-editor/react": "^4.7.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@sentry/react": "^8.9.0",
    "@vercel/analytics": "^1.6.1",
    "axios": "^1.15.2",
    "face-api.js": "^0.22.2",
    "lucide-react": "^0.300.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "recharts": "^2.15.4",
    "socket.io-client": "^4.8.1",
    "sonner": "^1.3.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^7.3.3",
    "vite-plugin-pwa": "^1.2.0"
  }
}
```

---

## Technology Rationale

### Why Turborepo?

- **Shared Code**: Common types between API and Web
- **Build Caching**: Faster builds with intelligent caching
- **Parallel Execution**: Independent package builds

### Why MongoDB?

- **Flexible Schema**: Interview data structure varies
- **JSON Native**: Matches JavaScript/TypeScript
- **Scaling**: Sharding support for growth

### Why Redis?

- **Rate Limiting**: Fast in-memory operations
- **BullMQ**: Reliable job processing
- **Session Cache**: Sub-millisecond access

### Why Groq?

- **Low Latency**: <500ms response times
- **Llama 3**: High-quality responses
- **Cost-effective**: Pay per token

### Why Clerk?

- **Easy Integration**: Simple React hooks
- **Social Login**: Google, GitHub, etc.
- **Security**: Handled by experts

---

## Version Compatibility Matrix

| Component | Minimum | Recommended |
|-----------|---------|--------------|
| Node.js | 18 | 20 |
| npm | 9 | 10 |
| MongoDB | 6 | 7 |
| Redis | 6 | 7 |
| Docker | 20 | 24 |

---

## Performance Benchmarks

| Operation | Target | Actual |
|-----------|--------|--------|
| API Response | <200ms | ~150ms |
| AI Chat Latency | <500ms | ~400ms |
| Code Execution | <3s | ~2s |
| Page Load | <2s | ~1s |
| Build Time | <60s | ~45s |

---

## Security Certifications

| Feature | Implementation |
|---------|----------------|
| HTTPS Only | TLS 1.3 |
| Data Encryption | At rest + in transit |
| Authentication | JWT (Clerk) |
| Authorization | RBAC |
| Input Validation | Zod schemas |
| XSS Prevention | Helmet CSP |
| Rate Limiting | Redis-backed |