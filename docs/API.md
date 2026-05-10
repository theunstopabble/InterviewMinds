# InterviewMinds API Documentation

## Overview

The InterviewMinds API is a RESTful + GraphQL API built on Node.js/Express. It provides endpoints for resume management, AI-powered chat interviews, code compilation, and user authentication.

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
| GraphQL | 100 requests | 1 minute |

## REST Endpoints

---

### 1. Resume Management

#### POST /api/resume/upload
Upload a resume PDF for processing.

**Request:**
```http
POST /api/resume/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

------boundary
Content-Disposition: form-data; name="resume"; filename="resume.pdf"
Content-Type: application/pdf
<file_content>
------boundary--
```

**Response:**
```json
{
  "message": "Resume uploaded successfully. Processing in background.",
  "id": "507f1f77bcf86cd799439011",
  "previewText": "Processing..."
}
```

**Status Codes:**
- 201: Created
- 400: Invalid file type (only PDF allowed)
- 401: Unauthorized
- 413: File too large (max 5MB)
- 429: Rate limited

#### GET /api/resume/:id/status
Check resume processing status.

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "completed",
  "previewText": "John Doe - Software Engineer..."
}
```

---

### 2. Chat/Interview

#### POST /api/chat
Send a message to the AI interviewer.

**Request:**
```json
{
  "message": "Tell me about your React experience",
  "resumeId": "507f1f77bcf86cd799439011",
  "history": [
    { "role": "user", "text": "Hello" },
    { "role": "model", "text": "Hi! I'm Vikram..." }
  ],
  "mode": "strict",
  "difficulty": "medium",
  "language": "english"
}
```

**Response:**
```json
{
  "reply": "I noticed you worked on a React project called SwadKart..."
}
```

**Modes:**
- `strict` - Vikram (Senior Engineer, technical, demanding)
- `friendly` - Neha (HR Manager, supportive)
- `system` - Sam (System Architect, design-focused)

**Languages:**
- `english` - Professional English
- `hinglish` - Mix of Hindi and English

---

### 3. Interview Management

#### POST /api/interview/end
End an interview session and get AI-generated feedback.

**Request:**
```json
{
  "resumeId": "507f1f77bcf86cd799439011",
  "history": [
    { "role": "user", "text": "I built a React app..." },
    { "role": "ai", "text": "What challenges did you face?" }
  ]
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "score": 78,
  "metrics": [
    { "subject": "Content Quality", "A": 80, "fullMark": 100 },
    { "subject": "Communication Skills", "A": 75, "fullMark": 100 },
    { "subject": "Behavioral Indicators", "A": 82, "fullMark": 100 },
    { "subject": "Domain Expertise", "A": 75, "fullMark": 100 }
  ]
}
```

#### GET /api/interview/history
Get user's interview history.

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "score": 78,
    "feedback": "Good technical understanding...",
    "createdAt": "2024-01-15T10:30:00Z",
    "metrics": [...]
  }
]
```

#### GET /api/interview/:id
Get detailed interview feedback.

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "user_123",
  "score": 78,
  "feedback": "Good technical understanding...",
  "messages": [...],
  "metrics": [...],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 4. Code Compiler

#### POST /api/compiler/execute
Execute code in a sandboxed environment.

**Request:**
```json
{
  "language": "javascript",
  "code": "console.log('Hello');"
}
```

**Response:**
```json
{
  "run": {
    "stdout": "Hello\n",
    "stderr": "",
    "output": "Hello\n",
    "code": 0
  },
  "language": "javascript",
  "version": "18.15.0"
}
```

**Supported Languages:**
| Language | Version |
|----------|---------|
| javascript | 18.15.0 |
| python | 3.10.0 |
| java | 15.0.2 |
| c | 10.2.0 |
| cpp | 10.2.0 |
| go | 1.16.2 |
| rust | 1.68.2 |
| typescript | 5.0.3 |

**Error Response:**
```json
{
  "run": {
    "stdout": "",
    "stderr": "ReferenceError: console is not defined",
    "output": "ReferenceError: console is not defined",
    "code": 1
  },
  "language": "javascript"
}
```

---

### 5. Text-to-Speech

#### POST /api/tts/speak
Convert text to speech using Azure Cognitive Services.

**Request:**
```json
{
  "text": "Tell me about your biggest project",
  "gender": "female",
  "language": "english"
}
```

**Response:**
```
HTTP 200
Content-Type: audio/mpeg
<binary_audio_data>
```

---

### 6. Admin

#### GET /api/admin/dashboard
Get admin dashboard statistics. Requires `audit:read` permission.

**Response:**
```json
{
  "summary": {
    "totalInterviews": 1250,
    "recentInterviews": 89,
    "avgScore": 72.5,
    "totalUsers": 456
  },
  "roleDistribution": [
    { "role": "candidate", "count": 420 },
    { "role": "interviewer", "count": 30 },
    { "role": "admin", "count": 6 }
  ],
  "recentActivity": [...]
}
```

#### GET /api/admin/users
List all users with pagination. Requires `user:read` permission.

**Query Parameters:**
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset

---

### 7. Export

#### GET /api/export/interviews
Export user's interview data. Requires authentication.

**Query Parameters:**
- `format`: json or csv (default: json)
- `limit`: Number of records (default: 50, max: 1000)
- `offset`: Pagination offset

**CSV Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="interviews.csv"
```

---

## GraphQL API

### Endpoint
```
POST /graphql
```

### Authentication
Pass JWT in the Authorization header or X-Apollo-Operation-Name for persisted queries.

### Queries

#### me
Get current user info.

```graphql
query {
  me {
    id
    role
    interviewCount
    resumeCount
    lastActivity
  }
}
```

#### interviews
Get user's interview history.

```graphql
query {
  interviews(limit: 20, offset: 0) {
    items {
      id
      score
      feedback
      status
      createdAt
    }
    total
    hasMore
  }
}
```

#### adminStats
Get admin statistics. Requires admin role.

```graphql
query {
  adminStats {
    totalUsers
    totalInterviews
    totalResumes
    avgScore
    activeToday
    topLanguages {
      language
      count
    }
  }
}
```

### Mutations

#### registerWebhook
Register a webhook for events.

```graphql
mutation {
  registerWebhook(
    url: "https://example.com/webhook"
    events: ["interview.completed", "user.registered"]
    secret: "your-secret-key"
  ) {
    id
    url
    active
  }
}
```

#### updateUserRole
Update user role. Requires admin role.

```graphql
mutation {
  updateUserRole(
    userId: "user_123"
    role: "interviewer"
  ) {
    userId
    role
    assignedAt
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 408 | Request Timeout |
| 413 | Payload Too Large |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable (circuit breaker open) |
| 504 | Gateway Timeout |

### Circuit Breaker Response

When an external service circuit breaker is open:

```json
{
  "error": "AI service temporarily unavailable",
  "retryAfter": 45
}
```

---

## WebSocket Events

### Connection
Connect to Socket.IO at `/` with auth token.

```javascript
const socket = io('http://localhost:8000', {
  auth: {
    token: '<jwt_token>',
    userId: 'user_123',
    fullName: 'John Doe'
  }
});
```

### Events

#### join-room
Join a chat room.

```javascript
socket.emit('join-room', 'room_123');
```

#### send-message
Send a chat message.

```javascript
socket.emit('send-message', {
  roomId: 'room_123',
  content: 'Hello!',
  type: 'text' // or 'code'
});
```

#### typing
Send typing indicator.

```javascript
socket.emit('typing', 'room_123', true);
```

### Incoming Events

- `new-message` - New chat message
- `history` - Chat history on room join
- `user-joined` - User joined notification
- `user-left` - User left notification
- `typing` - Typing indicator from other users

---

## Health Check

### GET /health

Returns system health status including circuit breakers.

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "mongo": "connected",
    "redis": "connected",
    "groq": "connected",
    "piston": "connected"
  },
  "circuitBreakers": {
    "groq": { "state": "closed", "failures": 0 },
    "gemini": { "state": "closed", "failures": 0 },
    "azure-speech": { "state": "closed", "failures": 0 },
    "piston": { "state": "closed", "failures": 0 }
  }
}
```

---

## CSRF Protection

### GET /api/csrf
Get CSRF token for requests that modify data.

**Response:**
```json
{
  "csrfToken": "abc123..."
}
```

The token should be included in subsequent requests:
```
X-CSRF-Token: abc123...
```