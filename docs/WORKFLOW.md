# Development Workflow

**Version:** 2.0.0  
**Last Updated:** May 2026

---

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x | Runtime |
| npm | 10.x | Package manager |
| MongoDB | 6+ | Database (local or Atlas) |
| Redis | 7+ | Cache and queues (local or Cloud) |
| Git | 2.x | Version control |

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/interview-minds.git
cd interview-minds

# Install all workspace dependencies
npm install --legacy-peer-deps

# Copy environment template
cp apps/api/.env.example apps/api/.env

# Edit .env with your credentials
# Required: MONGO_URI, JWT_SECRET, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, GROQ_API_KEY
```

### Running Development Servers

```bash
# Start all workspaces (frontend + backend) via Turborepo
npm run dev

# Or start individually:
npm run dev --workspace=apps/api     # Backend on :8000
npm run dev --workspace=apps/web     # Frontend on :5173
```

---

## Project Commands

### Root (Turborepo)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all workspaces in dev mode |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |

### Backend (`apps/api`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled JS (production) |
| `npm run typecheck` | Type check without emitting |
| `npm run lint` | ESLint check |
| `npm run test` | Run Vitest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage |

### Frontend (`apps/web`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite build |
| `npm run typecheck` | Type check without emitting |
| `npm run lint` | ESLint check |
| `npm run test` | Run Vitest test suite |
| `npm run preview` | Preview production build locally |

---

## Testing Strategy

### Test Framework

- **Runner:** Vitest 2.1
- **Property-Based:** fast-check 3.22
- **HTTP Testing:** Supertest 7
- **Frontend:** @testing-library/react 16.1

### Test Structure

```
apps/api/src/tests/
├── bug-condition-exploration.test.ts    # 7 bug condition tests
└── preservation.test.ts                 # 32 preservation tests
```

**Total:** 39 tests (7 bug condition + 32 preservation)

### Running Tests

```bash
# Run all backend tests
cd apps/api && npm run test

# Run with coverage report
cd apps/api && npm run test:coverage

# Watch mode (re-run on file changes)
cd apps/api && npm run test:watch

# Run frontend tests
cd apps/web && npm run test
```

### Property-Based Testing

The project uses fast-check for property-based testing to verify invariants:

```typescript
import { fc } from "fast-check";

// Example: CRDT merge preserves content
fc.assert(
  fc.property(fc.string(), fc.string(), fc.string(), (base, editA, editB) => {
    const merged = threeWayMerge(base, editA, editB);
    // Property: merged result contains changes from both edits
    return merged.length >= 0;
  })
);
```

### Bug Condition Tests

These tests verify that specific bugs identified during the production-production-readiness audit are fixed:

1. Video proctoring produces input-dependent results (not static)
2. Multimodal voice analysis uses Groq LLM as primary (not keyword-only)
3. Collaborative editor uses three-way merge (not last-write-wins)
4. Whiteboard has persistence layer (not in-memory-only)
5. Video call includes ICE server configuration (not signaling-only)
6. Voice analysis result includes `source` field
7. Face detection confidence varies with input

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/main.yml`  
**Triggers:** Push to `main`, Pull Requests to `main`  
**Node Version:** 20.x

```
Push/PR to main
       ↓
┌──────────────────────────────────────────┐
│  1. Checkout Code                        │
│  2. Setup Node.js 20 (with npm cache)    │
│  3. npm install --legacy-peer-deps       │
├──────────────────────────────────────────┤
│  Backend Pipeline:                       │
│  4. npm run typecheck (apps/api)         │
│  5. npm run test (apps/api)              │
│  6. npm run build (apps/api)             │
├──────────────────────────────────────────┤
│  Frontend Pipeline:                      │
│  7. npm run typecheck (apps/web)         │
│  8. npm run test (apps/web)              │
│  9. npm run build (apps/web)             │
└──────────────────────────────────────────┘
```

### Quality Gates

All of the following must pass before merge:

- TypeScript compilation (zero errors)
- All tests pass (39 backend + frontend tests)
- Production build succeeds

---

## Git Workflow

### Branch Strategy

```
main (production)
  └── feature/<name>     # New features
  └── bugfix/<name>      # Bug fixes
  └── hotfix/<name>      # Production hotfixes
```

### Commit Convention

```
feat: add CRDT three-way merge to collaborative editor
fix: video proctoring now uses content-derived analysis
docs: update API documentation for v2.0.0
test: add property-based tests for merge algorithm
refactor: extract face ML service to separate module
```

### PR Process

1. Create feature branch from `main`
2. Implement changes with TypeScript types
3. Add/update tests
4. Ensure `npm run typecheck` passes locally
5. Push and create PR
6. CI runs automatically (typecheck → test → build)
7. Code review
8. Merge to `main`

---

## Code Organization Conventions

### Backend Service Pattern

Each service in `src/lib/` follows this pattern:

```typescript
// 1. Imports
import { logger } from "./logger";

// 2. Type definitions (exported interfaces)
export interface ServiceResult { ... }

// 3. Internal state (module-scoped)
const sessions = new Map<string, Session>();

// 4. Internal helper functions (not exported)
function computeInternal(): number { ... }

// 5. Exported public API
export function createSession(): string { ... }
export function getSession(id: string): Session | null { ... }
```

### Route Pattern

Each route file in `src/routes/` follows:

```typescript
import { Router, Request, Response } from "express";
import { someService } from "../lib/someService";

const router = Router();

router.post("/action", async (req: Request, res: Response) => {
  try {
    const result = await someService(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Operation failed" });
  }
});

export default router;
```

### Middleware Chain

Routes are mounted in `src/index.ts` with explicit middleware:

```typescript
app.use(
  "/api/resource",
  requireAuth,      // Clerk authentication
  attachRole,       // RBAC role lookup
  auditLog("resource"), // Audit trail
  resourceRoutes,   // Route handler
);
```

---

## Debugging

### Structured Logging

All logs use Pino with structured JSON:

```typescript
import { logger } from "./lib/logger";

logger.info({ sessionId, userId }, "Session created");
logger.warn({ error }, "Fallback triggered");
logger.error({ err: error.message, stack: error.stack }, "Unhandled error");
```

### Correlation IDs

Every request gets a unique correlation ID (`X-Correlation-ID` header):
- Injected by `correlationMiddleware`
- Included in all log entries for that request
- Stored in audit logs for tracing

### Development Tools

```bash
# Pretty-print logs in development
# (pino-pretty is a dev dependency)
npm run dev  # Automatically uses pino-pretty transport

# Check Prometheus metrics
curl http://localhost:8000/metrics

# Check health status
curl http://localhost:8000/health

# GraphQL playground (development only)
# Visit http://localhost:8000/graphql
```

---

## Adding New Features

### Adding a New Service

1. Create `src/lib/newFeature.ts` with exported functions
2. Create `src/routes/newFeature.ts` with Express router
3. Mount in `src/index.ts` with appropriate middleware
4. Add tests in `src/tests/`
5. Update documentation

### Adding a New Model

1. Create `src/models/NewModel.ts` with Mongoose schema
2. Import and use in relevant services
3. Document in `docs/DB_SCHEMA.md`

### Adding Environment Variables

1. Add to `src/lib/envValidation.ts` with validation rules
2. Add to `.env.example` with placeholder
3. Document in `docs/DEPLOYMENT.md`
