# Goal

Migrate this React + Vite app to Next.js using the target stack:

- Framework: Next.js (App Router) + React + TypeScript + Material UI
- Database: Neon (Free) + PostgreSQL
- Authentication: Clerk (Free tier) via `@clerk/nextjs`
- Hosting: Vercel
- Storage: Cloudflare R2 (10GB free)

## Current implementation

This repository currently uses:

- React + TypeScript + Vite
- Material UI (`@mui/material`, `@mui/icons-material`, `@emotion/*`)
- Supabase for authentication, PostgreSQL access, and app database client
- Client-side database queries via `src/lib/supabase.ts` and `@supabase/supabase-js`
- App-level auth wrapper in `src/lib/auth.tsx`
- react-router for client-side routing
- Tables and schema seeded in `supabase/migrations/*.sql`

## Required migration tasks

### 1. Migrate from Vite to Next.js (App Router)

- Bootstrap a new Next.js project (or convert in place) using the App Router (`app/` directory).
- Remove Vite config files (`vite.config.ts`, `index.html`) and replace with `next.config.ts`.
- Remove react-router; replace with Next.js file-based routing under `app/`.
- Move existing pages from `src/pages/*` to `app/` routes, preserving the same URL structure.
- Keep MUI and Emotion dependencies in `package.json`.
- Add MUI + Emotion SSR compatibility: wrap the app with `AppRouterCacheProvider` from `@mui/material-nextjs` and configure the theme in a client component.
- Add `"use client"` directives to any component that uses browser APIs, hooks, or MUI interactive components.
- Remove `src/App.tsx` and replace router/layout logic with `app/layout.tsx`.

### 2. Replace Supabase authentication with Clerk

- Remove Supabase auth-related logic from `src/lib/auth.tsx` and `src/lib/supabase.ts`.
- Install `@clerk/nextjs` and wrap the app in `<ClerkProvider>` inside `app/layout.tsx`.
- Add Clerk middleware (`middleware.ts` at the project root) to protect routes server-side using `clerkMiddleware` and `createRouteMatcher`.
- Replace `ProtectedRoute` and `AdminRoute` client wrappers with middleware-level and layout-level auth checks.
- Use `currentUser()` or `auth()` from `@clerk/nextjs/server` in Server Components and API routes.
- Use `useUser()` and `useAuth()` from `@clerk/nextjs` in Client Components.
- Expose `user`, `isLoaded`, `isSignedIn`, `signIn`, `signOut`, and `signUp` to the UI via Clerk hooks — no custom auth wrapper needed.

### 3. Replace database access with Neon PostgreSQL via Next.js API routes

- Create API routes under `app/api/` (Route Handlers) to handle all queries against Neon Postgres.
- Move all direct database operations out of the browser and into these server-side handlers.
- Use Drizzle ORM or the `@neondatabase/serverless` driver with plain SQL for queries.
- Maintain the existing data model for `employees`, `projects`, `clients`, `timesheets`, `daily_reports`, `assets`, and related tables.
- Use the SQL definitions from `supabase/migrations/*.sql` as the schema reference; adapt any Supabase-specific syntax to plain PostgreSQL.
- Set `DATABASE_URL` in `.env.local` pointing to the Neon connection string.

### 4. Integrate Cloudflare R2 for storage support

- Add Cloudflare R2 client setup inside a Next.js API route (`app/api/storage/`).
- Use the `@aws-sdk/client-s3` package (R2 is S3-compatible) for upload/download operations.
- Add environment variables: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`.
- If the app stores files or attachments, migrate those flows to R2; otherwise scaffold an upload route and storage adapter for future use.

### 5. Configure hosting and environment variables for Vercel

- Deploy the Next.js app to Vercel (it is the canonical host for Next.js).
- Set all environment variables in the Vercel dashboard:
  - `DATABASE_URL` — Neon Postgres connection string
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — Clerk credentials
  - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` — Cloudflare R2
- Remove `vercel.json` rewrites that were needed for Vite SPA routing (Next.js handles this natively).

## Notes for implementation

- The App Router uses React Server Components by default; add `"use client"` only where needed (interactivity, hooks, MUI components).
- All database and storage access must stay in Server Components or API route handlers — never in Client Components.
- Keep the app TypeScript-safe; define shared types in `lib/types.ts` and use them across API routes and page components.
- Clerk middleware replaces the old `ProtectedRoute`/`AdminRoute` pattern; role-based access can be enforced via Clerk `sessionClaims` or `publicMetadata`.
- MUI requires SSR setup in Next.js — use `@mui/material-nextjs` and ensure the emotion cache is configured in the root layout.

## Suggested first steps

1. Audit current Supabase and react-router usage across `src/pages/*` and `src/lib/*`.
2. Bootstrap Next.js App Router structure: `app/layout.tsx`, `app/page.tsx`, `next.config.ts`.
3. Install and configure `@clerk/nextjs`; add `middleware.ts` and wrap `app/layout.tsx` with `<ClerkProvider>`.
4. Set up MUI SSR with `AppRouterCacheProvider` in the root layout.
5. Migrate pages one by one from `src/pages/*` to `app/` routes, adding `"use client"` where needed.
6. Implement Neon-backed Route Handlers under `app/api/` for each data domain.
7. Remove `@supabase/supabase-js`, Vite config, and react-router once migration is complete.
8. Deploy to Vercel and verify auth, database, and storage workflows.
