# Vercel Deployment

This project is configured to deploy the Vite frontend and Express API on Vercel.

## Project Settings

The repo-level `vercel.json` sets these automatically:

- Build command: `npm run build:vercel`
- Output directory: `dist/public`
- API function: `api/[...slug].ts`
- SPA fallback: all non-file routes rewrite to `/index.html`
- Cron paths for lifecycle/indexer/worker jobs under `/api/cron/*`

## Environment Variables

Copy production values from the current host into Vercel Project Settings. Do not commit `.env`.

Minimum backend values:

- `DATABASE_URL`
- `SESSION_SECRET`
- `FRONTEND_URL=https://your-vercel-domain`
- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`
- `CRON_SECRET`

Frontend build values must also be present in Vercel because Vite embeds `VITE_*` values at build time:

- `VITE_APP_URL=https://your-vercel-domain`
- `VITE_PRIVY_APP_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_PAYSTACK_PUBLIC_KEY`

Add the onchain, Telegram, OpenRouter, Moralis, Paystack, web-push, Twitter, and agent secrets that match the features enabled in production.

## Database

Vercel Functions are request-scoped, so schema initialization is disabled by default on Vercel. Use an already-migrated managed Postgres database, run migrations before deploy, or temporarily set `SERVERLESS_INIT_DB=true` for a one-time deployment and then remove it.

## Uploads

Local file storage is not persistent on Vercel. In production the app defaults uploads to database-backed media unless Cloudinary credentials are set. For larger media volume, set:

- `MEDIA_STORAGE_MODE=cloudinary`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Telegram And Background Work

Telegram should use webhooks on Vercel:

- `TELEGRAM_BOT_WEBHOOK_URL=https://your-vercel-domain/api/telegram/bot-webhook`
- `BANTAHBRO_TELEGRAM_BOT_WEBHOOK_URL=https://your-vercel-domain/api/telegram/bantahbro-webhook`

Long-running loops such as indexers, schedulers, automation, and polling workers are disabled by default in the serverless entrypoint. Vercel Cron invokes these protected endpoints instead:

- `/api/cron/onchain-indexer` every 5 minutes
- `/api/cron/challenge-lifecycle` every 5 minutes
- `/api/cron/event-lifecycle` every 10 minutes
- `/api/cron/payouts` every 5 minutes
- `/api/cron/bantahbro-settlement` every 5 minutes
- `/api/cron/bantahbro-automation` every 15 minutes
- `/api/cron/bantahbro-battle-broadcast` every 5 minutes
- `/api/cron/notifications` every 15 minutes
- `/api/cron/telegram-link-cleanup` hourly

Set `CRON_SECRET` in Vercel. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`, and the endpoints reject production requests without it.

These schedules require a Vercel plan that supports sub-daily cron frequency. On Hobby, Vercel only allows daily cron jobs, so either upgrade or relax the schedules before deploying.

Keep `VERCEL_ENABLE_BACKGROUND_WORKERS` unset unless you are intentionally testing worker startup inside a function invocation.
