# InterviewMinds Database Schema

## Overview

InterviewMinds uses MongoDB as its primary database. The schema is designed to support:
- Multi-tenant user management with role-based access
- Resume storage with vector embeddings for RAG
- Interview sessions with real-time messaging
- Audit logging for compliance

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  UserRole  │──────<│ Interview  │>──────│   Resume    │
│  (Clerk)   │       │             │       │             │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                      │                      │
       │              ┌───────┴───────┐              │
       │              │               │              │
       ▼              ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Audit    │ │  Message    │ │   Webhook   │ │  System     │
│   Log      │ │             │ │             │ │  Config     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Collections

### 1. UserRoles Collection

Stores user roles and permissions. Uses Clerk for authentication.

```javascript
{
  _id: ObjectId,
  userId: String,           // Clerk user ID (unique)
  role: String,             // 'candidate' | 'interviewer' | 'admin'
  assignedBy: String,       // Admin user ID who assigned role
  assignedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ userId: 1 }              // unique
{ userId: 1, role: 1 }    // compound
```

**Roles & Permissions:**

| Role | Permissions |
|------|-------------|
| `candidate` | resume:create, resume:read_own, interview:start, interview:end, chat:send, compiler:use, tts:use |
| `interviewer` | All candidate + resume:read_any, interview:read_any, audit:read, user:read |
| `admin` | All permissions (wildcard *) |

---

### 2. Resumes Collection

Stores user resumes with extracted text and vector embeddings for RAG.

```javascript
{
  _id: ObjectId,
  userId: String,           // Owner user ID (indexed)
  fileName: String,         // Original filename
  content: String,          // Extracted full text (indexed for search)
  chunks: [
    {
      text: String,        // Chunk text
      embedding: Number[]   // Vector embedding (384-dim from all-MiniLM-L6-v2)
    }
  ],
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ userId: 1 }              // User lookups
{ userId: 1, createdAt: -1 } // Compound for user + time
{ "chunks.text": "text" } // Text search index
```

**Processing Pipeline:**
1. PDF parsing (pdf2json)
2. Text cleaning (remove artifacts)
3. Chunking (RecursiveCharacterTextSplitter, 500 chars, 50 overlap)
4. Embedding generation (Xenova/all-MiniLM-L6-v2)
5. MongoDB storage

---

### 3. Interviews Collection

Stores interview sessions with messages and AI-generated feedback.

```javascript
{
  _id: ObjectId,
  userId: String,           // Owner user ID
  resumeId: String,          // Reference to Resume
  status: String,           // 'ongoing' | 'completed'
  completedAt: Date,       // Set when status becomes 'completed'
  videoUrl: String,         // Cloudinary URL (optional)
  messages: [
    {
      role: String,        // 'user' | 'model' | 'ai' | 'system'
      text: String,
      timestamp: Date
    }
  ],
  score: Number,           // 0-100 AI-generated score
  feedback: String,         // AI-generated feedback text
  metrics: [               // Radar chart data
    {
      subject: String,      // e.g., "Content Quality"
      A: Number,           // Score (0-100)
      fullMark: Number      // Always 100
    }
  ],
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ userId: 1 }
{ resumeId: 1 }
{ status: 1 }
{ userId: 1, createdAt: -1 }  // Compound
{ completedAt: 1 }             // TTL index (90 days)
```

**Scoring Metrics (Weighted Ensemble):**
- Content Quality (40%) - Technical accuracy, code logic
- Communication Skills (30%) - Clarity, articulation
- Behavioral Indicators (20%) - Confidence, problem-solving approach
- Domain Expertise (10%) - Depth in tech stack

---

### 4. Messages Collection

Stores real-time chat messages for Socket.IO functionality.

```javascript
{
  _id: ObjectId,
  roomId: String,           // Interview room ID
  senderId: String,         // Clerk user ID
  senderName: String,       // Display name
  content: String,         // Message text (max 10000 chars)
  type: String,             // 'text' | 'system' | 'code'
  editedAt: Date,           // If edited
  deletedAt: Date,         // If soft-deleted
  createdAt: Date,         // Timestamp
  updatedAt: Date
}

// Indexes
{ roomId: 1 }              // Room queries
{ senderId: 1 }           // User queries
{ roomId: 1, createdAt: -1 } // Compound for pagination
```

---

### 5. AuditLogs Collection

Stores audit trail for compliance and security monitoring.

```javascript
{
  _id: ObjectId,
  userId: String,           // Actor user ID
  role: String,             // Actor role at time of action
  action: String,           // e.g., "POST /api/interview/end"
  resource: String,          // e.g., "interview", "resume"
  resourceId: String,        // MongoDB _id of affected document
  status: String,           // 'success' | 'failure' | 'denied'
  statusCode: Number,       // HTTP status code
  ip: String,               // Client IP (from X-Forwarded-For)
  userAgent: String,        // Browser/client info
  correlationId: String,    // Request correlation ID
  metadata: {               // Sanitized additional info
    params: Object,
    query: Object,
    bodyKeys: String[]
  },
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ userId: 1 }
{ action: 1 }
{ resource: 1 }
{ status: 1 }
{ userId: 1, createdAt: -1 }   // Compound
{ resource: 1, action: 1, createdAt: -1 } // Compound
{ status: 1, createdAt: -1 }    // Compound
```

**Audit Events:**
- All API requests (method, path, status)
- Authentication events (login, logout, failures)
- Role changes
- Resource CRUD operations

---

### 6. Webhooks Collection

Stores webhook configurations for external integrations.

```javascript
{
  _id: ObjectId,
  userId: String,           // Owner user ID
  url: String,              // Webhook URL
  events: [String],         // Subscribed events
  secret: String,           // HMAC-SHA256 signing secret
  active: Boolean,          // Enable/disable flag
  lastDeliveredAt: Date,    // Last successful delivery
  lastStatusCode: Number,   // Last HTTP status
  failureCount: Number,    // Consecutive failures
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ userId: 1 }
{ userId: 1, active: 1 }
{ events: 1 }
```

**Webhook Events:**
- `interview.completed` - Interview ended with score
- `user.registered` - New user signup
- `resume.processed` - Resume processing complete

---

## Data Models (TypeScript Interfaces)

### IResume

```typescript
interface ResumeChunk {
  text: string;
  embedding: number[];  // 384-dimensional vector
}

interface IResume {
  _id?: string;
  userId: string;
  fileName: string;
  content: string;
  chunks?: ResumeChunk[];
  createdAt: Date;
}
```

### IInterview

```typescript
interface ChatMessage {
  role: 'user' | 'model' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

interface Metric {
  subject: string;
  A: number;
  fullMark: number;
}

interface IInterview {
  _id?: string;
  userId: string;
  resumeId: string;
  status: 'ongoing' | 'completed';
  completedAt?: Date;
  videoUrl?: string;
  messages: ChatMessage[];
  score: number;
  feedback: string;
  metrics: Metric[];
  createdAt: Date;
}
```

### IMessage

```typescript
interface IMessage {
  _id?: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'system' | 'code';
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}
```

---

## Query Optimization

### Common Query Patterns

| Query | Index Used | Expected Performance |
|-------|------------|----------------------|
| `find({ userId })` | { userId: 1 } | O(log n) |
| `find({ userId }).sort({ createdAt: -1 })` | { userId: 1, createdAt: -1 } | O(log n) |
| `find({ roomId }).sort({ createdAt: -1 })` | { roomId: 1, createdAt: -1 } | O(log n) |
| `countDocuments({ userId })` | { userId: 1 } | O(log n) |
| `aggregate([{ $group: { _id: ... } }])` | Various | O(n) |

### Connection Settings

```javascript
{
  maxPoolSize: 20,           // Max concurrent connections
  minPoolSize: 5,            // Min connections to maintain
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false     // Disable command buffering
}
```

---

## TTL (Time-To-Live) Indexes

Interview data is automatically deleted after 90 days:

```javascript
interviewSchema.index(
  { completedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);
```

This maintains:
- GDPR compliance (data retention limits)
- Cost optimization (storage cleanup)
- Privacy protection (old interviews purged)

---

## Migration Strategy

### Adding New Fields (Backward Compatible)
```javascript
// Add with default value
schema.add({ newField: { type: String, default: 'default' } });
```

### Renaming Fields (Two-Step)
```javascript
// Step 1: Add new field, copy data
schema.add({ newName: String });
// Run migration: db.collection.updateMany({}, { $set: { newName: "$oldName" } })

// Step 2: After migration, remove old field
schema.remove('oldName');
```

### Schema Versioning
```javascript
{
  _id: ...,
  schemaVersion: 2,
  // ... fields
}
```

---

## Backup & Recovery

### Backup Strategy
- **Full Backup**: Daily (mongodump)
- **Incremental**: Hourly (oplog)
- **Offsite**: Weekly to S3/GCS

### Recovery Procedures
1. **Point-in-time Recovery**: Using oplog
2. **Full Restore**: From latest full backup
3. **Collection-specific**: Restore single collection

### Important Collections
| Collection | Priority | RPO | RTO |
|------------|----------|-----|-----|
| Interviews | High | 1hr | 4hr |
| Resumes | High | 1hr | 4hr |
| Users (Roles) | Critical | 15min | 1hr |
| AuditLogs | Medium | 24hr | 24hr |

---

## Enterprise Schema Extensions

### Multi-Tenancy Collections

```javascript
// Tenants Collection
{
  _id: ObjectId,
  tenantId: String,           // tn_xxxxxxxxxxxx
  name: String,
  domain: String,
  plan: String,               // free, starter, professional, enterprise
  status: String,              // active, suspended, trial
  settings: {
    isolationLevel: String,  // database, schema, row, application
    storageLimit: Number,
    apiRateLimit: Number,
    features: [String],
    customBranding: {
      primaryColor: String,
      secondaryColor: String,
      logoUrl: String,
      companyName: String
    }
  },
  createdAt: Date,
  updatedAt: Date
}

// TenantUsers Collection
{
  _id: ObjectId,
  tenantId: String,
  userId: String,              // Clerk user ID
  role: String,               // admin, manager, interviewer, candidate
  permissions: [String],
  joinedAt: Date
}
```

### Compliance Collections

```javascript
// AuditLogs Collection (Enhanced)
{
  _id: ObjectId,
  tenantId: String,
  userId: String,
  action: String,
  resource: String,
  resourceId: String,
  details: Object,
  ipAddress: String,
  userAgent: String,
  timestamp: Date,
  correlationId: String
}

// ConsentRecords Collection
{
  _id: ObjectId,
  userId: String,
  consentType: String,        // gdpr_marketing, gdpr_analytics, etc.
  granted: Boolean,
  version: String,
  timestamp: Date,
  ipAddress: String,
  expiresAt: Date
}

// DataSubjectRequests Collection
{
  _id: ObjectId,
  userId: String,
  type: String,               // access, deletion, rectification, portability
  status: String,             // pending, processing, completed, rejected
  createdAt: Date,
  completedAt: Date,
  data: Object,
  processedBy: String
}
```

### Enterprise Feature Collections

```javascript
// BiometricTemplates Collection
{
  _id: ObjectId,
  userId: String,
  type: String,               // face, voice, fingerprint
  templateData: String,      // Encrypted template
  createdAt: Date,
  lastVerified: Date,
  isActive: Boolean
}

// SSOAuth Configs Collection
{
  _id: ObjectId,
  tenantId: String,
  provider: String,          // okta, azure-ad, google-workspace, custom
  enabled: Boolean,
  samlSettings: {
    entryPoint: String,
    issuer: String,
    cert: String,
    callbackUrl: String
  },
  oauthSettings: {
    clientId: String,
    redirectUri: String,
    scope: [String]
  },
  attributeMapping: {
    email: String,
    firstName: String,
    lastName: String,
    department: String,
    role: String
  }
}

// Webhooks Collection
{
  _id: ObjectId,
  tenantId: String,
  url: String,
  events: [String],          // interview.started, etc.
  secret: String,
  enabled: Boolean,
  retryPolicy: {
    maxRetries: Number,
    retryInterval: Number,
    backoffMultiplier: Number
  },
  createdAt: Date
}

// ATSIntegrations Collection
{
  _id: ObjectId,
  tenantId: String,
  provider: String,          // workday, greenhouse, lever, bamboohr
  apiKey: String,
  clientId: String,
  tenantUrl: String,
  webhookUrl: String,
  lastSyncAt: Date,
  status: String
}

// AnalyticsSnapshots Collection
{
  _id: ObjectId,
  tenantId: String,
  date: Date,
  metrics: {
    totalInterviews: Number,
    completionRate: Number,
    averageScore: Number,
    scoreDistribution: {
      range90_100: Number,
      range80_89: Number,
      range70_79: Number,
      range60_69: Number,
      below60: Number
    },
    proctoringViolations: Number,
    flagRate: Number
  }
}
```

### Enterprise Indexes

```javascript
// Tenants indexes
db.tenants.createIndex({ tenantId: 1 }, { unique: true });
db.tenants.createIndex({ domain: 1 });
db.tenants.createIndex({ plan: 1 });

// Compliance indexes
db.auditLogs.createIndex({ tenantId: 1, timestamp: -1 });
db.auditLogs.createIndex({ userId: 1, timestamp: -1 });
db.consentRecords.createIndex({ userId: 1, consentType: 1 });
db.dataSubjectRequests.createIndex({ userId: 1, status: 1 });

// Enterprise feature indexes
db.biometricTemplates.createIndex({ userId: 1, type: 1 });
db.webhooks.createIndex({ tenantId: 1, enabled: 1 });
db.analyticsSnapshots.createIndex({ tenantId: 1, date: -1 });
```