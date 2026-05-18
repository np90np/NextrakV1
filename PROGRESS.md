# NextRak — Migration Progress & Session Summary

**Date:** 2026-05-17  
**Stack:** React + Vite + TypeScript + MUI → Clerk + Neon PostgreSQL + Cloudflare R2 + Vercel

---

## Overall Goal

Migrate a construction management SaaS app from Supabase (auth + database) to:
- **Auth:** Clerk (`@clerk/clerk-react`, `@clerk/backend`)
- **Database:** Neon PostgreSQL via Vercel serverless API routes (`pg` driver)
- **Storage:** Cloudflare R2 (S3-compatible via `@aws-sdk/client-s3`)
- **Hosting:** Vercel (Hobby plan)

---

## Completed Work

### Frontend Migration (100% Complete)
All 12 pages fully migrated from Supabase client to `useAuthedFetch` → API routes:

| Page | Status |
|---|---|
| `src/pages/Dashboard.tsx` | ✅ Done |
| `src/pages/Employees.tsx` | ✅ Done |
| `src/pages/Clients.tsx` | ✅ Done |
| `src/pages/Projects.tsx` | ✅ Done |
| `src/pages/MyTimesheet.tsx` | ✅ Done |
| `src/pages/Timesheets.tsx` | ✅ Done |
| `src/pages/DailyReports.tsx` | ✅ Done |
| `src/pages/Assets.tsx` | ✅ Done |
| `src/pages/MachineChecklists.tsx` | ✅ Done |
| `src/pages/EmployeeDashboard.tsx` | ✅ Done |
| `src/pages/Export.tsx` | ✅ Done |
| `src/pages/Login.tsx` | ✅ Done |

- `src/lib/supabase.ts` is stubbed (`export const supabase = {} as any`)
- `src/lib/auth.tsx` uses Clerk, hydrates `employee` from `/api/me`
- `src/lib/api.tsx` exports `useAuthedFetch` hook (injects Clerk JWT into every request)

### API Layer (100% Complete)
All API routes use `api/_auth.js` (shared Clerk JWT verification) and `api/_db.js` (Neon PostgreSQL pool).

**Flat file structure (12 serverless functions):**

| File | Routes Handled |
|---|---|
| `api/me.js` | `GET /api/me` |
| `api/upload.js` | `POST /api/upload` (R2 presigned URL) |
| `api/download.js` | `GET /api/download` (R2 presigned URL) |
| `api/dashboard.js` | `GET /api/dashboard/overview` |
| `api/employees.js` | `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/:id` |
| `api/projects.js` | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `GET /api/projects/costs` |
| `api/timesheets.js` | `GET/POST /api/timesheets`, `GET/PUT/DELETE /api/timesheets/:id` |
| `api/timesheet-entries.js` | `GET/POST /api/timesheets/entries`, `PUT/DELETE /api/timesheets/entries/:id` |
| `api/daily-reports.js` | `GET/POST /api/daily-reports`, `PUT/DELETE /api/daily-reports/:id` |
| `api/daily-expenses.js` | `GET/POST /api/daily-expenses`, `DELETE /api/daily-expenses/:id` |
| `api/assets.js` | `GET/POST /api/assets`, `PUT /api/assets/:id` |
| `api/machine-checklists.js` | `GET/POST /api/machine-checklists`, `PUT /api/machine-checklists/:id` |

**Shared helpers (excluded from serverless by `_` prefix):**
- `api/_auth.js` — Clerk `verifyToken`, falls back to `CLERK_SECRET_KEY` if `CLERK_JWT_KEY` not set
- `api/_db.js` — Neon PostgreSQL `pg.Pool`

**Old subdirectory routes** renamed to `_` prefix (ignored by Vercel):
- `api/_employees/`, `api/_projects/`, `api/_timesheets/`, `api/_daily-reports/`, etc.

### Vercel Environment Variables (Set)

| Variable | Environments |
|---|---|
| `DATABASE_URL` | Production, Development |
| `CLERK_SECRET_KEY` | Production, Development |
| `VITE_CLERK_PUBLISHABLE_KEY` | Production, Development |
| `R2_ACCESS_KEY_ID` | Production |
| `R2_SECRET_ACCESS_KEY` | Production |
| `R2_BUCKET` | Production |
| `R2_ENDPOINT` | Production |

> **Note:** `CLERK_JWT_KEY` is intentionally NOT set — `api/_auth.js` falls back to `CLERK_SECRET_KEY` automatically.

---

## Blocked: Vercel Deployment

### Problem
Vercel Hobby plan: **max 12 serverless functions**. The app has exactly 12 after consolidation, but deployment keeps failing with:

```
"No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan."
```

### What Was Tried

1. **Attempt 1** — Original 21 `api/**/*.js` files → failed (21 > 12)
2. **Attempt 2** — Consolidated to 12 flat files + updated `builds: api/*.js` → still failed (Vercel counted `_auth.js` + `_db.js` as functions too = 14)
3. **Attempt 3** — Renamed old subdirectories to `_` prefix → still failed (legacy `builds` config ignores `_` convention)
4. **Attempt 4** — Switched to modern `vercel.json` with `"framework": "vite"` + `"buildCommand": "npm run build"` → failed with exit code 127 (`tsc` not found)
5. **Attempt 5 (in progress)** — Modern `vercel.json` with ONLY `"rewrites"` (no `builds`, no `framework`/`buildCommand`) → **deployment was interrupted by user before completing**

### Current `vercel.json` State
```json
{
  "rewrites": [
    { "source": "/api/dashboard/overview", "destination": "/api/dashboard" },
    { "source": "/api/projects/costs", "destination": "/api/projects?resource=costs" },
    { "source": "/api/projects/:id", "destination": "/api/projects?id=:id" },
    { "source": "/api/employees/:id", "destination": "/api/employees?id=:id" },
    { "source": "/api/timesheets/entries/:id", "destination": "/api/timesheet-entries?id=:id" },
    { "source": "/api/timesheets/entries", "destination": "/api/timesheet-entries" },
    { "source": "/api/timesheets/:id", "destination": "/api/timesheets?id=:id" },
    { "source": "/api/daily-reports/:id", "destination": "/api/daily-reports?id=:id" },
    { "source": "/api/daily-expenses/:id", "destination": "/api/daily-expenses?id=:id" },
    { "source": "/api/assets/:id", "destination": "/api/assets?id=:id" },
    { "source": "/api/machine-checklists/:id", "destination": "/api/machine-checklists?id=:id" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

This is the configuration that was interrupted before deployment could complete.

---

## Next Steps to Try

### Option A — Continue with current `vercel.json` (most likely to work)
Run: `vercel --prod`

The modern config with only `"rewrites"` (no `"builds"`) should:
- Auto-detect Vite + build with `npm run build`
- Output to `dist/`
- Respect `_` prefix convention (exclude `_auth.js`, `_db.js`)
- Deploy exactly 12 functions

### Option B — If auto-detection fails (Vite not detected)
Add `"framework": "vite"` without `"buildCommand"`:
```json
{
  "framework": "vite",
  "rewrites": [...]
}
```

### Option C — Explicit function list (guaranteed to work)
Replace the builds glob with an explicit list of 12 files:
```json
{
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "api/(me|upload|download|dashboard|employees|projects|timesheets|timesheet-entries|daily-reports|daily-expenses|assets|machine-checklists).js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/dashboard/overview", "dest": "/api/dashboard" },
    { "src": "/api/projects/costs", "dest": "/api/projects?resource=costs" },
    { "src": "/api/projects/([^/]+)", "dest": "/api/projects?id=$1" },
    { "src": "/api/employees/([^/]+)", "dest": "/api/employees?id=$1" },
    { "src": "/api/timesheets/entries/([^/]+)", "dest": "/api/timesheet-entries?id=$1" },
    { "src": "/api/timesheets/entries", "dest": "/api/timesheet-entries" },
    { "src": "/api/timesheets/([^/]+)", "dest": "/api/timesheets?id=$1" },
    { "src": "/api/daily-reports/([^/]+)", "dest": "/api/daily-reports?id=$1" },
    { "src": "/api/daily-expenses/([^/]+)", "dest": "/api/daily-expenses?id=$1" },
    { "src": "/api/assets/([^/]+)", "dest": "/api/assets?id=$1" },
    { "src": "/api/machine-checklists/([^/]+)", "dest": "/api/machine-checklists?id=$1" },
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

## Known Issues / Post-Deploy Tasks

1. **Database schema** — The Neon database must have the tables created. Run the SQL from `supabase/migrations/*.sql` against the Neon database if not already done.
2. **Employee `user_id` field** — `api/me.js` looks up employees by `user_id` (Clerk user ID). The `employees` table needs a `user_id` column populated with Clerk user IDs for each employee.
3. **`.env` in git** — The `.env` file contains secrets and is currently untracked (good), but should be added to `.gitignore` to prevent accidental commits.
4. **`VITE_CLERK_PUBLISHABLE_KEY` warning** — Vercel warned this is visible to site visitors (expected — it's a public key by design).

---

## File Structure Reference

```
nextrak/
├── api/
│   ├── _auth.js              ← Shared Clerk JWT verification
│   ├── _db.js                ← Neon PostgreSQL pool
│   ├── me.js
│   ├── upload.js
│   ├── download.js
│   ├── dashboard.js
│   ├── employees.js
│   ├── projects.js
│   ├── timesheets.js
│   ├── timesheet-entries.js
│   ├── daily-reports.js
│   ├── daily-expenses.js
│   ├── assets.js
│   ├── machine-checklists.js
│   ├── _employees/           ← Old routes (ignored by Vercel)
│   ├── _projects/
│   ├── _timesheets/
│   ├── _daily-reports/
│   ├── _daily-expenses/
│   ├── _assets/
│   ├── _machine-checklists/
│   └── _dashboard/
├── src/
│   ├── lib/
│   │   ├── auth.tsx           ← Clerk auth context
│   │   ├── api.tsx            ← useAuthedFetch hook
│   │   └── supabase.ts        ← Stubbed ({} as any)
│   └── pages/                 ← All pages migrated
├── vercel.json
└── .env                       ← Local secrets (DO NOT COMMIT)
```
