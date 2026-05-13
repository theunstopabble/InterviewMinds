# API Reference

**Version:** 2.0.0  
**Last Updated:** May 2026

---

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8000` |
| Production | `https://api.interviewminds.com` |

---

## Authentication

All protected endpoints require a valid Clerk JWT token in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt-token>
```

Roles: `candidate`, `interviewer`, `admin` (with wildcard permissions).

---

## Common Headers

| Header | Description |
|--------|-------------|
| `Authorization` | Bearer token (Clerk JWT) |
| `Content-Type` | `application/json` |
| `X-Correlation-ID` | Auto-generated request trace ID (returned in response) |

---

## Health & System Endpoints

### GET /health

Health check with service status and circuit breaker state.

**Response:**
```json
{
  "status": "ok | degraded | unhealthy",
  "timestamp": "2026-05-01T00:00:00.000Z",
  "services": {
    "mongo": "connected | disconnected",
    "redis": "connected | disconnected",
    "groq": "connected | unreachable",
    "piston": "connected | unreachable"
  },
  "circuitBreakers": { ... }
}
```

### GET /metrics

Prometheus exposition format metrics.

### GET /ping

Simple liveness probe.

### GET /api/csrf

Returns a CSRF token for form submissions.

---

## Interview Routes

### POST /api/interview

Create a new interview session.

**Auth:** Required (candidate, interviewer, admin)  
**Rate Limit:** General

### GET /api/interview/:id

Get interview details and history.

### PUT /api/interview/:id

Update interview status or metadata.

---

## Chat Routes

### POST /api/chat

Send a message in an interview chat session. Uses Groq LLM (Llama 3.3-70b) for AI responses.

**Auth:** Required  
**Rate Limit:** AI (stricter)

---

## Resume Routes

### POST /api/resume/upload

Upload and parse a resume (PDF/DOCX).

**Auth:** Required  
**Rate Limit:** Upload  
**Max Size:** 10MB

### GET /api/resume/:id

Retrieve parsed resume with chunks and embeddings.

### POST /api/resume/verify

Verify resume claims against external data.

---

## Code Execution

### POST /api/compiler/execute

Execute code in a sandboxed environment via Piston API.

**Auth:** Required  
**Rate Limit:** AI  
**Circuit Breaker:** Yes (Piston service)

**Request:**
```json
{
  "language": "javascript",
  "code": "console.log('hello')",
  "stdin": ""
}
```

---

## AI & Assessment Routes

### POST /api/dynamic-questions

Generate dynamic follow-up questions based on interview context.

### POST /api/answer-validation

Validate candidate answers using AI scoring.

### POST /api/llm-interviewer/session

Start an LLM-powered interview session.

### POST /api/multimodal-ai/analyze

Run multimodal analysis (voice tone, facial expressions, gestures, eye gaze, posture).

**Request:**
```json
{
  "audioText": "transcript of candidate speech",
  "facialData": { "happy": 20, "neutral": 60, ... },
  "gestureData": [100, 200, 150],
  "eyePositions": [{ "x": 0.1, "y": -0.05 }],
  "postureKeypoints": { "nose": { "x": 0.5, "y": 0.3 }, "shoulders": { "x": 0.5, "y": 0.6 } }
}
```

**Response:**
```json
{
  "voice": { "confidence": 75, "nervousness": 20, "enthusiasm": 80, "clarity": 85, "pace": 60, "sentiment": "positive", "source": "groq" },
  "facial": { "expressions": { ... }, "dominantEmotion": "neutral", "engagementScore": 70 },
  "gestures": { "fidgeting": 20, "overallBodyLanguage": "positive" },
  "eyeGaze": { "gazeDirection": "center", "lookingAtScreen": 85 },
  "posture": { "posture": "upright", "engagementLevel": 90 },
  "overallScore": 78,
  "warnings": []
}
```

### POST /api/smart-assessment

AI-powered adaptive assessment with difficulty scaling.

---

## Video Proctoring

### POST /api/proctoring/frame

Process a video frame for proctoring analysis.

**Auth:** Required  
**Request:**
```json
{
  "frameData": "<base64-encoded-frame>",
  "previousPositions": [{ "x": 0.5, "y": 0.3 }]
}
```

### POST /api/proctoring/audio

Process audio frame for voice analysis.

### POST /api/proctoring/screen

Report screen monitoring state.

### POST /api/proctoring/evaluate

Evaluate complete proctoring session and generate risk score.

---

## Collaboration Routes

### POST /api/collaboration/session

Create a collaborative editing session.

### POST /api/collaboration/join

Join an existing collaboration session.

### PUT /api/collaboration/document

Update document with CRDT three-way merge.

### POST /api/collaboration/whiteboard

Create a whiteboard session with MongoDB persistence.

### POST /api/collaboration/video

Create a video call session with ICE server configuration.

---

## Security Routes

### POST /api/e2e-encryption/keypair

Generate RSA-4096 keypair for E2E encryption.

### POST /api/e2e-encryption/encrypt

Encrypt a message with AES-256-GCM.

### POST /api/biometric/enroll

Enroll biometric authentication data.

### POST /api/fraud-detection/analyze

Analyze session for fraud indicators.

### POST /api/geo-fencing/check

Verify candidate location against allowed regions.

---

## Admin Routes

### GET /api/admin/users

List all users with roles. **Auth:** admin only.

### GET /api/admin/audit-logs

Query audit log entries with filtering.

### POST /api/admin/roles

Assign or update user roles.

---

## Export & Reports

### GET /api/export/interviews

Export interview data as CSV/JSON.

### GET /api/reports/dashboard

Get dashboard analytics data.

### GET /api/reports/candidate/:id

Get detailed candidate report.

---

## Webhooks

### POST /api/webhooks/register

Register a webhook endpoint.

**Request:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["interview.completed", "score.generated"],
  "secret": "your-webhook-secret"
}
```

### GET /api/webhooks

List registered webhooks with delivery tracking.

---

## GraphQL API

### Endpoint: POST /graphql

**Rate Limit:** GraphQL-specific  
**Auth:** Via context (Clerk token)

```graphql
type Query {
  interviews(userId: String!): [Interview!]!
  interview(id: ID!): Interview
  analytics(timeRange: TimeRange!): AnalyticsData!
}

type Mutation {
  createInterview(input: CreateInterviewInput!): Interview!
  updateScore(interviewId: ID!, score: ScoreInput!): Interview!
}
```

---

## Integration Routes

### POST /api/ats/sync

Sync with Applicant Tracking System.

### POST /api/sso/saml

SAML SSO authentication endpoint.

### GET /api/integration/status

Check integration health for all connected services.

---

## Scheduling

### POST /api/scheduling/create

Create an interview schedule.

### GET /api/scheduling/available

Get available time slots.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (development only)",
  "correlationId": "uuid-for-tracing"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (circuit breaker open) |

---

## Rate Limits

| Tier | Applies To | Notes |
|------|-----------|-------|
| General | All routes | Standard request throttling |
| AI | `/api/chat`, `/api/compiler`, `/api/tts`, `/api/llm-interviewer`, `/api/smart-assessment` | Stricter limits for expensive LLM calls |
| Upload | `/api/resume` | File size + frequency |
| GraphQL | `/graphql` | Query complexity aware |
