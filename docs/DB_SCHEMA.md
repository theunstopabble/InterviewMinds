# Database Schema

**Version:** 2.0.0  
**Last Updated:** May 2026

---

## Overview

InterviewMinds uses MongoDB as the primary data store with 7 Mongoose models. Redis serves as the caching and job queue layer.

```
┌─────────────────────────────────────────────────────────┐
│                    MongoDB Atlas                         │
├─────────────────────────────────────────────────────────┤
│  Collections:                                           │
│  ├── interviews          (Interview model)              │
│  ├── resumes             (Resume model)                 │
│  ├── userroles           (UserRole model)               │
│  ├── auditlogs           (AuditLog model)               │
│  ├── messages            (Message model)                │
│  ├── practiceinterviews  (PracticeInterview model)      │
│  └── webhooks            (Webhook model)                │
├─────────────────────────────────────────────────────────┤
│  Connection: maxPoolSize=20, minPoolSize=5              │
│  Timeout: serverSelection=5s, socket=45s                │
│  Options: bufferCommands=false, retryWrites=true        │
└─────────────────────────────────────────────────────────┘
```

---

## Models

### 1. Interview

**File:** `apps/api/src/models/Interview.ts`  
**Collection:** `interviews`

Stores interview sessions with messages, scoring, and performance metrics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | Clerk user ID |
| `resumeId` | String | No | Reference to parsed resume |
| `status` | String (enum) | Yes | `pending`, `active`, `completed`, `cancelled` |
| `messages` | Array | No | Chat message history |
| `score` | Number | No | Overall interview score (0-100) |
| `feedback` | Object | No | AI-generated feedback |
| `metrics` | Object | No | Performance metrics (timing, accuracy) |
| `createdAt` | Date | Auto | Mongoose timestamp |
| `updatedAt` | Date | Auto | Mongoose timestamp |

---

### 2. Resume

**File:** `apps/api/src/models/Resume.ts`  
**Collection:** `resumes`

Stores uploaded resumes with parsed content and vector embeddings for semantic search.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | Owner's Clerk user ID |
| `fileName` | String | Yes | Original file name |
| `content` | String | Yes | Extracted text content |
| `chunks` | Array | No | Text chunks with embeddings |
| `chunks[].text` | String | Yes | Chunk text content |
| `chunks[].embedding` | [Number] | No | Vector embedding (768-dim) |
| `chunks[].metadata` | Object | No | Chunk metadata (section, page) |
| `createdAt` | Date | Auto | Upload timestamp |
| `updatedAt` | Date | Auto | Last modification |

---

### 3. UserRole

**File:** `apps/api/src/models/Role.ts`  
**Collection:** `userroles`

Maps Clerk user IDs to application roles for RBAC.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | Clerk user ID (unique, indexed) |
| `role` | String (enum) | Yes | `candidate`, `interviewer`, `admin` |
| `assignedBy` | String | Yes | Who assigned this role |
| `assignedAt` | Date | Yes | When the role was assigned |

**Indexes:**
- `userId` (unique)

---

### 4. AuditLog

**File:** `apps/api/src/models/AuditLog.ts`  
**Collection:** `auditlogs`

Immutable audit trail for compliance and security monitoring.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | Acting user's Clerk ID |
| `role` | String | Yes | User's role at time of action |
| `action` | String | Yes | Action performed (e.g., `create`, `read`, `update`, `delete`) |
| `resource` | String | Yes | Resource type (e.g., `interview`, `resume`, `user`) |
| `status` | String | Yes | `success` or `failure` |
| `ip` | String | No | Client IP address |
| `userAgent` | String | No | Client user agent string |
| `correlationId` | String | No | Request correlation ID for tracing |
| `createdAt` | Date | Auto | Timestamp |

**Indexes:**
- `userId` + `createdAt` (compound)
- `resource` + `action`
- `correlationId`

---

### 5. Message

**File:** `apps/api/src/models/Message.ts`  
**Collection:** `messages`

Real-time chat messages for interview rooms.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | String | Yes | Chat room identifier |
| `senderId` | String | Yes | Sender's user ID |
| `senderName` | String | Yes | Display name |
| `content` | String | Yes | Message content |
| `type` | String (enum) | Yes | `text`, `code`, `system`, `ai` |
| `createdAt` | Date | Auto | Timestamp |

**Indexes:**
- `roomId` + `createdAt` (compound, for pagination)

---

### 6. PracticeInterview

**File:** `apps/api/src/models/PracticeInterview.ts`  
**Collection:** `practiceinterviews`

Self-service practice interview sessions with AI feedback.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | Candidate's user ID |
| `role` | String | Yes | Target job role |
| `difficulty` | String (enum) | Yes | `easy`, `medium`, `hard` |
| `questions` | Array | Yes | Generated questions |
| `answers` | Array | No | Candidate's answers |
| `feedback` | Object | No | AI-generated feedback per answer |
| `createdAt` | Date | Auto | Session start time |

---

### 7. Webhook

**File:** `apps/api/src/models/Webhook.ts`  
**Collection:** `webhooks`

Registered webhook endpoints with delivery tracking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | Owner's user ID |
| `url` | String | Yes | Webhook endpoint URL |
| `events` | [String] | Yes | Subscribed event types |
| `secret` | String | Yes | HMAC signing secret |
| `active` | Boolean | Yes | Whether webhook is enabled |
| `deliveryTracking` | Object | No | Last delivery status and timestamps |
| `deliveryTracking.lastAttempt` | Date | No | Last delivery attempt |
| `deliveryTracking.lastSuccess` | Date | No | Last successful delivery |
| `deliveryTracking.failureCount` | Number | No | Consecutive failures |
| `createdAt` | Date | Auto | Registration time |

---

## In-Memory Persistence Layers

These modules simulate MongoDB collections for real-time features. They use the same patterns (keyed storage, versioning, conflict resolution) and are designed to be backed by real MongoDB collections in scaled deployments.

### Whiteboard Persistence

**File:** `apps/api/src/lib/whiteboard.ts` → `WhiteboardPersistence` class

```
Schema (per element):
{
  roomId: String (indexed),
  elementId: String (unique),
  type: "line" | "rectangle" | "circle" | "text" | "arrow" | "freehand",
  startPoint: { x: Number, y: Number },
  endPoint: { x: Number, y: Number },
  points: [{ x: Number, y: Number }],
  text: String,
  strokeColor: String,
  strokeWidth: Number,
  fillColor: String,
  createdBy: String,
  createdAt: Number,
  version: Number,
  lastModifiedAt: Number,
  lastModifiedBy: String
}
```

Features:
- Room-scoped element storage
- Element-level versioning for conflict resolution
- Persists across session recreation (elements survive user disconnect/reconnect)

### Video Session Persistence

**File:** `apps/api/src/lib/videoCall.ts` → `VideoSessionPersistence` class

```
Schema (per session):
{
  sessionId: String (unique, indexed),
  roomId: String (indexed),
  hostId: String,
  hostName: String,
  startedAt: Number,
  endedAt: Number,
  maxParticipants: Number,
  recording: Boolean,
  iceServers: [{ urls: String, username: String, credential: String }],
  sfuConfig: Object,
  topology: "mesh" | "sfu",
  participants: [{ id: String, name: String, role: String, joinedAt: Number }]
}
```

---

## Redis Data Structures

| Key Pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `session:<userId>` | Hash | 24h | User session data |
| `rate:<ip>:<route>` | String (counter) | Window | Rate limit counters |
| `cache:<key>` | String (JSON) | Varies | Response cache |
| `bull:<queue>:*` | Various | — | BullMQ job data |
| `dedup:<hash>` | String | 5min | Request deduplication |

---

## Connection Configuration

```typescript
// MongoDB connection options (from src/index.ts)
mongoose.connect(MONGO_URI, {
  maxPoolSize: 20,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
});
```

---

## Data Relationships

```
User (Clerk) ──┬── UserRole (1:1)
               ├── Interview (1:many)
               ├── Resume (1:many)
               ├── PracticeInterview (1:many)
               ├── Webhook (1:many)
               └── AuditLog (1:many)

Interview ──── Messages (via roomId)
```

Note: Relationships are maintained via `userId` string references (not MongoDB ObjectId refs) since user identity is managed by Clerk externally.
