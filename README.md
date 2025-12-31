# travel-app

## Micro Frontends

This app uses **Module Federation** to compose independent micro frontends (MFs). The shell (host) at `localhost:2000` lazy-loads remote MFs from separate ports:
- `mf-pretrip` (3001)
- `mf-itinerary` (3002)  
- `mf-duringtrip` (3003)

### Run Locally

```bash
cd client
pnpm dev              # Runs all MFs + shell concurrently
pnpm dev:shell        # Shell only
pnpm dev:pretrip      # Pre-trip MF only
```

### Deploy

1. **Build all MFs** (remotes first, then shell):
   ```bash
   cd client
   pnpm build:zephyr   # Builds with type generation
   ```

2. **Deploy remotes** to their CDN/hosting (each MF's `dist/` folder)

3. **Update shell config** with production remote URLs in `client/shell/rsbuild.config.ts`

4. **Deploy shell** (references the remote URLs)

Each MF can be deployed independently without affecting others.

