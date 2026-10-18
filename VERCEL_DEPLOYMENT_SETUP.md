# EARNIZI deployment (Next.js + Supabase)

## Vercel

1. Import this repository into Vercel and keep the framework set to **Next.js**.
2. Configure the environment variables from `.env.example` in the Vercel project settings.
3. Deploy with the default Next.js build (`npm run build`).

`vercel.json` is configured for Next.js. Do not add a static output directory; API routes and Supabase auth require the Next server runtime.

## Supabase SQL

- New Supabase project: run `supabase/schema.sql` once.
- Existing project from the old Earnizi schema: back up first, then run `supabase/migrations/20261018_earnizi_video_store.sql`.

The migration adds the EARNIZI catalog/order model and secure video-only reward flow, and removes game/task reward configs. Review the migration in staging before applying it to production.

## Environment variables

Required for account, wallet, catalog, and video campaign data:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only integrations:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMENT_PROVIDER=paylinky`
- `PAYMENT_API_URL` (after the PayLinky adapter is implemented)
- `PAYMENT_API_KEY` (server-only)
- `PAYMENT_WEBHOOK_SECRET` (server-only)
- `NEXT_PUBLIC_SITE_URL`

PayLinky is the selected provider. Its supplied documentation URL (`https://paylinky.vercel.app/llms-full.txt`) could not be accessed from this environment, so the provider API and signature contract remain unverified and checkout is still disabled. Never expose a service-role key or payment secret in a `NEXT_PUBLIC_*` variable; do not enable checkout until the documented checkout and signed-webhook flow is implemented and tested.
