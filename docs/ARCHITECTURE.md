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
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │   Groq      │   │   Gemini    │   │   Azure     │   │   Piston    │  │
│  │   (AI)      │   │   (AI)      │   │   (TTS)     │   │   (Compiler)│  │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                         │
│                                                                              │
│  ┌─────────────────────────┐         ┌─────────────────────────┐         │
│  │      MongoDB            │         │         Redis            │         │
│  │  (Primary Database)     │         │  (Cache + Queue)         │         │
│  └─────────────────────────┘         └─────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
InterviewMinds/
├── apps/
│   ├── api/           # Express Backend (44 services)
│   └── web/           # React Frontend (13 pages, 31 services)
├── packages/
│   └── shared/        # Shared TypeScript types
└── docs/              # Documentation
```

---

## Enterprise Services Architecture (40+ Services)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTERPRISE SERVICES LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │
│  │  Core Accuracy   │ │    Security      │ │   Proctoring     │         │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤         │
│  │ jobMatching.ts   │ │ e2eEncryption.ts │ │ videoProctoring.ts│         │
│  │ questionGeneration│ │ biometricAuth.ts │ │                  │         │
│  │ codeAnalysis.ts  │ │ fraudDetection.ts│ │                  │         │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │
│  │ Truthfulness     │ │  Integrations    │ │  Infrastructure  │         │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤         │
│  │ resumeVerification│ │ ssoIntegration.ts│ │ multiTenancy.ts  │         │
│  │ answerValidation │ │ webhooks.ts      │ │ compliance.ts    │         │
│  │ dynamicQuestions │ │ atsIntegration.ts│ │                  │         │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │
│  │  Scheduling      │ │   Assessment     │ │  Collaboration   │         │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤         │
│  │ scheduling.ts    │ │ questionBank.ts  │ │ panelInterview.ts│         │
│  │ waitingRoom.ts   │ │ scorecard.ts    │ │ mockInterview.ts │         │
│  │ preparation.ts   │ │ sqlChallenges.ts │ │                  │         │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │
│  │  AI Analysis     │ │ Notifications    │ │  Assessment      │         │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤         │
│  │ aiAnalysis.ts   │ │ notifications.ts │ │ asyncVideo.ts    │         │
│  │ resumeScreener.ts│ │                  │ │ takeHome.ts      │         │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐                               │
│  │  Integration     │ │   Reporting       │                               │
│  ├──────────────────┤ ├──────────────────┤                               │
│  │ gitIntegration.ts│ │ reportGenerator.ts│                               │
│  └──────────────────┘ └──────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Complete Feature Summary

| Phase | Services | Count |
|-------|-----------|-------|
| **Phase 1: Core** | jobMatching, questionGeneration, codeAnalysis | 3 |
| **Phase 2: Security** | e2eEncryption, biometricAuth, fraudDetection, geoFencing | 4 |
| **Phase 3: Proctoring** | videoProctoring | 1 |
| **Phase 4: Truthfulness** | resumeVerification, answerValidation, dynamicQuestions | 3 |
| **Phase 5: Integrations** | ssoIntegration, webhooks, atsIntegration | 3 |
| **Phase 6: Infrastructure** | multiTenancy, compliance | 2 |
| **Phase 7: Analytics** | analytics | 1 |
| **Phase 8: Advanced** | scheduling, questionBank, scorecard, reportGenerator, asyncVideo, takeHome, preparation, waitingRoom, mockInterview, panelInterview, aiAnalysis, notifications, resumeScreener, sqlChallenges, gitIntegration | 15 |

**Total: 40+ Enterprise Services | 13 Pages | 31 Frontend Services**

---

## Frontend Pages & Routes

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

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Monorepo** | Turborepo | Efficient builds, shared code |
| **Frontend** | React 18 + Vite | Fast HMR, optimized bundles |
| **UI** | Shadcn UI + Tailwind | Modern, accessible |
| **Backend** | Express + TypeScript | Type safety, middleware |
| **Database** | MongoDB | Flexible schema |
| **Cache** | Redis | Rate limiting, sessions |
| **AI** | Groq (Llama 3) | Ultra-low latency |
| **Auth** | Clerk | Simple integration |
| **Deployment** | Vercel | Edge network, automatic SSL |

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY STACK                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Authentication:                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │  Clerk   │  │Biometric │  │   E2E    │  │   SSO    │                    │
│  │   JWT    │  │   Face/  │  │Encryption│  │ OAuth/   │                    │
│  │          │  │ Voice/FP │  │   RSA    │  │   SAML   │                    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                    │
│                                                                              │
│  Authorization:                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │   RBAC   │  │  Audit   │  │ Rate     │  │ Geo-     │                    │
│  │ Role-Based│  │  Logging │  │ Limiting │  │ Fencing  │                    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Production Deployment                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Vercel (Frontend)                                                           │
│  • Edge Network (Global CDN)                                                 │
│  • Automatic SSL                                                             │
│  • PWA Support                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Render / Docker (Backend)                            │
│                                                                              │
│  API Server (Node.js) │ Redis (Cache/Queue) │ MongoDB (Database)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Production Ready Features

- ✅ 40+ Backend Services
- ✅ 13 Frontend Pages
- ✅ 15 Routes
- ✅ 31 API Service Modules
- ✅ Full Security (E2E, Biometric, SSO)
- ✅ Video Proctoring
- ✅ Scheduling & Calendar
- ✅ Question Bank Management
- ✅ Scorecard Evaluation
- ✅ Report Generation (PDF/CSV/JSON)
- ✅ Pipeline Kanban Board
- ✅ AI Analysis (Confidence, Sentiment)
- ✅ Notifications (Email/SMS/Slack)
- ✅ Resume Screener & Chatbot
- ✅ SQL Challenges & GitHub Integration

**Total: 68 Features Complete**