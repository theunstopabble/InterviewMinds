# InterviewMinds Workflow Documentation

> **Version:** 1.0.0 | **Last Updated:** May 2026

## Table of Contents
- [Candidate Workflow](#candidate-workflow)
- [Interviewer Workflow](#interviewer-workflow)
- [Admin Workflow](#admin-workflow)
- [AI Agent Workflow](#ai-agent-workflow)
- [System Processes](#system-processes)

---

## Candidate Workflow

### 1. Registration & Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         CANDIDATE REGISTRATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. Sign Up                                                                  │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│     │  Visit App   │ → │  Clerk Auth  │ → │  Create     │                   │
│     │  (/sign-up)  │    │  (OAuth/     │    │  Profile    │                   │
│     │              │    │   Email)     │    │              │                   │
│     └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                                  │
│  2. Upload Resume                                                              │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐   │
│     │  Select PDF  │ → │  Parse (     │ → │  Extract    │ → │  Store &   │   │
│     │              │    │  pdf2json)  │    │  Entities   │    │  Embed     │   │
│     │              │    │              │    │  (NLP)      │    │  (ML)      │   │
│     └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘   │
│                                                                                  │
│  3. Job Matching                                                               │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│     │  Enter Job   │ → │  AI Match    │ → │  View        │                   │
│     │  Preferences │    │  Score       │    │  Results     │                   │
│     │              │    │  (RAG)       │    │              │                   │
│     └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Interview Process

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            INTERVIEW PROCESS FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PRE-INTERVIEW                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  System      │ → │  Waiting     │ → │  Tech        │ → │  Interview  │       │
│  │  Check       │    │  Room       │    │  Verification│    │  Starts     │       │
│  │              │    │  (Queue)    │    │  (Camera/    │    │              │       │
│  │  - Browser   │    │              │    │   Mic)        │    │              │       │
│  │  - Camera    │    │              │    │              │    │              │       │
│  │  - Mic      │    │              │    │              │    │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                  │
│  DURING INTERVIEW                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐       │   │
│  │  │Intro   │ → │Behavioral│ → │Technical│ → │Coding  │ → │Closing │       │   │
│  │  │        │    │Questions│   │Questions│   │Problem │    │        │       │   │
│  │  └────────┘    └────────┘    └────────┘    └────────┘    └────────┘       │   │
│  │                                                                          │   │
│  │  Real-time Proctoring:                                                   │   │
│  │  • Face detection → Eye tracking → Screen monitoring                   │   │
│  │  • Voice analysis → Answer validation → AI feedback                    │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  POST-INTERVIEW                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Submit      │ → │  AI         │ → │  View       │ → │  Download   │       │
│  │  Feedback   │    │  Summary     │    │  Results    │    │  Report     │       │
│  │  (Optional) │    │  Generation │    │  (Score)    │    │  (PDF)      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Interview Types Flow

| Type | Flow | Duration |
|------|------|-----------|
| **Live Technical** | Waiting Room → Interview → Results | 45-90 min |
| **Mock Interview** | Prep → Practice → Feedback | 30-60 min |
| **Async Video** | Questions → Record → Submit | Self-paced |
| **Take-home** | Receive → Code → Submit → Review | 24-72 hours |
| **Panel** | Multiple interviewers → Combined scores | 60-120 min |

---

## Interviewer Workflow

### 1. Schedule Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        INTERVIEWER SCHEDULING FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Set         │ → │  View        │ → │  Accept/     │ → │  Interview  │       │
│  │  Availability│    │  Candidate  │    │  Reject      │    │  Reminder   │       │
│  │              │    │  Requests   │    │              │    │              │       │
│  │  - Calendar  │    │              │    │              │    │              │       │
│  │  - Timezone │    │              │    │              │    │              │       │
│  │  - Duration │    │              │    │              │    │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                  │
│  AUTO-SCHEDULING (Phase 9 AI Agent)                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                            │
│  │  AI Match   │ → │  Find Best  │ → │  Send       │                            │
│  │  Candidate │    │  Slot       │    │  Invite     │                            │
│  │  to Job     │    │             │    │             │                            │
│  └──────────────┘  └──────────────┘  └──────────────┘                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Evaluation Process

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EVALUATION FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DURING INTERVIEW                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │  Real-time Notes:                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │   │
│  │  │ Timestamp  │  │ Quick      │  │ Flag       │  │ Voice      │       │   │
│  │  │ Markers    │  │ Rating     │  │ Important  │  │ Recording  │       │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │   │
│  │                                                                         │   │
│  │  Collaborative Tools (Phase 11):                                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │   │
│  │  │ Code       │  │ Whiteboard│  │ Video      │  │ Chat       │       │   │
│  │  │ Editor     │  │           │  │ Call       │  │            │       │   │
│  │  │ (Yjs)      │  │           │  │ (WebRTC)   │  │            │       │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  POST-INTERVIEW                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Scorecard   │ → │  Panel      │ → │  Final      │ → │  Send       │       │
│  │  Completion  │    │  Consensus  │    │  Score      │    │  Report     │       │
│  │              │    │  (if multi)│    │  Calc       │    │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Admin Workflow

### 1. Tenant Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            ADMIN DASHBOARD FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Dashboard   │ → │  Manage      │ → │  Configure  │ → │  Monitor    │       │
│  │  Overview   │    │  Users      │    │  Settings   │    │  Analytics  │       │
│  │              │    │              │    │              │    │              │       │
│  │  - Stats    │    │  - Roles    │    │  - Branding │    │  - Reports  │       │
│  │  - Alerts   │    │  - Permissions│ │  - Features │    │  - Trends   │       │
│  │  - Health   │    │  - Invite   │    │  - Limits   │    │  - Audit    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                  │
│  COMPLIANCE (Phase 14)                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                            │
│  │  Audit      │ → │  Data       │ → │  Access     │                            │
│  │  Logs       │    │  Export     │    │  Requests   │                            │
│  │              │    │  (GDPR)     │    │  (Approve)  │                            │
│  └──────────────┘  └──────────────┘  └──────────────┘                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Configuration Tasks

| Task | Frequency | Steps |
|------|-----------|-------|
| User Management | Daily | Invite → Assign Role → Monitor |
| Question Bank | Weekly | Create → Review → Publish → Track |
| Report Generation | Weekly/Monthly | Configure → Generate → Export |
| Security Audit | Monthly | Review Logs → Update Rules → Report |
| Compliance Check | Quarterly | Export Data → Verify → Document |

---

## AI Agent Workflow (Phase 18)

### 1. Resume Screening Agent

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        RESUME SCREENING AGENT FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Trigger: Resume Uploaded OR Job Posted                                          │
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  Receive    │ → │  Extract     │ → │  Match to   │ → │  Generate   │    │
│  │  Resume     │    │  Skills     │    │  Job Reqs   │    │  Score      │    │
│  │              │    │              │    │              │    │              │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    │
│          │                                                       │               │
│          ▼                                                       ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  Shortlist  │ ← │  Set         │ ← │  Rank        │ ← │  Notify      │    │
│  │  Candidate │    │  Threshold   │    │  Candidates │    │  HR Team     │    │
│  │              │    │              │    │              │    │              │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Scheduling Agent

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         SCHEDULING AGENT FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Trigger: Candidate Shortlisted                                                 │
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  Find       │ → │  Check      │ → │  Create     │ → │  Send       │    │
│  │  Available  │    │  Calendar   │    │  Interview │    │  Invite     │    │
│  │  Slots      │    │  Conflicts  │    │  Slot       │    │              │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    │
│          │                   │                   │                   │            │
│          ▼                   ▼                   ▼                   ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  (No slots) │    │  (Conflict)  │    │  (Create)   │    │  (Email/    │    │
│  │  → Waitlist │    │  → Skip      │    │  → Confirm  │    │   Slack)    │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Feedback Generation Agent

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                       FEEDBACK GENERATION AGENT FLOW                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Trigger: Interview Completed                                                    │
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  Collect    │ → │  Analyze     │ → │  Generate    │ → │  Send to    │    │
│  │  Responses  │    │  Answers    │    │  Feedback    │    │  Candidate  │    │
│  │              │    │  + Scores   │    │  (LLM)      │    │              │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                                  │
│  Output:                                                                       │
│  • Overall Score                                                                │
│  • Technical Assessment                                                         │
│  • Communication Feedback                                                       │
│  • Areas for Improvement                                                       │
│  • Recommended Next Steps                                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## System Processes

### Background Jobs (BullMQ)

| Job | Queue | Frequency | Purpose |
|-----|-------|-----------|---------|
| `processResume` | ai | On upload | Parse & embed |
| `sendReminder` | email | 24h before | Interview reminder |
| `cleanupRecordings` | default | Daily | Delete old videos |
| `generateReport` | default | Scheduled | PDF generation |
| `syncHRIS` | default | Hourly | Employee sync |
| `runRetentionPolicy` | default | Daily | Data cleanup |
| `processBackgroundCheck` | default | On demand | Verification |

### Webhook Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `interview.created` | Interview scheduled | Interview data |
| `interview.started` | Candidate enters | Session ID |
| `interview.completed` | Interview ends | Results |
| `candidate.evaluated` | Score submitted | Scores |
| `candidate.hired` | Final decision | Candidate info |
| `report.generated` | Report ready | Report URL |

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Resume upload fails | Retry 3x, then alert admin |
| AI service timeout | Use cache, fallback model |
| Video recording fails | Continue interview, log issue |
| Payment fails | Block new interviews, notify |
| Rate limit exceeded | Queue requests, process later |

---

*InterviewMinds Workflow Documentation - Production Ready*