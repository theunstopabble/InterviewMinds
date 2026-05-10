# InterviewMinds API Documentation

## Overview

The InterviewMinds API is a RESTful + GraphQL API built on Node.js/Express. It provides endpoints for resume management, AI-powered chat interviews, code compilation, and **18 enterprise features** including security, proctoring, compliance, and analytics.

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

### Additional Security Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/e2e-encryption/keys/create | Generate E2E encryption key pair |
| POST | /api/e2e-encryption/keys/rotate | Rotate E2E encryption keys |
| POST | /api/biometric/enroll | Enroll biometric (face/voice/fingerprint) |
| POST | /api/biometric/verify | Verify biometric authentication |
| POST | /api/geo-fencing/validate | Validate IP location & restrictions |
| POST | /api/fraud-detection/analyze | Analyze browser fingerprint & behavior |

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 200 requests | 15 minutes |
| AI Services (Chat, TTS) | 30 requests | 1 minute |
| File Uploads | 10 requests | 15 minutes |
| GraphQL | 100 requests | 1 minute |
| Biometric Verification | 5 requests | 1 minute |

---

## REST Endpoints

---

### 1. Resume Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/resume/upload | Upload resume PDF |
| GET | /api/resume | List user resumes |
| GET | /api/resume/:id | Get resume details |
| DELETE | /api/resume/:id | Delete resume |

### 2. Resume Verification (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/resume-verification/verify | Verify resume facts |
| GET | /api/resume-verification/:id | Get verification results |

**Features:** Entity extraction, timeline analysis, skill gap detection, cross-reference verification

---

### 3. Job Matching (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/job-matching/extract | Extract entities from resume |
| POST | /api/job-matching/match | Match resume to job requirements |
| POST | /api/job-matching/extract-and-match | Extract and match in one call |

**Features:** Skill taxonomy, experience matching, gap analysis, recommended questions

---

### 4. Question Generation (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/questions/competencies | List all competencies |
| POST | /api/questions/generate | Generate questions for job |
| GET | /api/questions/:questionId | Get specific question |
| GET | /api/questions/competency/:competency/:difficulty | Get questions by competency |

**Features:** 5 competencies, 4 difficulty levels, STAR validation criteria

---

### 5. Answer Validation (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/answer-validation/evaluate | Evaluate single answer |
| POST | /api/answer-validation/batch-evaluate | Evaluate multiple answers |
| GET | /api/answer-validation/:evaluationId | Get evaluation results |

**Features:** Content matching, STAR method, 6 red flag types, feedback generation

---

### 6. Dynamic Questions (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/dynamic-questions/generate | Generate follow-up question |
| POST | /api/dynamic-questions/generate-sequence | Generate follow-up sequence |

**Features:** Trigger detection (vague, missing detail, contradiction), type-specific questions

---

### 7. Code Analysis (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/code-analysis/analyze | Analyze code quality & security |
| POST | /api/code-analysis/security-scan | Scan for vulnerabilities |
| POST | /api/code-analysis/complexity | Calculate complexity metrics |

**Features:** Quality scoring, 8 security vulnerabilities, cyclomatic complexity, test coverage

---

### 8. Proctoring (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/proctoring/video/analyze | Analyze video frame |
| POST | /api/proctoring/audio/analyze | Analyze audio frame |
| POST | /api/proctoring/screen/check | Check screen state |
| POST | /api/proctoring/session/evaluate | Evaluate proctoring session |
| GET | /api/proctoring/interview/:id/results | Get proctoring results |

**Features:** Face detection, eye tracking, expression analysis, tab switches, violations

---

### 9. Fraud Detection (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/fraud-detection/analyze | Analyze fraud risk |
| GET | /api/fraud-detection/session/:id | Get session analysis |

**Features:** Browser fingerprinting, VM detection, behavior analysis, risk scoring

---

### 10. Geo-Fencing (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/geo-fencing/validate | Validate IP address |
| GET | /api/geo-fencing/config | Get security configuration |
| GET | /api/geo-fencing/my-ip | Get current IP info |

**Features:** Country blocking, VPN/Proxy detection, CIDR support, datacenter blocking

---

### 11. E2E Encryption (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/e2e-encryption/keys/create | Create user key pair |
| POST | /api/e2e-encryption/keys/rotate | Rotate keys |
| GET | /api/e2e-encryption/keys/:userId | Get public key |
| POST | /api/e2e-encryption/encrypt | Encrypt message |
| POST | /api/e2e-encryption/decrypt | Decrypt message |
| POST | /api/e2e-encryption/verify | Verify key pair |

**Features:** RSA 4096-bit, AES-256-GCM, PBKDF2 key derivation

---

### 12. Biometric Auth (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/biometric/settings | Get biometric settings |
| POST | /api/biometric/enroll | Enroll biometric |
| POST | /api/biometric/verify | Verify biometric |
| GET | /api/biometric/status/:userId | Get enrollment status |
| DELETE | /api/biometric/enrollment/:userId | Remove enrollment |

**Features:** Face/Voice/Fingerprint, liveness detection, rate limiting

---

### 13. SSO Integration (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sso/config | Get SSO configuration |
| POST | /api/sso/config | Configure SSO |
| GET | /api/sso/login/:provider | Initiate SSO login |
| POST | /api/sso/callback | Handle SSO callback |
| POST | /api/sso/saml/assertion | Handle SAML assertion |

**Providers:** Okta, Azure AD, Google Workspace, Custom (OAuth 2.0/SAML)

---

### 14. Webhooks (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/webhooks/events | List available events |
| POST | /api/webhooks/register | Register webhook |
| GET | /api/webhooks/:webhookId | Get webhook config |
| PUT | /api/webhooks/:webhookId | Update webhook |
| DELETE | /api/webhooks/:webhookId | Delete webhook |
| POST | /api/webhooks/trigger | Trigger webhook |
| POST | /api/webhooks/verify | Verify signature |

**Events:** interview.started, interview.completed, candidate.registered, etc.

---

### 15. ATS Integration (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ats/configure | Configure ATS |
| GET | /api/ats/jobs | Fetch jobs from ATS |
| GET | /api/ats/jobs/:jobId/candidates | Fetch candidates |
| POST | /api/ats/results | Push interview results |
| POST | /api/ats/sync | Sync candidate to ATS |
| GET | /api/ats/webhooks | Get webhook config |
| POST | /api/ats/webhooks | Create webhook |

**Providers:** Workday, Greenhouse, Lever, BambooHR, SAP SuccessFactors

---

### 16. Multi-Tenancy (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tenants | Create tenant |
| GET | /api/tenants/:tenantId | Get tenant details |
| PUT | /api/tenants/:tenantId/settings | Update settings |
| POST | /api/tenants/:tenantId/check-feature | Check feature access |
| GET | /api/tenants/:tenantId/plan | Get plan info |
| POST | /api/tenants/validate-status | Validate status |

**Features:** 4 isolation levels, plan limits, permissions, custom branding

---

### 17. Compliance (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/compliance/audit | Log audit event |
| GET | /api/compliance/audit | Query audit logs |
| POST | /api/compliance/consent | Record consent |
| GET | /api/compliance/consent/:userId | Get user consents |
| POST | /api/compliance/consent/check | Check consent |
| POST | /api/compliance/data-request | Create data subject request |
| GET | /api/compliance/data-request/:userId | Get data requests |
| POST | /api/compliance/data-request/:id/complete | Complete request |
| POST | /api/compliance/export/:userId | Export user data |
| DELETE | /api/compliance/delete/:userId | Delete user data |
| GET | /api/compliance/security-controls | Get security controls |
| GET | /api/compliance/report/:framework | Get compliance report |

**Frameworks:** SOC 2, GDPR, HIPAA, ISO 27001

---

### 18. Analytics (Enterprise)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/dashboard | Get dashboard analytics |
| GET | /api/analytics/trends | Get interview trends |
| GET | /api/analytics/top-performers | Get top performers |
| POST | /api/analytics/predict | Predict candidate success |
| GET | /api/analytics/pipeline | Get pipeline analysis |
| GET | /api/analytics/training/:candidateId | Get training recommendations |
| GET | /api/analytics/report/:type | Generate report |

**Features:** Score distribution, competency trends, proctoring metrics, predictions

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

All endpoints are prefixed with `/api/` (e.g., `/api/resume/upload`)

---

## Support

For API support, contact: support@interviewminds.com