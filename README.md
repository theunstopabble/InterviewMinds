<div align="center">
  <img src="apps/web/public/pwa-192x192.png" alt="InterviewMinds" width="80" height="80"/>
  <h1>InterviewMinds</h1>
  <p><b>Enterprise-Grade AI Mock Interview Platform</b></p>
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
**Production-Grade Enterprise AI Mock Interview Platform**

> Transform your interview preparation with a hyper-realistic, AI-driven simulation that analyzes your resume, proctors your session, verifies truthfulness, and provides actionable feedback with complete enterprise security.

---

## Enterprise Features (Complete - Phase 1 to Phase 7)

### Phase 1: Core Accuracy
| Feature | Status | Description |
|---------|--------|-------------|
| Resume-Job Matching Engine | ✅ | Skill taxonomy, experience matching, gap analysis |
| Competency-Based Question Generation | ✅ | 5 competencies, 4 difficulty levels, STAR validation |
| Real-Time Code Analysis | ✅ | Quality, security (8 vulnerabilities), complexity metrics |

### Phase 2: Security
| Feature | Status | Description |
|---------|--------|-------------|
| End-to-End Encryption | ✅ | RSA 4096-bit, AES-256-GCM, PBKDF2 key derivation |
| Biometric Authentication | ✅ | Face/Voice/Fingerprint, liveness detection, rate limiting |
| Advanced Fraud Detection | ✅ | Browser fingerprinting, behavior analysis, session monitoring |
| IP Whitelisting & Geo-Fencing | ✅ | CIDR support, country blocking, VPN/Proxy detection |

### Phase 3: Proctoring
| Feature | Status | Description |
|---------|--------|-------------|
| Advanced Video Analysis | ✅ | Face detection, eye tracking, expression analysis |
| Audio Analysis | ✅ | Voice recognition, pace/volume detection, filler words |
| Screen & Tab Monitoring | ✅ | Tab switches, focus loss, recording detection |
| Real-Time Alert System | ✅ | Risk scoring, violation classification, recommendations |

### Phase 4: Accuracy & Truthfulness
| Feature | Status | Description |
|---------|--------|-------------|
| Resume Fact Verification | ✅ | Entity extraction, timeline analysis, cross-reference |
| Answer Validation & Red Flags | ✅ | 6 red flag types, STAR method, content matching |
| Dynamic Follow-Up Questions | ✅ | Trigger detection, type-specific generation, sequencing |

### Phase 5: Integrations
| Feature | Status | Description |
|---------|--------|-------------|
| SSO Integration | ✅ | OAuth 2.0/SAML, 4 providers (Okta, Azure AD, Google, Custom) |
| Webhooks | ✅ | Event-based, retry policy, signature verification |
| ATS Integration | ✅ | 5 providers (Workday, Greenhouse, Lever, BambooHR, SAP) |

### Phase 6: Infrastructure
| Feature | Status | Description |
|---------|--------|-------------|
| Multi-Tenancy Architecture | ✅ | 4 isolation levels, plan limits, permissions, custom branding |
| Compliance Frameworks | ✅ | SOC 2, GDPR, HIPAA, ISO 27001, audit logging, consent management |

### Phase 7: Analytics
| Feature | Status | Description |
|---------|--------|-------------|
| Interview Analytics Dashboard | ✅ | Score distribution, competency trends, proctoring metrics |
| Predictive Analytics | ✅ | Success prediction, pipeline analysis, training recommendations |

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Enterprise APIs](#enterprise-apis)
- [Folder Structure](#folder-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

InterviewMinds is a **production-grade, enterprise-ready AI platform** designed to simulate high-pressure technical interviews with complete accuracy, security, and truthfulness verification.

**Architecture:**
- **Turborepo Monorepo** for efficient builds
- **React 18/Vite** frontend with **Shadcn UI**
- **Node.js 20/Express** backend with **MongoDB**
- **Groq (Llama 3)** for ultra-low latency AI
- **TensorFlow.js** for real-time proctoring
- **Redis** for rate limiting & caching
- **BullMQ** for async job processing

**Live Demo**: [https://interviewminds.vercel.app/](https://interviewminds.vercel.app/)

---

## Key Features

### AI-Driven Intelligence
- **Deep Resume Analysis**: PDF parsing → tech stack extraction → personalized questions
- **Resume-Job Matching**: Skill gap analysis, experience matching, job fit scoring
- **Adaptive Personas**: Vikram (Strict Tech), Neha (HR Friendly), Sam (System Design)
- **Contextual Questioning**: Questions evolve based on your responses

### Immersive Interview Experience
- **Voice-to-Voice**: Real-time STT + TTS for natural conversation
- **Live Coding Sandbox**: CodeEditor + compiler with instant execution + security analysis
- **Ultra Low Latency**: Groq API (<500ms responses)

### Smart Proctoring
- **Face Detection**: Monitors presence (TensorFlow.js)
- **Eye Tracking**: Gaze direction, blink rate, eye contact percentage
- **Expression Analysis**: Emotion detection (happy, anxious, confused, etc.)
- **Anti-Cheating**: Tab-switch + full-screen enforcement + fraud detection
- **Audio Analysis**: Voice count, filler words, pace/volume

### Truthfulness Verification
- **Resume Fact Verification**: Entity extraction, timeline analysis, skill gap detection
- **Answer Validation**: Red flag detection (vague, inconsistent, memorized, copied)
- **Dynamic Follow-ups**: Context-aware probing questions

### Enterprise Security
- **E2E Encryption**: RSA + AES-256 encryption for all sensitive data
- **Biometric Auth**: Face/Voice/Fingerprint verification with liveness detection
- **IP/Geo Controls**: Country blocking, VPN detection, CIDR whitelisting
- **Fraud Detection**: Browser fingerprinting, behavior analysis, anomaly detection

### Analytics & Insights
- **Dashboard**: Score distribution, competency trends, proctoring metrics
- **Predictive**: Success prediction, pipeline analysis, training recommendations
- **Compliance**: Audit logging, GDPR data export, consent management

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Monorepo** | TurboRepo, npm workspaces |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI |
| **Backend** | Node.js 20, Express, TypeScript |
| **Database** | MongoDB (Mongoose ODM) |
| **Cache/Queue** | Redis, BullMQ |
| **Auth** | Clerk (Google/GitHub/Email), Biometric |
| **AI/ML** | Groq (Llama 3), Google Gemini, Azure Speech, TensorFlow.js |
| **Security** | E2E Encryption (RSA/AES), RBAC, CSRF |
| **Observability** | Sentry, Prometheus |
| **Media** | Cloudinary, WebRTC |
| **Compliance** | SOC 2, GDPR, HIPAA, ISO 27001 |

---

## Enterprise APIs

### Available API Endpoints

| Prefix | Features |
|--------|----------|
| `/api/resume-verification` | Resume fact verification, entity extraction |
| `/api/answer-validation` | Answer evaluation, red flag detection |
| `/api/dynamic-questions` | Follow-up question generation |
| `/api/fraud-detection` | Browser fingerprint, behavior analysis |
| `/api/geo-fencing` | IP validation, country blocking |
| `/api/proctoring` | Video/audio/screen monitoring |
| `/api/sso` | OAuth/SAML single sign-on |
| `/api/webhooks` | Event notifications, retry policy |
| `/api/tenants` | Multi-tenant management |
| `/api/compliance` | Audit logs, GDPR, SOC2 reports |
| `/api/job-matching` | Resume-job matching, skill gaps |
| `/api/questions` | Competency-based questions |
| `/api/code-analysis` | Security scan, complexity metrics |
| `/api/e2e-encryption` | Key generation, message encryption |
| `/api/biometric` | Face/voice/fingerprint enrollment |
| `/api/ats` | Workday, Greenhouse, Lever integration |
| `/api/analytics` | Dashboard, predictive insights |

---

## Folder Structure

```
InterviewMinds/
├── apps/
│   ├── api/                           # Backend Server
│   │   ├── src/
│   │   │   ├── lib/                   # Enterprise Services (18 files)
│   │   │   │   ├── jobMatching.ts     # Resume-Job Matching
│   │   │   │   ├── questionGeneration.ts
│   │   │   │   ├── codeAnalysis.ts
│   │   │   │   ├── e2eEncryption.ts
│   │   │   │   ├── biometricAuth.ts
│   │   │   │   ├── fraudDetection.ts
│   │   │   │   ├── geoFencing.ts
│   │   │   │   ├── videoProctoring.ts
│   │   │   │   ├── answerValidation.ts
│   │   │   │   ├── dynamicQuestions.ts
│   │   │   │   ├── resumeVerification.ts
│   │   │   │   ├── ssoIntegration.ts
│   │   │   │   ├── webhooks.ts
│   │   │   │   ├── atsIntegration.ts
│   │   │   │   ├── multiTenancy.ts
│   │   │   │   ├── compliance.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── routes/                # API Routes (18 files)
│   │   │   ├── middleware/            # Auth, RBAC, Audit
│   │   │   ├── models/                # MongoDB schemas
│   │   │   └── index.ts               # Entry point
│   │   └── Dockerfile
│   └── web/                          # Frontend Client
│       ├── src/
│       │   ├── components/            # UI components
│       │   ├── hooks/                # Custom React hooks
│       │   ├── pages/                 # Route pages
│       │   ├── services/              # API services
│       │   └── lib/                   # Utilities
│       ├── public/models/             # TensorFlow.js models
│       └── Dockerfile
├── packages/
│   └── shared/                       # Shared types
├── docs/                             # Documentation
│   ├── ENTERPRISE_ENHANCEMENTS.md   # Full feature spec
│   ├── API.md                        # API documentation
│   ├── ARCHITECTURE.md               # System architecture
│   ├── DB_SCHEMA.md                  # Database schema
│   └── DEPLOYMENT.md                 # Deployment guide
└── docker-compose.yml                # Local development
```

---

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

```
Backend: http://localhost:8000
Frontend: http://localhost:5173
```

### Docker (Production)

```bash
docker-compose up -d
```

---

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

---

## API Endpoints

### Authentication & Security
- `POST /api/e2e-encryption/keys/create` - Generate E2E key pair
- `POST /api/biometric/enroll` - Enroll biometric template
- `POST /api/biometric/verify` - Verify biometric
- `POST /api/geo-fencing/validate` - Validate IP location

### Resume & Job Matching
- `POST /api/job-matching/match` - Match resume to job
- `POST /api/resume-verification/verify` - Verify resume facts

### Questions & Assessment
- `POST /api/questions/generate` - Generate competency questions
- `POST /api/answer-validation/evaluate` - Evaluate answer
- `POST /api/dynamic-questions/generate` - Generate follow-up

### Proctoring & Fraud
- `POST /api/proctoring/video/analyze` - Analyze video frame
- `POST /api/proctoring/session/evaluate` - Evaluate session
- `POST /api/fraud-detection/analyze` - Detect fraud

### Enterprise Features
- `POST /api/code-analysis/analyze` - Analyze code quality/security
- `POST /api/sso/configure` - Configure SSO provider
- `POST /api/webhooks/register` - Register webhook
- `POST /api/ats/configure` - Configure ATS integration
- `GET /api/analytics/dashboard` - Get analytics dashboard

---

## Contributing

1. Fork the project
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

---

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
  <p><b>18 Enterprise Services | 16 API Routes | Complete Phase 1-7 Implementation</b></p>
</div>