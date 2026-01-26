## Node API
Deployed on [Render](https://render.com/) at: `https://trip-weave-jlop.onrender.com`

## Caching Strategy

### In-Memory Caching
- **Context data**: 5-minute TTL
- **Nearby places**: 15-minute TTL
- **Place details**: Additive caching with smart refresh
  - Never deletes entries (additive)
  - Refreshes top 3 candidates if cache >2 hours old
  - Clears when trips end

### Redis (Required for Production)
**IMPORTANT**: The in-memory rate limiting store (`rateLimitDuringTrip.ts`) will NOT work in production with multiple instances or server restarts. 

For production deployments, you MUST use either:
- **Redis** (recommended) for shared rate limiting and caching
- **Database-backed store** for rate limiting

**Redis Setup:**
```bash
pnpm add ioredis  # or: pnpm add redis
```

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

**Environment**: `REDIS_URL=redis://localhost:6379`

**Note**: The current in-memory implementation is for development only. Production deployments require a shared cache/rate limit store.