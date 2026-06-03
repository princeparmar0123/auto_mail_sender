# GitHub Pages deployment

This app deploys as a **static SPA** to GitHub Pages. Supabase env vars are baked into the client at **build time** via `VITE_*` variables.

## One-time setup

1. **GitHub repository secrets** (Settings → Secrets and variables → Actions):

   | Secret | Description |
   |--------|-------------|
   | `VITE_SUPABASE_URL` | Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |

2. **Enable Pages** (Settings → Pages → Build and deployment → Source: **GitHub Actions**).

3. Push to `main` (or run **Deploy to GitHub Pages** manually under Actions).

Your site will be at:

`https://<username>.github.io/auto_mail_sender/`

**Important:** Use the full URL including the repo name.  
`https://<username>.github.io/` alone will show GitHub’s **404 File not found** (that URL is not your app).

## Local development

```bash
cp .env.example .env
# Edit .env with your Supabase values

npm install
npm run dev
```

## Production-like build (same as CI)

```bash
VITE_BASE_PATH=/auto_mail_sender/ npm run build:pages
npx serve dist/client
```

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Client + CI secret | Supabase API URL in browser |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client + CI secret | Supabase public key |
| `VITE_BASE_PATH` | Optional CI variable | Asset/router base (default: `/repo-name/`) |
| `SUPABASE_*` | Local `.env` only | Server functions when running `vite dev` |
| `SUPABASE_SERVICE_ROLE_KEY` | Local / Nitro deploy | Server-only; never add to GitHub Pages build |

## Important: server features on static hosting

GitHub Pages serves **static files only**. Features that use `createServerFn` (SMTP test/send, campaign batch send) need a **Node/edge runtime** (e.g. Cloudflare Workers with `NITRO_PRESET=cloudflare-module`).

On GitHub Pages, the UI, auth, and Supabase CRUD still work; email server actions will fail until you deploy a full-stack host for the API.

To deploy with Nitro (Cloudflare, Node, etc.):

```bash
NITRO_PRESET=cloudflare-module npm run build
```

Use your host’s env configuration for `SUPABASE_*` and server-only secrets.
