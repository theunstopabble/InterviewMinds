# Edge Cases & Error Handling

**Version:** 2.0.0  
**Last Updated:** May 2026

---

## Overview

This document catalogs edge cases, failure modes, and how InterviewMinds handles them. The system is designed for graceful degradation — features degrade to reduced functionality rather than failing completely.

---

## AI Service Failures

### Groq LLM Unavailable

**Scenario:** Groq API key missing, rate limited, or service down.

**Handling:**
- Voice tone analysis falls back to keyword heuristic (`src/lib/multimodalAI.ts`)
- Result is flagged with `source: "heuristic_fallback"` so consumers know the analysis method
- Circuit breaker opens after repeated failures, preventing cascading timeouts
- Chat/interview endpoints return 503 with clear error message

```typescript
// Voice analysis graceful degradation
if (!groq) {
  logger.warn("Groq API key not configured — falling back to keyword heuristic");
  return analyzeVoiceToneHeuristic(text); // source: "heuristic_fallback"
}
```

### Groq Returns Invalid JSON

**Scenario:** LLM response doesn't contain parseable JSON.

**Handling:**
- Regex extraction attempted (`content.match(/\{[\s\S]*\}/)`)
- If no JSON found, falls back to keyword heuristic
- All numeric scores are clamped to [0, 100] range
- Sentiment validated against allowed enum values

---

## ML Model Failures

### Face-API Models Not Loaded

**Scenario:** Model files missing from `apps/api/models/face-api/` or TensorFlow.js fails to initialize.

**Handling:**
- `initializeFaceML()` attempts load once at startup
- On failure, sets `modelsLoaded = false` and logs warning
- All subsequent calls use content-derived analysis (hash-based, input-dependent)
- Results are never static — they vary deterministically with input data
- No crash, no unhandled rejection

### ML Inference Failure

**Scenario:** Model loaded but inference throws (corrupt frame, OOM).

**Handling:**
- Try/catch around `runMLInference()` in `processVideoFrame()`
- Falls through to content-derived analysis on any error
- Error logged but not propagated to client

---

## Collaborative Editor Edge Cases

### Concurrent Edits (Same Region)

**Scenario:** Two users edit the same text region simultaneously.

**Handling:**
- Three-way merge algorithm (`src/lib/collaborativeEditor.ts`)
- Per-user base state tracking ensures each user's changes are relative to what they last saw
- Overlapping changes: both insertions are concatenated (no data loss)
- Non-overlapping changes: both applied with position adjustment

```
User A: "hello" → "hello world"  (append "world")
User B: "hello" → "HELLO"        (replace all)
Result: Three-way merge preserves both changes contextually
```

### User Disconnects Mid-Edit

**Scenario:** User loses connection while editing.

**Handling:**
- User's base state remains in `userBaseStates` map
- On reconnect and rejoin, base state is reset to current document
- No orphaned state — `leaveCollabSession()` cleans up user data
- If all users leave, session is deleted from memory

### Session Expiry

**Scenario:** Collaboration session exceeds 1-hour TTL.

**Handling:**
- `cleanupExpiredSessions()` removes expired sessions
- Elements are not persisted beyond session lifetime (by design for code collaboration)
- Active sessions with users are not forcibly expired

---

## Whiteboard Edge Cases

### Version Conflict

**Scenario:** Two users update the same whiteboard element simultaneously.

**Handling:**
- Element-level versioning in `WhiteboardPersistence`
- Update rejected if incoming version < stored version
- Warning logged with version details
- Client receives failure response and can retry with fresh state

```typescript
if (updates.version !== undefined && updates.version < existing.version) {
  logger.warn({ roomId, elementId, incomingVersion, storedVersion }, "Update rejected");
  return false;
}
```

### Session Recreation

**Scenario:** All users leave and rejoin later.

**Handling:**
- Elements persist in `WhiteboardPersistence` (keyed by `roomId`)
- New session creation loads existing elements from persistence
- Drawing history survives session lifecycle

---

## Video Call Edge Cases

### NAT Traversal Failure

**Scenario:** STUN fails to discover public IP (symmetric NAT).

**Handling:**
- TURN server configured as relay fallback
- Multiple STUN servers for redundancy (Google STUN 1, 2, 3)
- If no TURN configured, peer connection may fail — logged as warning

### Session Full

**Scenario:** User tries to join a session at max capacity.

**Handling:**
- `joinVideoSession()` throws `"Session is full"` error
- Client receives clear error message
- No partial state created

### Topology Switch (Mesh → SFU)

**Scenario:** Participant count exceeds mesh threshold.

**Handling:**
- Automatic switch when `participants.size > sfuConfig.meshToSfuThreshold`
- `video:topology-changed` event broadcast to all participants
- Clients expected to renegotiate connections through SFU
- Only triggers if SFU is enabled (`SFU_ENABLED=true`)

### Recording Service Failure

**Scenario:** Recording service unavailable when recording starts.

**Handling:**
- `startRecording()` is async — failure logged but doesn't block session
- Session continues without recording
- Error captured in logs for debugging

---

## Database Edge Cases

### MongoDB Connection Loss

**Scenario:** Database becomes unreachable during operation.

**Handling:**
- `bufferCommands: false` — operations fail immediately (no silent queuing)
- Health endpoint reports `"disconnected"` status
- Mongoose auto-reconnect fires `reconnected` event
- Graceful shutdown closes connection pool cleanly

### Redis Connection Loss

**Scenario:** Redis becomes unreachable.

**Handling:**
- Rate limiting degrades (requests pass through)
- BullMQ jobs queue locally until reconnection
- Health endpoint reports degraded status
- ioredis has built-in reconnection with exponential backoff

---

## Authentication Edge Cases

### Expired JWT Token

**Scenario:** Clerk token expires mid-session.

**Handling:**
- `requireAuth` middleware returns 401
- Client-side Clerk SDK handles token refresh
- WebSocket connections may need re-authentication

### Missing Role Assignment

**Scenario:** Authenticated user has no role in `UserRole` collection.

**Handling:**
- `attachRole` middleware defaults to `"candidate"` role
- User can still access candidate-level endpoints
- Admin can assign proper role via `/api/admin/roles`

### CORS Violation

**Scenario:** Request from unauthorized origin.

**Handling:**
- Custom CORS error handler returns 403 with clear message
- Error includes the rejected origin for debugging
- Requests with no origin (curl, mobile apps) are allowed

---

## Rate Limiting Edge Cases

### Burst Traffic

**Scenario:** Legitimate user hits rate limit during normal usage.

**Handling:**
- 429 response with `Retry-After` header
- Different limits for different route tiers (general vs AI vs upload)
- Rate limits are per-IP (behind proxy: trust proxy configured)

### Distributed Rate Limiting

**Scenario:** Multiple backend instances need shared rate state.

**Handling:**
- Rate limit counters stored in Redis (shared across instances)
- Atomic increment operations prevent race conditions

---

## Code Execution Edge Cases

### Piston API Timeout

**Scenario:** Code execution takes too long or Piston is down.

**Handling:**
- Circuit breaker pattern wraps Piston calls
- After threshold failures: circuit opens, fast-fail for 30s
- Half-open state tests one request before resuming
- Client receives 503 with "service temporarily unavailable"

### Infinite Loop in User Code

**Scenario:** Candidate submits code with infinite loop.

**Handling:**
- Piston API has built-in execution timeout (configurable)
- Backend request timeout (30s) prevents hanging connections
- Circuit breaker prevents cascading failures

---

## File Upload Edge Cases

### Oversized Upload

**Scenario:** File exceeds 10MB limit.

**Handling:**
- Express JSON body parser rejects with 413
- Multer file size limit enforced
- Upload rate limiter prevents abuse

### Corrupt PDF

**Scenario:** Uploaded PDF cannot be parsed.

**Handling:**
- pdf-parse throws, caught in resume processing
- Error logged, user receives clear error message
- Resume record created with empty content (can retry)

---

## WebSocket Edge Cases

### Socket Disconnection

**Scenario:** Client loses WebSocket connection.

**Handling:**
- Socket.IO automatic reconnection (client-side)
- Server-side cleanup on disconnect event
- Collaboration sessions track user presence
- Whiteboard elements persist regardless of connection state

### Message Ordering

**Scenario:** Messages arrive out of order due to network jitter.

**Handling:**
- Version counters on collaborative documents
- Timestamps on all events
- CRDT merge is commutative (order-independent)

---

## Environment Validation

### Missing Required Variables

**Scenario:** Server starts without required env vars.

**Handling:**
- `requireEnvVars()` runs at startup
- Validates all required variables exist and pass format checks
- Logs fatal error with list of missing variables
- Calls `process.exit(1)` — prevents running in broken state

### Invalid Variable Format

**Scenario:** `MONGO_URI` doesn't start with `mongodb`, `PORT` is not a number.

**Handling:**
- Custom validators per variable in `envValidation.ts`
- Clear error messages (e.g., "PORT must be a number between 1 and 65535")
- Defaults applied for optional variables

---

## Graceful Degradation Summary

| Feature | Full Mode | Degraded Mode | Trigger |
|---------|-----------|---------------|---------|
| Voice Analysis | Groq LLM scoring | Keyword heuristic | Groq unavailable |
| Face Detection | face-api.js ML | Content-derived hash | Models not loaded |
| Code Execution | Piston sandbox | 503 error | Circuit breaker open |
| Whiteboard | Real-time + persist | Persist only | Socket disconnect |
| Video Call | STUN + TURN | STUN only | No TURN configured |
| Rate Limiting | Redis-backed | Pass-through | Redis down |
| Health Check | Full status | Degraded status | Any service down |
