# Elixir Retail — Platform App

SvelteKit + Supabase platform/operator dashboard. Hosted on Netlify.

## Local development

1. Copy `.env.example` to `.env` and fill in Supabase values.
2. `npm install`
3. `npm run dev` (port 3003)

## Host on Netlify

The project already uses `@sveltejs/adapter-netlify` and `netlify.toml`.

### 1. Prepare the repo

- Push this project to GitHub/GitLab/Bitbucket.
- Confirm `npm run build` succeeds locally with your env vars available.

### 2. Create the Netlify site

1. Open [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Connect the repository.
3. Build settings (usually auto-detected from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
4. Deploy the site once (it may fail until env vars are set — that is fine).

### 3. Set environment variables

In Netlify → **Site configuration** → **Environment variables**, add:

| Variable                          | Notes                                                     |
| --------------------------------- | --------------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`             | Supabase project URL                                      |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key (used by the app)         |
| `PUBLIC_SUPABASE_ANON_KEY`        | Same anon key if you keep it for compatibility            |
| `SUPABASE_SERVICE_ROLE_KEY`       | Service-role key for Auth user provisioning (keep secret) |

Apply them to **Production** (and Preview if you want PR deploys).

### 4. Allow the Netlify domain in Supabase

In Supabase → **Authentication** → **URL configuration**:

- Add your Netlify URL (for example `https://your-site.netlify.app`) to **Site URL** and **Redirect URLs**.

### 5. Redeploy

Trigger a new deploy from Netlify (**Deploys** → **Trigger deploy** → **Deploy site**).

### 6. Smoke-check

- `/login` loads
- Platform, organisation, and store logins still route correctly
- Creating org/store users still works (needs `SUPABASE_SERVICE_ROLE_KEY`)

### Optional

- Attach a custom domain in Netlify → **Domain management**, then add that domain to Supabase Auth URLs too.
- For preview branches, add `*.netlify.app` / specific preview URLs to Supabase redirect allow-lists if auth is exercised there.
