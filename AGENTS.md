# Retail SaaS — Platform App (POC)

Web-based platform/operator dashboard for a multi-tenant retail SaaS.
This repo is the PLATFORM app only. The store POS app (Flutter) is separate.

## Stack
- SvelteKit (TypeScript, Svelte 5 runes) on Netlify
- Supabase: Postgres + RLS, Auth
- Tailwind CSS v4 + shadcn-svelte, themed via CSS variables in src/app.css

## Scope for POC
- Merchant/org onboarding, subscription & billing views, user access, audit log
- Cross-device responsive web UI (mobile → desktop)
- NO offline support in this app. Do not add sync/outbox machinery.

## Non-negotiables
- Schema changes only via supabase/migrations
- SAP-style DB naming (see .cursor/rules/database.mdc)
- Never use raw color values in components — only theme tokens