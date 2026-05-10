# InterviewMinds API Documentation

## Overview

The InterviewMinds API is a RESTful API built on Node.js/Express. It provides endpoints for resume management, AI-powered chat interviews, code compilation, and **40+ enterprise features** including security, proctoring, compliance, analytics, scheduling, and advanced assessments.

## Base URL

```
Production: https://api.interviewminds.com
Development: http://localhost:8000
```

## Authentication

All protected endpoints require a Clerk JWT token in the Authorization header:

```
Authorization: Bearer <clerk_jwt_token>
```

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 200 requests | 15 minutes |
| AI Services (Chat, TTS) | 30 requests | 1 minute |
| File Uploads | 10 requests | 15 minutes |
| Biometric Verification | 5 requests | 1 minute |

---

## REST Endpoints

---

### 1. Core Interview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/resume/upload | Upload resume PDF |
| GET | /api/resume | List user resumes |
| GET | /api/resume/:id | Get resume details |
| DELETE | /api/resume/:id | Delete resume |
| POST | /api/chat/send | Send chat message |
| POST | /api/chat/feedback | Submit interview feedback |
| POST | /api/code/execute | Execute code |

---

### 2. Job Matching

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/job-matching/extract | Extract entities from resume |
| POST | /api/job-matching/match | Match resume to job requirements |
| POST | /api/job-matching/extract-and-match | Extract and match in one call |

---

### 3. Question Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/questions/competencies | List all competencies |
| POST | /api/questions/generate | Generate questions for job |
| GET | /api/questions/:questionId | Get specific question |

---

### 4. Answer Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/answer-validation/evaluate | Evaluate single answer |
| POST | /api/answer-validation/batch-evaluate | Evaluate multiple answers |

---

### 5. Code Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/code-analysis/analyze | Analyze code quality |
| POST | /api/code-analysis/security-scan | Scan for vulnerabilities |

---

### 6. Video Proctoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/proctoring/video/analyze | Analyze video frame |
| POST | /api/proctoring/audio/analyze | Analyze audio frame |
| POST | /api/proctoring/screen/check | Check screen state |
| POST | /api/proctoring/session/evaluate | Evaluate session |
| GET | /api/proctoring/interview/:id/results | Get results |
| GET | /api/proctoring/sessions/:id | Get recording sessions |

---

### 7. Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/e2e-encryption/keys/create | Generate E2E encryption key pair |
| POST | /api/e2e-encryption/keys/rotate | Rotate encryption keys |
| POST | /api/biometric/enroll | Enroll biometric |
| POST | /api/biometric/verify | Verify biometric |
| POST | /api/geo-fencing/validate | Validate IP location |
| POST | /api/fraud-detection/analyze | Analyze fraud risk |

---

### 8. Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sso/config | Get SSO configuration |
| POST | /api/sso/config | Configure SSO |
| POST | /api/webhooks/register | Register webhook |
| POST | /api/ats/configure | Configure ATS |

---

### 9. Enterprise Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tenants | Create tenant |
| GET | /api/tenants/:tenantId | Get tenant details |
| PUT | /api/tenants/:tenantId/settings | Update settings |
| POST | /api/compliance/audit | Log audit event |
| GET | /api/compliance/audit | Query audit logs |
| POST | /api/compliance/consent | Record consent |
| GET | /api/compliance/security-controls | Get security controls |

---

### 10. Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/dashboard | Get dashboard |
| GET | /api/analytics/trends | Get interview trends |
| GET | /api/analytics/top-performers | Get top performers |
| POST | /api/analytics/predict | Predict candidate success |

---

### 11. Scheduling

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/scheduling/timezones | Get available timezones |
| GET | /api/scheduling/slots/:interviewerId | Get available slots |
| POST | /api/scheduling/book | Book interview slot |
| POST | /api/scheduling/reschedule | Reschedule interview |
| POST | /api/scheduling/cancel | Cancel interview |
| GET | /api/scheduling/upcoming | Get upcoming interviews |

---

### 12. Question Bank

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/question-bank | Get questions |
| GET | /api/question-bank/:id | Get question by ID |
| GET | /api/question-bank/search | Search questions |
| POST | /api/question-bank | Create question |
| PUT | /api/question-bank/:id | Update question |
| DELETE | /api/question-bank/:id | Delete question |
| GET | /api/question-bank/categories | Get categories |
| GET | /api/question-bank/stats | Get stats |

---

### 13. Scorecards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/scorecard/templates | Get scorecard templates |
| POST | /api/scorecard/templates | Create template |
| POST | /api/scorecard | Create scorecard |
| GET | /api/scorecard/:id | Get scorecard |
| POST | /api/scorecard/:id/score | Add score entry |
| POST | /api/scorecard/:id/note | Add timestamp note |
| POST | /api/scorecard/:id/submit | Submit scorecard |

---

### 14. Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reports/generate | Generate report |
| GET | /api/reports/:id | Get report |
| GET | /api/reports/candidate/:id | Get candidate reports |
| GET | /api/reports/:id/pdf | Download PDF |
| POST | /api/reports/export/csv | Export CSV |
| POST | /api/reports/export/json | Export JSON |

---

### 15. Async Video

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/async-video/create | Create async interview |
| POST | /api/async-video/:id/send | Send to candidate |
| POST | /api/async-video/:id/start | Start interview |
| POST | /api/async-video/:id/answer | Save answer |
| POST | /api/async-video/:id/complete | Complete interview |
| GET | /api/async-video/:id | Get interview |
| GET | /api/async-video/pending | Get pending |
| GET | /api/async-video/:id/progress | Get progress |

---

### 16. Take-home Challenges

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/take-home/create | Create challenge |
| POST | /api/take-home/:id/invite | Invite candidate |
| POST | /api/take-home/:id/bulk-invite | Bulk invite |
| POST | /api/take-home/:inviteId/start | Start challenge |
| POST | /api/take-home/:id/submit | Submit answers |
| GET | /api/take-home/:id | Get challenge |
| GET | /api/take-home/pending | Get pending |
| GET | /api/take-home/:id/stats | Get stats |

---

### 17. Preparation & System Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/preparation/system-check | Run system check |
| POST | /api/preparation/start | Start session |
| GET | /api/preparation/session/:id | Get session |
| POST | /api/preparation/session/:id/complete | Complete session |
| POST | /api/preparation/break-timer/start | Start break timer |
| POST | /api/preparation/break-timer/:id/take-break | Take break |

---

### 18. Mock Interviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/mock-interview/create | Create mock interview |
| POST | /api/mock-interview/:id/start | Start mock |
| POST | /api/mock-interview/:id/answer | Submit answer |
| POST | /api/mock-interview/:id/complete | Complete |
| GET | /api/mock-interview/:id/feedback | Get feedback |
| GET | /api/mock-interview/my-mocks | Get my mocks |

---

### 19. Panel Interviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/panel-interview/create | Create panel interview |
| GET | /api/panel-interview/:id | Get panel |
| POST | /api/panel-interview/:id/panelist | Add panelist |
| POST | /api/panel-interview/:id/join | Join session |
| POST | /api/panel-interview/:id/message | Send message |
| POST | /api/panel-interview/:id/score | Submit score |
| POST | /api/panel-interview/:id/complete | Complete |

---

### 20. AI Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ai-analysis/confidence/:id | Get confidence score |
| POST | /api/ai-analysis/comparative | Get comparative analysis |
| GET | /api/ai-analysis/skill-radar/:id | Get skill radar |
| POST | /api/ai-analysis/sentiment | Analyze sentiment |

---

### 21. Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/notifications/send | Send notification |
| POST | /api/notifications/send-template | Send templated |
| GET | /api/notifications/templates | Get templates |
| GET | /api/notifications/my | Get my notifications |
| POST | /api/notifications/:id/read | Mark as read |
| GET | /api/notifications/unread-count | Get unread count |

---

### 22. Resume Screener

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/resume-screener/screen | Screen resume |
| GET | /api/resume-screener/result/:id | Get result |
| GET | /api/resume-screener/candidate/:id | Get candidate results |

---

### 23. SQL Challenges

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sql-challenges | Get challenges |
| GET | /api/sql-challenges/:id | Get challenge |
| POST | /api/sql-challenges/:id/submit | Submit query |
| GET | /api/sql-challenges/:id/stats | Get stats |

---

### 24. Git Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/git/connect | Connect GitHub |
| POST | /api/git/disconnect | Disconnect |
| GET | /api/git/repositories | Get repositories |
| POST | /api/git/repositories/:id/analyze | Analyze repo |
| GET | /api/git/repositories/:id/analysis | Get analysis |
| GET | /api/git/report | Get candidate report |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Versioning

Current API Version: **v1**

All endpoints are prefixed with `/api/`

---

## Support

For API support, contact: support@interviewminds.com