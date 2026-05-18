# Deployment Guide (Vercel + Neon + Clerk + Cloudflare R2)

Required environment variables (set these in Vercel Project > Settings > Environment Variables):

- `DATABASE_URL` or `NEON_DATABASE_URL` — Neon Postgres connection string
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (frontend)
- `CLERK_JWT_KEY` — Clerk JWT public key (for backend token verification)
- `VITE_CLERK_FRONTEND_API` or `CLERK_FRONTEND_API` — Clerk frontend API origin (optional)
- `R2_BUCKET` — Cloudflare R2 bucket name
- `R2_ENDPOINT` — Cloudflare R2 endpoint (e.g., https://<account>.r2.cloudflarestorage.com)
- `R2_ACCESS_KEY_ID` — R2 access key ID
- `R2_SECRET_ACCESS_KEY` — R2 secret

Build & deploy commands:

```bash
npm run build
npm run deploy    # uses vercel CLI if configured
```

Notes:
- API routes live under the `api/` folder and are compatible with Vercel serverless functions.
- Server endpoints use `@clerk/backend` to verify tokens. Ensure `CLERK_JWT_KEY` is set for networkless verification.
- Database queries use `pg` and `DATABASE_URL` environment variable.
- Receipt uploads/downloads use signed R2 URLs generated in `api/upload.js` and `api/download.js`.
