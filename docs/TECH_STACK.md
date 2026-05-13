# Tech Stack

**Version:** 2.0.0  
**Last Updated:** May 2026

---

## Runtime & Language

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20.x | Server runtime |
| TypeScript | 5.3 | Type safety across frontend and backend |
| CommonJS | — | Backend module system (`"type": "commonjs"`) |
| ES Modules | — | Frontend module system (`"type": "module"`) |

---

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI framework |
| Vite | 7.3 | Build tool and dev server |
| Tailwind CSS | 3.4 | Utility-first styling |
| Shadcn UI (Radix) | — | Accessible component primitives |
| React Router | 6.20 | Client-side routing |
| Axios | 1.15 | HTTP client |
| Socket.IO Client | 4.8 | Real-time WebSocket communication |
| Monaco Editor | 4.7 | Code editor (collaborative) |
| Recharts | 2.15 | Data visualization |
| Lucide React | 0.300 | Icon library |
| Sonner | 1.3 | Toast notifications |
| face-api.js | 0.22 | Client-side face detection |
| Clerk React | 5.61 | Authentication UI |
| Sentry React | 8.9 | Error tracking |
| Vercel Analytics | 1.6 | Usage analytics |
| vite-plugin-pwa | 1.2 | Progressive Web App support |

---

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Express | 4.21 | HTTP framework |
| Socket.IO | 4.8 | WebSocket server |
| Mongoose | 8.x | MongoDB ODM |
| ioredis | 5.10 | Redis client |
| BullMQ | 5.45 | Job queue (resume parsing, scoring) |
| Apollo Server | 4.11 | GraphQL API |
| Helmet | 8.0 | Security headers |
| express-rate-limit | 7.5 | Rate limiting |
| Multer | 1.4 | File upload handling |
| Zod | 3.23 | Runtime schema validation |
| Pino | 9.5 | Structured JSON logging |
| prom-client | 15.1 | Prometheus metrics |
| uuid | 10.0 | Unique ID generation |
| json2csv | 6.0 | Data export |
| Svix | 1.15 | Webhook delivery |

---

## AI & Machine Learning

| Technology | Version | Purpose |
|-----------|---------|---------|
| Groq SDK | 0.37 | LLM inference (Llama 3.3-70b-versatile) |
| Google Generative AI | 0.1 | Gemini integration |
| @vladmandic/face-api | 1.7.14 | Server-side face detection, landmarks, expressions |
| @tensorflow/tfjs | 4.22.0 | ML runtime for face-api.js |
| @xenova/transformers | 2.17 | Transformer models (embeddings) |
| LangChain | 1.2 | LLM orchestration and text splitting |
| Azure Speech SDK | 1.47 | Text-to-speech and speech recognition |

### ML Model Pipeline

```
┌─────────────────────────────────────────────────────┐
│  Video Proctoring ML Pipeline                       │
├─────────────────────────────────────────────────────┤
│  @tensorflow/tfjs (runtime)                         │
│       ↓                                             │
│  @vladmandic/face-api (SSD MobileNet v1)           │
│       ├── Face Detection (bounding box + score)     │
│       ├── Face Landmarks (68-point)                 │
│       └── Face Expressions (7 emotions)             │
│       ↓                                             │
│  Content-Derived Fallback (when models unavailable) │
│       ├── Hash-based feature extraction             │
│       ├── Entropy analysis                          │
│       └── Input-dependent scoring                   │
└─────────────────────────────────────────────────────┘
```

---

## Authentication & Security

| Technology | Version | Purpose |
|-----------|---------|---------|
| Clerk (Express) | 1.3 | Backend auth middleware |
| Clerk (React) | 5.61 | Frontend auth components |
| Custom RBAC | — | Role-based access (candidate/interviewer/admin + wildcard) |
| RSA-4096 | — | Asymmetric key exchange (E2E encryption) |
| AES-256-GCM | — | Symmetric message encryption |
| PBKDF2 | — | Key derivation |

---

## Real-Time & Communication

| Technology | Version | Purpose |
|-----------|---------|---------|
| Socket.IO | 4.8 | Bidirectional real-time events |
| WebRTC | — | Peer-to-peer video/audio |
| STUN/TURN | — | ICE server NAT traversal |
| SFU (optional) | — | Selective Forwarding Unit (mediasoup/livekit) |

### WebRTC Architecture

```
┌──────────┐    STUN/TURN    ┌──────────┐
│  Client  │◄──────────────►│  Client  │
│  (Peer)  │   ICE Servers   │  (Peer)  │
└────┬─────┘                 └────┬─────┘
     │                             │
     │  Signaling (Socket.IO)      │
     └──────────┬──────────────────┘
                │
         ┌──────┴──────┐
         │   Server    │
         │  (Express)  │
         └─────────────┘
```

---

## Database & Caching

| Technology | Version | Purpose |
|-----------|---------|---------|
| MongoDB | — | Primary data store (7 collections) |
| Mongoose | 8.x | ODM with schema validation |
| Redis | — | Caching, sessions, rate limiting, pub/sub |
| ioredis | 5.10 | Redis client with cluster support |
| BullMQ | 5.45 | Distributed job queues backed by Redis |

### Connection Configuration

- MongoDB: `maxPoolSize: 20`, `minPoolSize: 5`, `serverSelectionTimeoutMS: 5000`
- Redis: Configurable via `REDIS_URL` environment variable

---

## Code Execution

| Technology | Version | Purpose |
|-----------|---------|---------|
| Piston API | — | Sandboxed multi-language code execution |
| Circuit Breaker | — | Fault tolerance for external service calls |

---

## Media & Storage

| Technology | Version | Purpose |
|-----------|---------|---------|
| Cloudinary | 2.9 | Image/file storage and CDN |
| multer-storage-cloudinary | 4.0 | Direct upload to Cloudinary |
| pdf-parse | 1.1 | PDF text extraction |
| pdf2json | 4.0 | PDF structure parsing |

---

## Observability

| Technology | Version | Purpose |
|-----------|---------|---------|
| Sentry | 8.9 | Error tracking and performance monitoring |
| Prometheus (prom-client) | 15.1 | Metrics collection and exposition |
| Pino | 9.5 | Structured JSON logging |
| pino-pretty | 11.3 | Development log formatting |

---

## Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vitest | 2.1 | Test runner (backend + frontend) |
| fast-check | 3.22 | Property-based testing |
| Supertest | 7.0 | HTTP integration testing |
| @testing-library/react | 16.1 | React component testing |
| @vitest/coverage-v8 | 2.1 | Code coverage |
| jsdom | 25.0 | DOM simulation for frontend tests |

---

## Build & DevOps

| Technology | Version | Purpose |
|-----------|---------|---------|
| Turborepo | latest | Monorepo build orchestration |
| npm workspaces | — | Package management |
| GitHub Actions | — | CI/CD pipeline |
| Docker | — | Container builds (multi-stage) |
| Vercel | — | Frontend hosting |
| Render | — | Backend hosting |
| ESLint | 8.57 | Code linting |
| Prettier | 3.0 | Code formatting |
| ts-node-dev | 2.0 | Development server with hot reload |

---

## GraphQL

| Technology | Version | Purpose |
|-----------|---------|---------|
| Apollo Server | 4.11 | GraphQL server |
| graphql | 16.14 | GraphQL language support |

---

## Dependency Security

The root `package.json` includes `overrides` for known vulnerable transitive dependencies:

- `lodash` → ^4.17.24
- `node-fetch` → ^2.7.0
- `qs` → ^6.13.0
- `protobufjs` → ^7.5.5
- `postcss` → ^8.5.10
- `follow-redirects` → ^1.15.12
