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

### Redis (Optional - Production)
For multi-instance deployments, consider Redis for shared caching:

```bash
pnpm add ioredis  # or: pnpm add redis
```

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

**Environment**: `REDIS_URL=redis://localhost:6379`