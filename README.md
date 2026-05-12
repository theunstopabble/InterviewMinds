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

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Frontend Pages](#frontend-pages)
- [Backend Services](#backend-services)
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

### Advanced Features (NEW)
- **Scheduling**: Calendar-based interview booking with timezone support
- **Pipeline Management**: Drag-drop Kanban board for candidate tracking
- **AI Resume Screener**: Automatic candidate screening with chatbot pre-screening
- **Panel Interviews**: Multiple interviewers with real-time collaboration
- **Reports**: PDF/CSV/JSON exports with branding

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

## Frontend Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/sign-in` | SignInPage | Authentication |
| `/` | DashboardPage | Resume & Job Matching |
| `/dashboard` | DashboardPage | History & Stats |
| `/interview` | InterviewPage | Live Interview |
| `/feedback/:id` | FeedbackPage | Results |
| `/settings` | SettingsPage | Enterprise Settings |
| `/analytics` | AnalyticsPage | Dashboard & Trends |
| `/admin` | AdminPage | Compliance & Audit |
| `/candidate-portal` | CandidatePortal | Self-service |
| `/scheduling` | SchedulingPage | Calendar & Booking |
| `/questions` | QuestionBankPage | Question Library |
| `/reports` | ReportsPage | PDF/CSV Export |
| `/preparation` | PreparationPage | System Check |
| `/pipeline` | PipelinePage | Kanban Board |

**Total: 13 Pages | 31 Service Modules**

---

## Backend Services

### Enterprise Services (40+)
- Core: jobMatching, questionGeneration, codeAnalysis
- Security: e2eEncryption, biometricAuth, fraudDetection, geoFencing
- Proctoring: videoProctoring
- Assessment: resumeVerification, answerValidation, dynamicQuestions
- Integrations: ssoIntegration, webhooks, atsIntegration
- Infrastructure: multiTenancy, compliance
- Analytics: analytics
- Scheduling: scheduling, waitingRoom, preparation
- Assessment: questionBank, scorecard, sqlChallenges
- Collaboration: mockInterview, panelInterview, asyncVideo, takeHome
- AI: aiAnalysis, resumeScreener
- Communication: notifications, gitIntegration
- Reporting: reportGenerator

---

## Folder Structure

```
InterviewMinds/
├── apps/
│   ├── api/                           # Backend Server
│   │   ├── src/
│   │   │   ├── lib/                   # Enterprise Services (44 files)
│   │   │   ├── routes/                # API Routes (24+ files)
│   │   │   ├── middleware/            # Auth, RBAC, Audit
│   │   │   ├── models/                # MongoDB schemas
│   │   │   └── index.ts               # Entry point
│   │   └── Dockerfile
│   └── web/                          # Frontend Client
│       ├── src/
│       │   ├── components/            # UI components (26)
│       │   ├── hooks/                 # Custom React hooks
│       │   ├── pages/                 # Route pages (13)
│       │   ├── services/              # API services (31)
│       │   └── lib/                   # Utilities
│       ├── public/models/             # TensorFlow.js models
│       └── Dockerfile
├── packages/
│   └── shared/                       # Shared types
├── docs/                             # Documentation
│   ├── ENTERPRISE_ENHANCEMENTS.md    # Full feature spec
│   ├── API.md                       # API documentation
│   ├── ARCHITECTURE.md              # System architecture
│   ├── DB_SCHEMA.md                 # Database schema
│   ├── WORKFLOW.md                   # Process flows
│   ├── TECH_STACK.md                # Technology details
│   ├── EDGE_CASES.md                 # Edge case handling
│   └── DEPLOYMENT.md                # Deployment guide
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

### Core Interview
- `/api/resume/*` - Resume management
- `/api/chat/*` - AI chat
- `/api/code/*` - Code execution

### Security & Fraud
- `/api/e2e-encryption/*` - E2E encryption
- `/api/biometric/*` - Biometric auth
- `/api/fraud-detection/*` - Fraud detection
- `/api/geo-fencing/*` - Geo-fencing

### Assessment
- `/api/job-matching/*` - Resume-job matching
- `/api/questions/*` - Question generation
- `/api/answer-validation/*` - Answer evaluation
- `/api/dynamic-questions/*` - Follow-up questions
- `/api/code-analysis/*` - Code analysis

### Enterprise
- `/api/proctoring/*` - Video proctoring
- `/api/sso/*` - SSO integration
- `/api/webhooks/*` - Webhooks
- `/api/ats/*` - ATS integration
- `/api/tenants/*` - Multi-tenancy
- `/api/compliance/*` - Compliance

### Phase 8 Advanced
- `/api/scheduling/*` - Interview scheduling
- `/api/question-bank/*` - Question library
- `/api/scorecard/*` - Evaluation rubrics
- `/api/reports/*` - Report generation
- `/api/async-video/*` - Async interviews
- `/api/take-home/*` - Take-home challenges
- `/api/preparation/*` - System check
- `/api/mock-interview/*` - Practice mode
- `/api/panel-interview/*` - Panel interviews
- `/api/ai-analysis/*` - AI analysis
- `/api/notifications/*` - Notifications
- `/api/resume-screener/*` - Resume screening
- `/api/sql-challenges/*` - SQL testing
- `/api/git/*` - GitHub integration

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
  <p><b>40+ Enterprise Services | 13 Pages | 68 Features | Complete Phase 1-8 Implementation</b></p>
</div>