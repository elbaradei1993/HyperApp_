# HyperApp

HyperApp is a React, TypeScript, and Vite community-safety application backed by Supabase.

## Local development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Run `npm ci` and then `npm run dev`.

## Hosted Hyper AI

Text and voice requests are sent through authenticated Supabase Edge Functions:

- `hyper-ai` calls Cloudflare Workers AI for conversational replies.
- `hyper-tts` calls Cloudflare Workers AI for hosted text-to-speech.

Provider credentials belong in Supabase Edge Function secrets. Never place Cloudflare tokens,
Supabase service-role keys, or other private credentials in `VITE_` variables or repository files.

## Automatic Cloudflare Pages deployment

Connect this repository to Cloudflare Pages using its GitHub integration with these settings:

- Production branch: `main`
- Framework preset: React (Vite)
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under the Pages project's production and
preview environment variables. Add optional public API variables from `.env.example` only when
the associated feature is enabled.

After the Git integration is enabled, every push to `main` triggers a production deployment and
pull requests receive isolated preview deployments.
