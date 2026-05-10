# Edge Cases & Error Handling

## Overview

This document covers edge cases, error handling strategies, and failure scenarios for the InterviewMinds platform.

---

## API Error Responses

### Standard Error Format

```typescript
interface ErrorResponse {
  error: string;       // User-friendly message
  details?: string;    // Technical details (dev only)
  code?: string;       // Error code for programmatic handling
  retryAfter?: number; // Seconds to wait before retry
}
```

### HTTP Status Codes

| Status | Meaning | Common Causes |
|--------|---------|----------------|
| 400 | Bad Request | Invalid input, validation failure |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Insufficient permissions (RBAC) |
| 404 | Not Found | Resource doesn't exist |
| 408 | Request Timeout | Slow processing |
| 413 | Payload Too Large | File upload exceeds limit |
| 422 | Unprocessable Entity | Business logic validation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled exception |
| 502 | Bad Gateway | External service failure |
| 503 | Service Unavailable | Circuit breaker open |
| 504 | Gateway Timeout | External service timeout |

---

## Circuit Breaker Edge Cases

### Scenario 1: AI Service Temporarily Unavailable

**Problem:** Groq API returns 503

**Handling:**
```typescript
const circuitState = groqCircuitBreaker.getState();
if (circuitState.state === "open") {
  return res.status(503).json({
    error: "AI service temporarily unavailable",
    retryAfter: Math.ceil((circuitState.nextAttempt - Date.now()) / 1000)
  });
}
```

**Recovery:**
- Wait for circuit breaker reset (60s default)
- Circuit moves to "half-open" after timeout
- Next successful call closes circuit
- Failed call in half-open opens circuit again

### Scenario 2: Multiple Concurrent Failures

**Problem:** 5 consecutive failures within threshold

**State Transition:**
```
CLOSED → (5 failures) → OPEN → (60s timeout) → HALF-OPEN → (3 successes) → CLOSED
                         → (1 failure) → OPEN
```

### Scenario 3: Partial Service Degradation

**Problem:** Groq works, but Piston (compiler) fails

**Handling:** Each service has independent circuit breaker
```typescript
// Groq fine, use it
if (groqCircuitBreaker.getState().state === "closed") {
  // Use Groq
}

// Piston down, return error
if (pistonCircuitBreaker.getState().state === "open") {
  return res.status(503).json({ error: "Compiler unavailable" });
}
```

---

## Rate Limiting Edge Cases

### Scenario 1: Redis Unavailable

**Problem:** Redis connection fails during rate limit check

**Handling:**
```typescript
// Fall back to in-memory store
catch (error) {
  logger.warn("Redis rate limit failed, using memory");
  return memoryStore.increment(key);
}
```

**Limitation:** In-memory store resets on server restart

### Scenario 2: Burst Traffic

**Problem:** Sudden spike in requests exceeds limit

**Headers Returned:**
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705329600
```

**Handling:**
```typescript
// Client should check headers and wait
if (res.headers['x-ratelimit-remaining'] === '0') {
  const retryAfter = res.headers['x-ratelimit-reset'];
  setTimeout(() => makeRequest(), retryAfter * 1000);
}
```

---

## Authentication Edge Cases

### Scenario 1: Token Expired During Request

**Problem:** JWT expires mid-request

**Handling:**
```typescript
// Clerk middleware handles automatically
// Returns 401 with "Token expired" message
// Client should redirect to sign-in
```

### Scenario 2: Token Revoked

**Problem:** User signs out, token becomes invalid

**Handling:**
```typescript
// Token verification fails
// Returns 401 "Invalid token"
// Client clears local storage and redirects
```

### Scenario 3: Role Changed During Session

**Problem:** Admin demoted to candidate, but has active session

**Handling:**
```typescript
// RBAC middleware checks role on each request
// If role insufficient, returns 403
// User needs to re-authenticate to get new role
```

---

## File Upload Edge Cases

### Scenario 1: Large File Upload

**Problem:** File exceeds 5MB limit

**Handling:**
```typescript
// Multer file size limit
const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB
const upload = multer({
  limits: { fileSize: MAX_RESUME_SIZE }
});

// Returns 413 if exceeded
```

### Scenario 2: Corrupted PDF

**Problem:** PDF parsing fails

**Handling:**
```typescript
// Worker catches parse error
try {
  const rawText = await pdfParser.parseBuffer(buffer);
} catch (err) {
  throw new Error("Failed to extract text from PDF");
}
// Returns job failure, user notified
```

### Scenario 3: Network Interruption

**Problem:** Upload fails mid-transfer

**Handling:**
```typescript
// Client-side: track upload progress
// Server-side: verify file integrity
// Resume upload if failed
```

---

## WebSocket Edge Cases

### Scenario 1: Connection Lost

**Problem:** Network disconnection

**Handling:**
```typescript
// Socket.IO auto-reconnect (if enabled)
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Manual reconnect
    socket.connect();
  }
});
```

### Scenario 2: Token Expired During Connection

**Problem:** JWT expires while socket connected

**Handling:**
```typescript
// Server verifies token on connect
// Returns error if invalid
socket.on('connect_error', (err) => {
  if (err.message === 'Invalid token') {
    // Client fetches new token and reconnects
  }
});
```

### Scenario 3: Concurrent Connections

**Problem:** User opens multiple tabs

**Handling:**
```typescript
// Track online users per room
// Each connection adds to onlineUsers Set
// Disconnect removes from Set
// Broadcasts user-joined/user-left events
```

---

## Database Edge Cases

### Scenario 1: Connection Lost

**Problem:** MongoDB connection drops

**Handling:**
```typescript
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

// Requests fail, client retries
```

### Scenario 2: Write Conflict

**Problem:** Concurrent updates to same document

**Handling:**
```typescript
// Optimistic locking with version field
// Or use findOneAndUpdate with conditions
await InterviewModel.findOneAndUpdate(
  { _id: interviewId, status: 'ongoing' },
  { status: 'completed', score },
  { new: true }
);
```

### Scenario 3: Large Query Result

**Problem:** Query returns too many documents

**Handling:**
```typescript
// Pagination enforced
const limit = Math.min(parseInt(req.query.limit) || 50, MAX_EXPORT_LIMIT);
const interviews = await InterviewModel.find({ userId })
  .skip(offset)
  .limit(limit);
```

---

## AI Processing Edge Cases

### Scenario 1: AI Returns Invalid JSON

**Problem:** Groq response not valid JSON

**Handling:**
```typescript
try {
  aiResponse = JSON.parse(content);
} catch (parseError) {
  // Use fallback default scores
  aiResponse = {
    score: 0,
    feedback: "Analysis incomplete.",
    skills: [...]
  };
}
```

### Scenario 2: AI Timeout

**Problem:** Groq request takes too long

**Handling:**
```typescript
// Circuit breaker timeout (30s)
const result = await groqCircuitBreaker.execute(async () => {
  return groq.chat.completions.create({...});
});
// If timeout, circuit opens
```

### Scenario 3: Empty Conversation

**Problem:** No messages to analyze

**Handling:**
```typescript
// Check user message count
const userMessageCount = history.filter(m => m.role === 'user').length;
if (userMessageCount === 0) {
  return res.json({
    score: 0,
    feedback: "Interview terminated early. No answers provided.",
    metrics: [...]
  });
}
```

---

## Frontend Edge Cases

### Scenario 1: Browser Refresh During Interview

**Problem:** User loses interview state

**Handling:**
```typescript
// Save state to sessionStorage periodically
useEffect(() => {
  sessionStorage.setItem('interviewState', JSON.stringify(state));
}, [state]);

// Restore on mount
const savedState = sessionStorage.getItem('interviewState');
if (savedState) {
  setState(JSON.parse(savedState));
}
```

### Scenario 2: Camera Permission Denied

**Problem:** User denies webcam access

**Handling:**
```typescript
const startVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (err) {
    // Show fallback UI without webcam
    toast.error("Camera permission required for proctoring");
    // Continue without camera
  }
};
```

### Scenario 3: Network Offline

**Problem:** Client goes offline during interview

**Handling:**
```typescript
// Detect offline state
window.addEventListener('offline', () => {
  toast.error("Network disconnected. Reconnecting...");
  // Pause AI interaction
});

// Reconnect when online
window.addEventListener('online', () => {
  toast.success("Reconnected!");
  // Resume interview
});
```

---

## Payment/Resource Edge Cases

### Scenario 1: Redis Memory Exhausted

**Problem:** Rate limit storage exceeds memory

**Handling:**
```bash
# Redis configuration
maxmemory 256mb
maxmemory-policy allkeys-lru

# Evicts least recently used keys
```

### Scenario 2: Disk Full (MongoDB)

**Problem:** Database storage exhausted

**Handling:**
```typescript
// Monitor with Prometheus
db.stats()

// TTL indexes auto-delete old data
// Or implement archival process
```

---

## Error Recovery Strategies

### 1. Automatic Retry

```typescript
const retry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
};
```

### 2. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  async execute(fn) {
    if (this.state === 'open') {
      throw new Error('Circuit open');
    }
    try {
      return await fn();
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}
```

### 3. Graceful Degradation

```typescript
async function getAIResponse(prompt) {
  try {
    // Try Groq first
    return await groq.chat.completions.create({...});
  } catch (err) {
    // Fall back to cached response
    const cached = await cacheGet(prompt);
    if (cached) return cached;
    // Or return simple response
    return "Service temporarily unavailable";
  }
}
```

---

## Logging & Monitoring

### Error Log Structure

```typescript
logger.error({
  err: error.message,
  stack: error.stack,
  userId: req.userId,
  path: req.path,
  method: req.method,
  correlationId: req.correlationId
}, 'Error description');
```

### Alert Conditions

| Condition | Action |
|-----------|--------|
| Error rate > 10% | PagerDuty alert |
| Circuit breaker open | Slack notification |
| High latency (>5s) | Datadog alert |
| Disk usage > 80% | Email alert |
| Unusual traffic spike | Cloudflare challenge |