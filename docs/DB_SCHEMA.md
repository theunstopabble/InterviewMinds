# InterviewMinds Database Schema

> **Version:** 1.0.0 | **Last Updated:** May 2026 | **Database:** MongoDB Atlas

## Table of Contents
- [Overview](#overview)
- [Entity Relationship](#entity-relationship)
- [Collections](#collections)
- [Indexes](#indexes)
- [Data Models](#data-models)

---

## Overview

InterviewMinds uses **MongoDB** as its primary database with the following design principles:

- **Multi-tenant architecture** with tenant isolation
- **Document-based design** for flexible schema evolution
- **Vector embeddings** for semantic search (RAG)
- **Time-series optimized** for audit logging
- **Real-time ready** with change streams

---

## Entity Relationship

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Entity Relationship Diagram                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│     ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐                 │
│     │  Tenant │<───>│  User   │<───>│  Role   │      │ Resume  │                 │
│     │ (Multi) │      │(Clerk)  │      │ (RBAC)  │      │         │                 │
│     └────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘                 │
│          │               │               │               │                        │
│          │               │               │               │                        │
│          ▼               ▼               ▼               ▼                        │
│     ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│     │  Audit  │   │Interview│   │ Message │   │ Question│   │  Score  │        │
│     │   Log   │   │Session  │   │         │   │  Bank   │   │  Card   │        │
│     └─────────┘   └────┬────┘   └─────────┘   └────┬────┘   └────┬────┘        │
│                        │                         │               │               │
│                        ▼                         ▼               ▼               │
│                   ┌─────────┐              ┌─────────┐     ┌─────────┐         │
│                   │  Job    │              │   Code  │     │  Report │         │
│                   │ Matching│              │Analysis │     │         │         │
│                   └─────────┘              └─────────┘     └─────────┘         │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Collections

### Core Collections

| Collection | Purpose | Size Estimate |
|------------|---------|---------------|
| `users` | User accounts (Clerk) | Small |
| `tenants` | Multi-tenant orgs | Small |
| `resumes` | Resume documents | Medium |
| `interviews` | Interview sessions | Large |
| `questions` | Question bank | Medium |
| `messages` | Chat messages | Large |
| `scores` | Evaluations | Large |
| `audit_logs` | Compliance trail | Large |
| `notifications` | User alerts | Medium |
| `reports` | Generated reports | Medium |
| `webhooks` | Event handlers | Small |
| `jobs` | Async queue | Small |

---

## Data Models

### 1. Users Collection

```javascript
{
  _id: ObjectId,
  clerkId: String,              // Clerk user ID (unique)
  email: String,
  firstName: String,
  lastName: String,
  avatar: String,
  tenantId: ObjectId,          // Multi-tenant reference
  
  // Profile
  phone: String,
  location: String,
  timezone: String,
  
  // Status
  status: "active" | "inactive" | "suspended",
  emailVerified: Boolean,
  lastLoginAt: Date,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  
  // Indexes
  { clerkId: 1 },              // unique
  { tenantId: 1, email: 1 },
  { status: 1 }
}
```

### 2. Tenants Collection (Multi-tenant)

```javascript
{
  _id: ObjectId,
  name: String,                // Organization name
  slug: String,                 // URL-friendly identifier
  
  // Branding
  logo: String,
  primaryColor: String,
  customDomain: String,
  
  // Settings
  settings: {
    maxUsers: Number,
    maxInterviews: Number,
    features: {
      aiProctoring: Boolean,
      videoRecording: Boolean,
      backgroundChecks: Boolean
    }
  },
  
  // Subscription
  plan: "free" | "pro" | "enterprise",
  stripeCustomerId: String,
  billingEmail: String,
  
  // Compliance
  gdprEnabled: Boolean,
  dataRetentionDays: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Resumes Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  tenantId: ObjectId,
  
  // File Info
  fileName: String,
  originalName: String,
  mimeType: String,
  size: Number,                 // bytes
  
  // Content
  content: String,             // Extracted text
  extractedData: {
    name: String,
    email: String,
    phone: String,
    location: String,
    summary: String,
    skills: [String],
    experience: [{
      company: String,
      title: String,
      duration: String,
      description: String
    }],
    education: [{
      school: String,
      degree: String,
      year: Number
    }],
    certifications: [String],
    languages: [String]
  },
  
  // Vector Embeddings (RAG)
  chunks: [{
    text: String,
    embedding: Number[],         // 384-dim from all-MiniLM-L6-v2
    page: Number
  }],
  
  // AI Analysis
  analysis: {
    score: Number,              // 0-100
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    jobMatches: [{
      jobId: ObjectId,
      matchScore: Number,
      missingSkills: [String]
    }]
  },
  
  // Status
  status: "processing" | "ready" | "failed",
  processedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Interviews Collection

```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,
  
  // Participants
  candidateId: ObjectId,
  interviewerIds: [ObjectId],
  
  // Job Context
  jobId: ObjectId,
  jobTitle: String,
  requiredSkills: [String],
  
  // Session Config
  type: "technical" | "behavioral" | "mixed" | "mock",
  mode: "live" | "async" | "take-home",
  duration: Number,             // minutes
  
  // State
  status: "scheduled" | "waiting" | "in-progress" | "completed" | "cancelled",
  startedAt: Date,
  completedAt: Date,
  
  // Questions
  questions: [{
    id: ObjectId,
    type: "coding" | "behavioral" | "technical",
    question: String,
    codeTemplate: String,
    answer: String,
    codeAnswer: String,
    score: Number,
    feedback: String,
    timeSpent: Number
  }],
  
  // AI Interviewer (Phase 9)
  llmSession: {
    sessionId: String,
    persona: String,
    memory: [{
      role: "user" | "assistant",
      content: String,
      timestamp: Date
    }],
    followUpCount: Number
  },
  
  // Proctoring (Phase 3)
  proctoring: {
    enabled: Boolean,
    violations: [{
      type: String,
      timestamp: Date,
      evidence: String,
      severity: "low" | "medium" | "high"
    }],
    engagementScore: Number,
    faceDetection: [{
      timestamp: Date,
      present: Boolean,
      emotions: [String]
    }]
  },
  
  // Collaboration (Phase 11)
  collaboration: {
    editorEnabled: Boolean,
    whiteboardEnabled: Boolean,
    videoEnabled: Boolean,
    participants: [{
      userId: ObjectId,
      joinedAt: Date,
      role: "host" | "participant"
    }]
  },
  
  // Results
  finalScore: Number,
  recommendation: "strong_yes" | "yes" | "neutral" | "no" | "strong_no",
  summary: String,
  strengths: [String],
  areasForImprovement: [String],
  
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Questions Collection

```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,
  
  // Content
  type: "coding" | "behavioral" | "technical" | "system-design" | "sql",
  category: String,
  difficulty: "easy" | "medium" | "hard",
  
  // Question
  title: String,
  description: String,
  constraints: [String],
  
  // For Coding
  codeTemplate: String,
  testCases: [{
    input: String,
    expectedOutput: String,
    isHidden: Boolean
  }],
  solution: String,
  timeLimit: Number,            // seconds
  
  // For Behavioral
  sampleAnswer: String,
  keyPoints: [String],
  
  // Metadata
  tags: [String],
  role: String,
  experienceLevel: String,
  
  // Usage
  usedCount: Number,
  successRate: Number,          // % of candidates who answered correctly
  
  // Status
  status: "active" | "deprecated" | "draft",
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Audit Logs Collection

```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,
  
  // Event
  action: String,               // "user.create", "interview.update"
  resource: String,            // "user", "interview", "resume"
  resourceId: ObjectId,
  
  // Actor
  userId: ObjectId,
  userEmail: String,
  ipAddress: String,
  userAgent: String,
  
  // Changes
  changes: {
    before: Object,
    after: Object
  },
  
  // Context
  correlationId: String,       // Trace ID
  requestId: String,
  
  // Compliance
  piiDetected: Boolean,
  maskedFields: [String],
  
  timestamp: Date
}
// Indexed on timestamp for time-series queries
// TTL: 7 years for compliance
```

### 7. Scorecards Collection

```javascript
{
  _id: ObjectId,
  interviewId: ObjectId,
  evaluatorId: ObjectId,
  
  // Rubric
  categories: [{
    name: String,              // "Technical Skills", "Communication"
    weight: Number,            // 0-1
    criteria: [{
      name: String,
      description: String,
      score: Number,            // 1-5
      notes: String
    }]
  }],
  
  // Overall
  totalScore: Number,
  recommendation: String,
  
  // Notes
  timestampedNotes: [{
    timestamp: Number,         // seconds into interview
    content: String,
    category: String
  }],
  
  // Panel (Phase 8)
  panelVotes: [{
    evaluatorId: ObjectId,
    scores: Object,
    comment: String,
    submittedAt: Date
  }],
  
  createdAt: Date,
  submittedAt: Date
}
```

### 8. Reports Collection

```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,
  
  // Type
  type: "candidate" | "interview" | "department" | "custom",
  
  // Content
  title: String,
  data: Object,
  
  // Format
  format: "pdf" | "csv" | "json" | "excel",
  fileUrl: String,
  fileSize: Number,
  
  // Branding
  includeLogo: Boolean,
  primaryColor: String,
  
  // Scheduling
  isScheduled: Boolean,
  schedule: {
    frequency: "daily" | "weekly" | "monthly",
    recipients: [String],
    nextRun: Date
  },
  
  createdBy: ObjectId,
  createdAt: Date,
  expiresAt: Date               // TTL for cleanup
}
```

### 9. Notifications Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  tenantId: ObjectId,
  
  // Content
  type: "email" | "sms" | "push" | "in-app",
  channel: String,              // "slack", "teams", "sendgrid"
  
  title: String,
  message: String,
  data: Object,                // Additional payload
  
  // Delivery
  status: "pending" | "sent" | "delivered" | "failed",
  sentAt: Date,
  deliveredAt: Date,
  
  // Template
  templateId: String,
  variables: Object,
  
  // Tracking
  clickCount: Number,
  
  createdAt: Date
}
```

### 10. Jobs Collection (Async Queue)

```javascript
{
  _id: ObjectId,
  
  // Job Info
  name: String,                 // "processResume", "sendReminder"
  data: Object,
  
  // Queue
  queue: String,               // "default", "ai", "email"
  priority: Number,            // 1-5 (higher = more urgent)
  
  // State
  status: "pending" | "processing" | "completed" | "failed",
  attempts: Number,
  maxAttempts: Number,
  
  // Result
  result: Object,
  error: String,
  
  // Timing
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  createdAt: Date
}
```

---

## Indexes

### Performance Indexes

```javascript
// Users
{ clerkId: 1 }                                    // unique
{ tenantId: 1, email: 1 }
{ status: 1 }

// Interviews
{ tenantId: 1, status: 1 }
{ candidateId: 1, status: 1 }
{ "questions.id": 1 }
{ startedAt: -1 }

// Resumes
{ userId: 1 }
{ tenantId: 1, status: 1 }
{ "analysis.score": 1 }

// Audit Logs (Time-series optimized)
{ tenantId: 1, timestamp: -1 }                   // compound for queries
{ userId: 1, timestamp: -1 }
{ action: 1, timestamp: -1 }

// Questions
{ tenantId: 1, status: 1 }
{ role: 1, difficulty: 1 }

// Text Search
{ content: "text" }                              // full-text search
{ "chunks.text": "text" }                       // RAG search
```

---

## TTL (Time-To-Live) Indexes

```javascript
// Auto-delete after retention period
{ expiresAt: 1 }                                 // Reports
{ createdAt: 1 }                                // Failed jobs (7 days)
```

---

## Data Retention

| Data Type | Retention | Reason |
|-----------|-----------|---------|
| Audit Logs | 7 years | Compliance (SOC2) |
| Interview Recordings | 90 days | Storage cost |
| Failed Jobs | 7 days | Debugging |
| Temporary Tokens | 1 hour | Security |
| Reports | 30 days | Storage management |

---

## Relationships

### User ↔ Interview
- One user (candidate) → Many interviews
- One user (interviewer) → Many interviews

### Interview ↔ Question
- One interview → Many questions (sequenced)

### Interview ↔ Scorecard
- One interview → Many scorecards (multi-evaluator)

### Tenant ↔ Users
- One tenant → Many users

---

## Schema Best Practices

1. **Denormalization**: Store frequently accessed data together
2. **Soft Deletes**: Use `status` field instead of hard deletes
3. **Immutable Audit**: Never update audit logs, only insert
4. **Tenant Isolation**: Always filter by `tenantId`
5. **Time-Series**: Use indexed timestamps for queries
6. **Arrays**: Keep small (<100 elements) for performance

---

## Migrations

All schema changes are managed through migration scripts:

```bash
# Run migrations
npm run migrate

# Create new migration
npm run migrate:create <name>
```

---

## Backup & Recovery

- **Primary**: MongoDB Atlas automated backups (daily)
- **Point-in-time**: 7-day recovery window
- **Cross-region**: Replica sets in 3 regions

---

*InterviewMinds Database Schema - Production Ready*