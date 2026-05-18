# Copilot instructions

## Goal
Update this React + Vite app to use the target stack:
- Frontend: Vercel (Free) + React + TypeScript + Material UI
- Database: Neon (Free) + PostgreSQL
- Authentication: Clerk (Free tier)
- Hosting: Vercel + Neon
- Storage: Cloudflare R2 (10GB free)

## Current implementation
This repository currently uses:
- React + TypeScript + Vite
- Material UI (`@mui/material`, `@mui/icons-material`, `@emotion/*`)
- Supabase for authentication, PostgreSQL access, and app database client
- Client-side database queries via `src/lib/supabase.ts` and `@supabase/supabase-js`
- App-level auth wrapper in `src/lib/auth.tsx`
- Tables and schema seeded in `supabase/migrations/*.sql`

## Required migration tasks

### 1. Keep Vite + React + TypeScript and preserve Material UI
- Keep MUI and Emotion dependencies in `package.json`.
- Preserve existing MUI-based layout and page components.
- No Tailwind CSS or shadcn/ui migration is required.

### 2. Replace Supabase authentication with Clerk
- Remove Supabase auth-related logic from `src/lib/auth.tsx` and `src/lib/supabase.ts`.
- Add Clerk frontend integration using `@clerk/clerk-react` and `@clerk/nextjs` or `@clerk/clerk-js` depending on Vercel hosting approach.
- Implement a new auth provider and hooks that expose `user`, `session`, `loading`, `signIn`, `signOut`, and `signUp` through Clerk.
- Update `src/App.tsx` and route protection logic to use Clerk auth state.

### 3. Replace database access with Neon PostgreSQL via a secure API layer
- Create Vercel serverless API routes (or a backend API folder) to handle queries against Neon Postgres.
- Move direct database operations out of the browser and into server-side API endpoints.
- Translate existing Supabase queries to standard PostgreSQL queries or use an ORM that works with Neon (for example Prisma, Drizzle, or `pg`).
- Maintain the existing app data model and page flow for `employees`, `projects`, `clients`, `timesheets`, `daily_reports`, `assets`, and related tables.
- Use the SQL definitions from `supabase/migrations/*.sql` as the schema reference, but adapt to plain PostgreSQL if any Supabase-specific syntax exists.

### 4. Integrate Cloudflare R2 for storage support
- Add Cloudflare R2 client setup for upload/download operations in a serverless API route.
- Add environment variables for `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_ENDPOINT`.
- If the app currently stores files or attachments, migrate those flows to R2; if not, scaffold a future-proof upload API route and storage adapter.

### 5. Configure hosting and environment variables for Vercel
- Deploy frontend and API routes to Vercel.
- Use Neon for the Postgres database and set `DATABASE_URL` in Vercel.
- Configure Clerk environment variables for the Clerk application.
- Configure Cloudflare R2 credentials in Vercel.

## Notes for implementation
- Preserve the existing React route structure under `src/pages/*` and the current router flow in `src/App.tsx`.
- The current app currently depends on Supabase both for auth and database access; the migration should split those concerns cleanly.
- Keep the app TypeScript-safe and migrate any Supabase typed database access to a new query layer.
- Ensure protected pages still use the existing `ProtectedRoute` and `AdminRoute` behavior via Clerk-based auth.

## Suggested first steps
1. Audit current Supabase usage across `src/pages/*` and `src/lib/*`.
2. Remove `@supabase/supabase-js` once the new backend layer is ready.
3. Install and configure Clerk plus shadcn/ui.
4. Implement Neon-backed server API routes for database operations.
5. Deploy to Vercel and verify auth, database, and storage workflows.
