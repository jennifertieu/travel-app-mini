# Deployment Guide — TripWeave

Deploy the frontend to Zephyr Cloud with `tripweave.app` as the production domain, backend on Render, database on Supabase.

## Architecture

```
tripweave.app (production)
        │
        ▼
Frontend (Zephyr Cloud)                 Backend (Render)              Database
+----------------------------+          +--------------------+        +----------+
| shell (host app)           |────────▶ | Express API        |──────▶ | Supabase |
|   ├── mf_pretrip           |          | (Node.js)          |        | (Postgres)|
|   ├── mf_itinerary         |          +--------------------+        +----------+
|   └── mf_duringtrip        |          trip-weave-jlop.onrender.com
+----------------------------+
```

- **Frontend**: 4 Module Federation micro-frontends on Zephyr Cloud's edge
- **Backend**: Express API on Render
- **Database**: Supabase (cloud-hosted)
- **Domain**: `tripweave.app` (Porkbun) → Cloudflare DNS → Zephyr environment

## Current State

The app is already deploying to Zephyr under the `lgt-champs` org. Per-build URLs look like:
```
https://thomas-nguyen-368-shell-travel-app-lgt-champs-59141bba9-ze.zephyrcloud.app
```

These change every build. The goal is to get a stable `tripweave.app` URL for production (needed for Google OAuth whitelisting).

---

## Step-by-Step: Get tripweave.app Working

### Step 1: Create a Free Cloudflare Account (~2 min)

Zephyr requires a cloud provider integration for custom domains. Cloudflare is the easiest and free.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up
2. Click **Add a Site** → enter `tripweave.app`
3. Select the **Free** plan
4. Cloudflare will scan existing DNS records — confirm them
5. Cloudflare gives you two nameservers (e.g. `aria.ns.cloudflare.com`, `duke.ns.cloudflare.com`) — copy these

### Step 2: Point Porkbun to Cloudflare (~2 min + propagation wait)

1. Log in to [Porkbun](https://porkbun.com)
2. Find `tripweave.app` → **Manage** → **Nameservers**
3. Replace the default Porkbun nameservers with the two Cloudflare nameservers
4. Save

Propagation takes 5 min to 24 hours. Cloudflare emails you when it's active. You can continue with the next steps while waiting.

### Step 3: Add DNS Records in Cloudflare (~1 min)

Once Cloudflare is managing your domain:

1. Go to Cloudflare → `tripweave.app` → **DNS** → **Records**
2. Add a wildcard CNAME:

   | Type  | Name | Content              | Proxy Status | TTL  |
   |-------|------|----------------------|--------------|------|
   | CNAME | `*`  | `ze.zephyrcloud.app` | Proxied ✅   | Auto |

This routes Zephyr's edge URLs through your domain. The per-build URLs (`*.ze.tripweave.app`) won't have SSL on the free plan — that's fine, you don't need them. Only the production environment URL matters.

### Step 4: Get Cloudflare Credentials (~3 min)

**Zone ID:**
1. Cloudflare → `tripweave.app` → **Overview** tab
2. Right sidebar → **API** section → copy **Zone ID**

**API Token:**
1. Near Zone ID, click **Get your API token**
2. **Create Custom Token** → **Get started**
3. Name: `zephyr-tripweave`
4. Permissions:

   | Resource | Type               | Permission |
   |----------|--------------------|------------|
   | Account  | Worker KV Storage  | Edit       |
   | Account  | Worker Scripts     | Edit       |
   | Account  | Cloudflare Pages   | Edit       |
   | Zone     | Worker Routes      | Edit       |

5. Zone Resources → **Include** → **Specific zone** → `tripweave.app`
6. **Continue to summary** → **Create Token** → copy it

### Step 5: Connect Cloudflare in Zephyr Dashboard (~2 min)

1. Go to [app.zephyr-cloud.io](https://app.zephyr-cloud.io)
2. Select your org → **Settings** → **Deployment Integration**
3. Under **Available**, find **Cloudflare** → **Add integration**
4. Fill in:

   | Field                      | Value                          |
   |----------------------------|--------------------------------|
   | Integration Name           | `tripweave-cf`                 |
   | Integration Display Name   | `TripWeave Cloudflare`         |
   | Delimiter                  | `-`                            |
   | API Token                  | (from step 4)                  |
   | Zone ID                    | (from step 4)                  |
   | Cloudflare Project Name    | `tripweave`                    |
   | Set as Default             | ✅ Yes                         |

5. Save

This auto-creates Workers, KV namespaces, and routes on your Cloudflare account.

### Step 6: Redeploy to Zephyr (~2 min)

```bash
cd client
pnpm build:zephyr
```

Your builds now deploy through the Cloudflare integration. The per-build URLs will be on `*.zephyrcloud.app` still (since the `*.ze.tripweave.app` wildcard SSL isn't set up — and you don't need it).

### Step 7: Create a Production Tag in Zephyr Dashboard (~2 min)

1. Go to Zephyr Dashboard → your org → `travel-app` project → `shell` application
2. Go to **Tags** → create a new tag called `production`
3. Set condition: **branch is `main`**
4. Save

This tag always points to the latest build from `main`.

### Step 8: Create a Production Environment with Custom Domain (~3 min)

1. In the same `shell` application → **Environments**
2. Create environment: `production`
3. Link it to the `production` tag
4. Add custom domain: `tripweave.app`
5. Save

### Step 9: Add DNS Record for tripweave.app (~1 min)

Back in Cloudflare DNS, add a record pointing `tripweave.app` to the Zephyr environment. The exact record depends on what Zephyr tells you when you add the custom domain — it'll likely be a CNAME pointing to a Zephyr edge URL. Follow whatever Zephyr shows in the environment settings.

### Step 10: Update Google OAuth (~1 min)

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → your OAuth client:

1. Add to **Authorized JavaScript origins**: `https://tripweave.app`
2. Add to **Authorized redirect URIs**: `https://tripweave.app` (and any callback paths your auth flow uses)
3. Save

### Step 11: Update Supabase Auth Settings (~1 min)

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → Authentication → URL Configuration:

1. Set **Site URL** to `https://tripweave.app`
2. Add `https://tripweave.app/**` to **Redirect URLs**
3. Save

---

## How Zephyr Works in This Project

### Plugin Configuration

Each Rsbuild config includes Zephyr conditionally via `USE_ZEPHYR`:

```typescript
import { withZephyr } from "zephyr-rsbuild-plugin";
const useZephyr = process.env.USE_ZEPHYR === "true";

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({ /* ... */ }),
    ...(useZephyr ? [withZephyr()] : []),
  ],
});
```

- `pnpm dev` → Zephyr off, remotes from localhost
- `pnpm build:zephyr` → Zephyr on, deploys to edge

### Build Order

Remotes must build before the shell:
```
mf_pretrip → mf_itinerary → mf_duringtrip → shell
```

The `build` script in `client/package.json` handles this.

### Zephyr Dependencies (Shell)

`client/shell/package.json` maps remote aliases to package names:
```json
{
  "zephyr:dependencies": {
    "pretrip_main": "mf_pretrip@*",
    "itinerary_main": "mf_itinerary@*",
    "duringtrip_main": "mf_duringtrip@*"
  }
}
```

### Config Reference

| App         | Package Name    | MF Name         | Port (dev) |
|-------------|-----------------|-----------------|------------|
| Shell       | `shell`         | `shell`         | 2000       |
| Pre-trip    | `mf_pretrip`    | `mf_pretrip`    | 3001       |
| Itinerary   | `mf_itinerary`  | `mf_itinerary`  | 3002       |
| During Trip | `mf_duringtrip` | `mf_duringtrip` | 3003       |

---

## Deploying

### Deploy Everything

```bash
cd client
pnpm build:zephyr
```

### Deploy a Single MFE

```bash
cd client
USE_ZEPHYR=true pnpm --filter=mf_pretrip build
USE_ZEPHYR=true pnpm --filter=shell build   # rebuild shell to pick up new remote
```

### Deploy to Production Environment

```bash
cd client
ZE_ENV=production USE_ZEPHYR=true pnpm build
```

Requires a tag with condition `environment is production` and an environment linked to it.

---

## Backend (Render)

Deployed at `https://trip-weave-jlop.onrender.com`.

### Environment Variables

```env
PORT=5001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
GOOGLE_MAPS_PLATFORM_API_KEY=your_google_maps_key
NODE_ENV=production
```

### Setup

1. Create a **Web Service** on [render.com](https://render.com)
2. Connect GitHub repo
3. Root directory: `server`
4. Build: `pnpm install && pnpm build`
5. Start: `pnpm start`
6. Set env vars above
7. Auto-deploys on push to `main`

### CORS

Update `server/src/app.ts` for production:
```typescript
app.use(cors({
  origin: [
    "https://tripweave.app",
    /\.zephyrcloud\.app$/,
    "http://localhost:2000",
    "http://localhost:3001",
  ],
}));
```

---

## CI/CD with GitHub Actions (Optional)

### Generate Server Token

Zephyr Dashboard → Org Settings → **Server Tokens** → Generate

### GitHub Secrets

| Secret              | Value                    |
|---------------------|--------------------------|
| `ZEPHYR_AUTH_TOKEN` | Zephyr server token      |
| `ZE_USER_EMAIL`     | Deploying user's email   |

### Workflow: `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['client/**']

env:
  ZE_SERVER_TOKEN: ${{ secrets.ZEPHYR_AUTH_TOKEN }}
  ZE_USER_EMAIL: ${{ secrets.ZE_USER_EMAIL }}
  USE_ZEPHYR: "true"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
        working-directory: client
      - run: pnpm build
        working-directory: client
```

---

## Troubleshooting

### Remote Resolution Errors (ZE40003)
Remote hasn't been built yet. Fix: `cd client && pnpm build:zephyr` (builds all remotes then shell).

### Authentication Errors
Token expired. Fix: `rm -rf ~/.zephyr` then rebuild.

### CORS Errors
Check backend allows `https://tripweave.app` and frontend `.env.local` points to production backend URL.

### Cloudflare Case Sensitivity
Keep all package names lowercase (they already are: `shell`, `mf_pretrip`, `mf_itinerary`, `mf_duringtrip`).

### Debug Logging
```bash
cd client
DEBUG='zephyr:*' USE_ZEPHYR=true pnpm build
```

---

## Quick Reference

| Task                      | Command                                                      |
|---------------------------|--------------------------------------------------------------|
| Local dev                 | `pnpm dev` (from root)                                      |
| Deploy frontend           | `cd client && pnpm build:zephyr`                             |
| Deploy single MFE         | `cd client && USE_ZEPHYR=true pnpm --filter=mf_pretrip build` |
| Re-authenticate Zephyr    | `rm -rf ~/.zephyr` then rebuild                              |
| Debug build               | `cd client && DEBUG='zephyr:*' USE_ZEPHYR=true pnpm build`  |

## Dashboards

| Service    | URL                                                    |
|------------|--------------------------------------------------------|
| Zephyr     | [app.zephyr-cloud.io](https://app.zephyr-cloud.io)    |
| Render     | [dashboard.render.com](https://dashboard.render.com)   |
| Supabase   | [supabase.com/dashboard](https://supabase.com/dashboard)|
| Cloudflare | [dash.cloudflare.com](https://dash.cloudflare.com)     |
| Google OAuth | [console.cloud.google.com](https://console.cloud.google.com) |
