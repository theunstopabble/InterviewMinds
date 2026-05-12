# InterviewMinds API Documentation

> **Version:** 1.0.0 | **Last Updated:** May 2026 | **Status:** Production Ready

## Table of Contents
- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
- [Error Codes](#error-codes)
- [Versioning](#versioning)
- [Support](#support)

---

## Overview

The InterviewMinds API is a comprehensive RESTful API built on Node.js/Express with TypeScript. It provides **150+ endpoints** across 18 phases of enterprise features including:

- **Core Interview:** Resume parsing, AI chat, code execution
- **AI & LLM:** Groq-powered interviewer, multimodal analysis, smart assessment
- **Security:** E2E encryption, biometric auth, fraud detection, geo-fencing
- **Proctoring:** Video analysis, eye tracking, screen monitoring
- **Enterprise:** Multi-tenancy, SSO, RBAC, compliance
- **Analytics:** Predictive analytics, sentiment analysis, anomaly detection
- **Integration:** HRIS, Slack/Teams, background checks, Zoom/Meet
- **Collaboration:** Real-time code editor, whiteboard, video calls
- **Automation:** AI agents, workflow automation

---

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.interviewminds.com` |
| Development | `http://localhost:8000` |
| Staging | `https://staging.interviewminds.com` |

---

## Authentication

All protected endpoints require JWT authentication via **Clerk**:

```http
Authorization: Bearer <clerk_jwt_token>
```

### Public Endpoints (No Auth Required)
- `/api/auth/*` - Login, register
- `/api/health` - Health check
- `/api/health/ready` - Readiness check
- `/api/health/live` - Liveness check

---

## Rate Limiting

| Tier | Endpoint Type | Limit | Window |
|------|---------------|-------|--------|
| **Free** | General API | 100 requests | 15 min |
| **Pro** | General API | 500 requests | 15 min |
| **Enterprise** | General API | 2000 requests | 15 min |
| All | AI Services (Chat, TTS) | 30 requests | 1 min |
| All | File Uploads | 10 requests | 15 min |
| All | Biometric Verification | 5 requests | 1 min |

---

## API Endpoints

### Phase 1: Core Interview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/upload` | Upload resume PDF |
| GET | `/api/resume` | List user resumes |
| GET | `/api/resume/:id` | Get resume details |
| DELETE | `/api/resume/:id` | Delete resume |
| POST | `/api/chat/send` | Send chat message |
| POST | `/api/chat/feedback` | Submit feedback |
| POST | `/api/code/execute` | Execute code |
| POST | `/api/interview/start` | Start interview |
| POST | `/api/interview/end` | End interview |
| GET | `/api/interview/history` | Get history |

### Phase 2: Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/e2e-encryption/keys/create` | Generate E2E key pair |
| POST | `/api/e2e-encryption/keys/rotate` | Rotate keys |
| POST | `/api/biometric/enroll` | Enroll biometric |
| POST | `/api/biometric/verify` | Verify biometric |
| POST | `/api/fraud-detection/analyze` | Analyze fraud risk |
| POST | `/api/geo-fencing/validate` | Validate IP location |

### Phase 3: Video Proctoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/proctoring/video/analyze` | Analyze video frame |
| POST | `/api/proctoring/audio/analyze` | Analyze audio |
| POST | `/api/proctoring/screen/check` | Check screen state |
| POST | `/api/proctoring/session/evaluate` | Evaluate session |
| GET | `/api/proctoring/interview/:id/results` | Get results |

### Phase 4: Assessment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/job-matching/match` | Match resume to job |
| POST | `/api/questions/generate` | Generate questions |
| POST | `/api/answer-validation/evaluate` | Evaluate answer |
| POST | `/api/dynamic-questions/followup` | Get follow-up questions |
| POST | `/api/code-analysis/analyze` | Analyze code quality |

### Phase 5: Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/sso/config` | SSO configuration |
| POST | `/api/webhooks/register` | Register webhook |
| POST | `/api/ats/configure` | Configure ATS |
| GET | `/api/ats/candidates` | Get ATS candidates |

### Phase 6: Enterprise

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tenants` | Create tenant |
| GET | `/api/tenants/:tenantId` | Get tenant |
| PUT | `/api/tenants/:tenantId/settings` | Update settings |
| GET | `/api/compliance/audit` | Query audit logs |
| POST | `/api/compliance/audit` | Log audit event |

### Phase 7: Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Get dashboard |
| GET | `/api/analytics/trends` | Get trends |
| GET | `/api/analytics/top-performers` | Top performers |
| POST | `/api/analytics/predict` | Predict success |

### Phase 8: Advanced Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scheduling/slots` | Available slots |
| POST | `/api/scheduling/book` | Book interview |
| POST | `/api/scheduling/reschedule` | Reschedule |
| POST | `/api/scheduling/cancel` | Cancel |
| GET | `/api/question-bank` | Get questions |
| POST | `/api/question-bank` | Create question |
| GET | `/api/scorecard/templates` | Get templates |
| POST | `/api/scorecard` | Create scorecard |
| POST | `/api/reports/generate` | Generate report |
| GET | `/api/reports/:id/pdf` | Download PDF |
| POST | `/api/mock-interview/create` | Create mock |
| POST | `/api/panel-interview/create` | Create panel |

### Phase 9: AI & LLM

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/llm-interviewer/create` | Create session |
| POST | `/api/llm-interviewer/chat` | Chat with AI |
| POST | `/api/llm-interviewer/followup` | Get follow-up |
| GET | `/api/llm-interviewer/summary/:id` | Get summary |
| POST | `/api/multimodal-ai/analyze` | Analyze frame |
| POST | `/api/multimodal-ai/voice/analyze` | Voice analysis |
| POST | `/api/smart-assessment/generate-questions` | Generate questions |
| POST | `/api/smart-assessment/competency-gap` | Gap analysis |
| POST | `/api/smart-assessment/predict-success` | Predict success |

### Phase 10: Infrastructure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/infrastructure/health/pool` | DB pool stats |
| POST | `/api/infrastructure/cache/clear` | Clear cache |
| POST | `/api/infrastructure/cdn/invalidate` | Invalidate CDN |
| GET | `/api/infrastructure/system/metrics` | System metrics |
| POST | `/api/infrastructure/events/publish` | Publish event |

### Phase 11: Collaboration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/collaboration/editor/create` | Create editor |
| POST | `/api/collaboration/editor/join` | Join session |
| POST | `/api/collaboration/whiteboard/create` | Create whiteboard |
| POST | `/api/collaboration/video/create` | Create video call |
| POST | `/api/collaboration/note/create` | Create note |
| POST | `/api/collaboration/vote/create` | Create vote |

### Phase 12: Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analytics/predict/attrition` | Predict attrition |
| POST | `/api/analytics/predict/performance` | Predict performance |
| POST | `/api/analytics/sentiment/analyze` | Analyze sentiment |
| POST | `/api/analytics/report/generate` | Generate report |
| POST | `/api/analytics/anomaly/detect` | Detect anomalies |

### Phase 13: Developer

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/developer/github/repos` | Get GitHub repos |
| POST | `/api/developer/code-review` | Review code |
| POST | `/api/developer/test/run` | Run tests |
| POST | `/api/developer/sandbox/create` | Create sandbox |
| POST | `/api/developer/sandbox/execute` | Execute code |

### Phase 14: Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance/retention/policies` | Get policies |
| POST | `/api/compliance/pii/detect` | Detect PII |
| POST | `/api/compliance/pii/mask` | Mask PII |
| POST | `/api/compliance/access/request` | Request access |
| GET | `/api/compliance/audit/logs` | Get audit logs |
| POST | `/api/compliance/audit/export` | Export logs |

### Phase 15: Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/integration/hris/sync` | Sync HRIS |
| POST | `/api/integration/slack/send` | Send Slack message |
| POST | `/api/integration/teams/send` | Send Teams message |
| POST | `/api/integration/video/zoom/create` | Create Zoom meeting |
| POST | `/api/integration/background/check` | Background check |

### Phase 16: Mobile

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mobile/device/register` | Register device |
| POST | `/api/mobile/notification/send` | Send push notification |
| POST | `/api/mobile/offline/action` | Queue offline action |
| POST | `/api/mobile/offline/sync` | Sync offline data |
| GET | `/api/mobile/features` | Get feature flags |

### Phase 17: Observability

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/observability/metrics/system` | System metrics |
| POST | `/api/observability/alerts/rules` | Create alert rule |
| GET | `/api/observability/alerts/active` | Active alerts |
| GET | `/api/observability/logs` | Query logs |
| GET | `/api/observability/health` | Health check |
| GET | `/api/observability/tracing/:traceId` | Get trace |

### Phase 18: AI Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/agents` | List agents |
| POST | `/api/agent/agents/run` | Run agent |
| GET | `/api/agent/tasks` | Get tasks |
| GET | `/api/agent/automations` | List automations |
| POST | `/api/agent/trigger` | Trigger automation |

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| **400** | Bad Request - Invalid parameters | Check request body |
| **401** | Unauthorized - Invalid/missing token | Re-authenticate |
| **403** | Forbidden - Insufficient permissions | Check role permissions |
| **404** | Not Found - Resource doesn't exist | Verify resource ID |
| **409** | Conflict - Duplicate resource | Use different identifier |
| **422** | Validation Failed | Check field constraints |
| **429** | Too Many Requests - Rate limit | Wait and retry |
| **500** | Internal Server Error | Contact support |
| **502** | Bad Gateway | Check service health |
| **503** | Service Unavailable | Retry later |

---

## Versioning

- **Current Version:** `v1`
- **Breaking Changes:** Will bump to v2
- **Deprecation:** 3 months notice before removing endpoints

All endpoints are prefixed with `/api/`

---

## WebSocket Events

For real-time features (interviews, collaboration):

```javascript
// Connect
const socket = io('https://api.interviewminds.com', {
  auth: { token: 'jwt_token' }
});

// Events
socket.on('interview:message', (data) => {});
socket.on('collaboration:update', (data) => {});
socket.on('proctoring:alert', (data) => {});
```

---

## Support

- **Email:** support@interviewminds.com
- **Discord:** https://discord.gg/interviewminds
- **Documentation:** https://docs.interviewminds.com

---
*InterviewMinds - Enterprise-Grade AI Mock Interview Platform*