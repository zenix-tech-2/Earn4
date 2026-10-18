# EARNIZI

EARNIZI is a mobile-first digital store built with Next.js App Router, Supabase Auth, and Supabase Postgres. The interface follows the supplied blue/purple EARNIZI references: Home, Numbers, Store, Categories, and Account. Reward earning is video-only; game reward flows have been removed.

## Run locally

- Node.js 20.9 or newer
- `npm ci`
- Copy `.env.example` to `.env.local` and set the Supabase project URL and anon key.
- `npm run dev`

The storefront shell works without Supabase configuration. Sign-in, product inventory, wallet data, and video campaigns require the database configuration and SQL below.

## Supabase setup

For a fresh project, run `supabase/schema.sql` in the Supabase SQL editor. It contains the original auth/profile foundation plus the EARNIZI store, wallet ledger, video-only reward tables, RLS policies, and secure video reward RPCs.

For an existing project that already ran the previous Earnizi schema, run only:

- `supabase/migrations/20261018_earnizi_video_store.sql`

That migration adds paid catalog fields, order/payment records, virtual-number requests, video watch sessions, and a server-verified video reward ledger. It also removes the old game/task reward configuration and tightens profile/payment write access. Back up production data before applying migrations.

To publish a video campaign, create it from `/admin` with a title, HTTPS video URL, positive reward amount, currency, required watch time, and `is_active = true`. Supported playback URLs are direct MP4/WebM/Ogg files and embeddable YouTube or Vimeo links. Videos play inside EARNIZI. The browser reports playback progress and end-of-video events to authenticated server routes; database RPCs cap counted progress by elapsed server time, require an end event and the configured watch time, enforce daily limits and one active session, and credit the wallet idempotently.

## Payment provider

PayLinky is the selected payment provider. Its documentation URL was supplied as `https://paylinky.vercel.app/llms-full.txt`, but this environment cannot access that host, so the checkout API and signed-webhook contract have not been verified or implemented. Payment checkout therefore remains deliberately disabled; the app never simulates a successful payment. Once the official details are available, implement and verify the server-side checkout and signature-checked webhook before enabling checkout. Never put secret keys in `NEXT_PUBLIC_*` variables.

`.env.example` names the PayLinky selection and server-only integration variables, but setting credentials alone does not enable payments.

## Commands

- `npm run dev` — Next.js development server
- `npm run typecheck` — TypeScript check
- `npm run build` — production build
- `npm start` — serve the production build
