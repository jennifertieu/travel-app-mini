# Travel App Deployment Guide

This guide covers deploying your Module Federation travel app using Zephyr Cloud for the frontend micro frontends and various options for the backend API.

## 🏗️ Architecture Overview

- **Frontend**: 4 Module Federation micro frontends deployed via Zephyr Cloud
- **Backend**: Node.js/Express API (deploy separately)
- **Database**: Supabase (already cloud-hosted)

## 📋 Prerequisites

- Node.js 18+
- pnpm (recommended)
- Git repository (GitHub, GitLab, etc.)
- Zephyr Cloud account
- Backend hosting platform account (Railway, Render, Vercel, etc.)

## 🚀 Frontend Deployment (Zephyr Cloud)

### Step 1: Install Zephyr Plugin

```bash
cd client
pnpm add zephyr-webpack-plugin
```

### Step 2: Verify Configuration Updates

The following files have been updated with Zephyr integration:

- `client/shell/rsbuild.config.ts` - Shell app (host)
- `client/mf-pretrip/rsbuild.config.ts` - Pre-trip micro frontend
- `client/mf-itinerary/rsbuild.config.ts` - Itinerary micro frontend  
- `client/mf-duringtrip/rsbuild.config.ts` - During trip micro frontend

Each config now includes:
```typescript
import { withZephyr } from "zephyr-webpack-plugin";

export default defineConfig(withZephyr()({
  // ... existing configuration
}));
```

### Step 3: Individual Package.json Files

Each micro frontend now has its own `package.json` for Zephyr deployment tracking:

- `client/shell/package.json`
- `client/mf-pretrip/package.json`
- `client/mf-itinerary/package.json`
- `client/mf-duringtrip/package.json`

### Step 4: Deploy to Zephyr Cloud

#### First-time Setup

1. **Commit and push your changes**:
   ```bash
   git add .
   git commit -m "Add Zephyr Cloud configuration"
   git push origin main
   ```

2. **Deploy all micro frontends**:
   ```bash
   cd client
   pnpm build
   ```

   On first run, Zephyr will:
   - Open a browser for account creation/login
   - Authenticate the CLI
   - Deploy all micro frontends automatically
   - Provide deployment URLs

#### Expected Output

After successful deployment, you'll see URLs like:
```
✅ Shell App: https://shell-abc123.zephyr-cloud.io
✅ Pre-trip MF: https://pretrip-def456.zephyr-cloud.io  
✅ Itinerary MF: https://itinerary-ghi789.zephyr-cloud.io
✅ During Trip MF: https://duringtrip-jkl012.zephyr-cloud.io
```

### Step 5: Update Production Remote URLs

After deployment, update the shell app's remote URLs for production. You can either:

**Option A: Environment-based configuration (Recommended)**
Create a production environment file or use build-time variables to switch between dev and prod URLs.

**Option B: Manual update**
Update the shell app's remote URLs:

```typescript
// client/shell/rsbuild.config.ts
remotes: {
  // Production URLs from Zephyr deployment (replace with your actual URLs)
  pretrip_main: "mf_pretrip@https://pretrip-def456.zephyr-cloud.io/remoteEntry.js",
  itinerary_main: "mf_itinerary@https://itinerary-ghi789.zephyr-cloud.io/remoteEntry.js", 
  duringtrip_main: "mf_duringtrip@https://duringtrip-jkl012.zephyr-cloud.io/remoteEntry.js",
},
```

Then redeploy the shell:
```bash
cd client/shell
pnpm build
```

## 🖥️ Backend Deployment Options

### Option 1: Railway (Recommended)

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Connect your repository**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your travel-app repository

3. **Configure build settings**:
   - Root directory: `server`
   - Build command: `pnpm build`
   - Start command: `pnpm start`

4. **Set environment variables**:
   ```env
   PORT=5001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   NODE_ENV=production
   ```

5. **Deploy**: Railway will auto-deploy on git push

### Option 2: Render

1. **Create Render account** at [render.com](https://render.com)

2. **Create new Web Service**:
   - Connect your GitHub repository
   - Root directory: `server`
   - Build command: `pnpm install && pnpm build`
   - Start command: `pnpm start`

3. **Set environment variables** (same as Railway)

### Option 3: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy from server directory**:
   ```bash
   cd server
   vercel
   ```

3. **Configure vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "dist/app.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "dist/app.js"
       }
     ]
   }
   ```

## 🔧 Environment Configuration

### Frontend Environment Variables

Update your frontend environment files with production URLs:

**client/shell/.env.local** (for production):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

**Note**: You may also need to update environment files for other micro frontends if they make direct API calls.

### CORS Configuration

Update your backend CORS settings for production:

```typescript
// server/src/app.ts
app.use(cors({
  origin: [
    'https://shell-abc123.zephyr-cloud.io', // Your shell app URL
    'http://localhost:2000', // Keep for local development
  ],
  credentials: true
}));
```

## 🔄 Continuous Deployment

### Automatic Deployments

Both Zephyr Cloud and most backend platforms support automatic deployments:

1. **Zephyr Cloud**: Automatically deploys on `pnpm build` (integrates with your build process)
2. **Railway/Render**: Auto-deploy on git push to main branch
3. **Vercel**: Auto-deploy on git push

### Deployment Workflow

Recommended deployment order:
1. Deploy backend first (Railway/Render/Vercel)
2. Update frontend environment variables with backend URL
3. Deploy micro frontends with Zephyr Cloud
4. Update shell app with production remote URLs
5. Final shell app deployment

### Manual Deployments

For manual deployments:

```bash
# Frontend
cd client
pnpm build

# Backend (if using Vercel CLI)
cd server
vercel --prod
```

## 🧪 Testing Deployment

### Pre-deployment Checklist

- [ ] All environment variables set correctly
- [ ] CORS configured for production URLs
- [ ] Database migrations applied
- [ ] API endpoints accessible
- [ ] All micro frontends build successfully

### Post-deployment Testing

1. **Test shell app**: Visit your Zephyr shell URL
2. **Test navigation**: Ensure all micro frontend routes work
3. **Test API calls**: Check browser network tab for successful API calls
4. **Test authentication**: Verify Supabase auth works in production
5. **Test real-time features**: Ensure WebSocket connections work

## 🔍 Monitoring & Debugging

### Zephyr Cloud Dashboard

- Visit [zephyr-cloud.io](https://zephyr-cloud.io) dashboard
- Monitor deployment status
- View build logs
- Manage rollbacks

### Backend Monitoring

Most platforms provide:
- Application logs
- Performance metrics
- Error tracking
- Uptime monitoring

### Common Issues

1. **CORS errors**: Update backend CORS configuration
2. **Environment variables**: Verify all required vars are set
3. **Module Federation errors**: Check browser console for loading issues
4. **API connection**: Verify backend URL in frontend env vars

## 📈 Scaling Considerations

### Frontend Scaling

- Zephyr Cloud provides global CDN automatically
- Each micro frontend scales independently
- Consider implementing lazy loading for better performance

### Backend Scaling

- Most platforms offer auto-scaling
- Consider database connection pooling
- Implement caching for frequently accessed data
- Monitor API response times

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit secrets to git
2. **CORS**: Restrict to specific domains in production
3. **API Keys**: Use environment-specific keys
4. **HTTPS**: Ensure all connections use HTTPS
5. **Database**: Use connection strings with SSL

## 📚 Additional Resources

- [Zephyr Cloud Documentation](https://docs.zephyr-cloud.io)
- [Module Federation Deployment Guide](https://module-federation.io/guide/deployment/)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## 🆘 Troubleshooting

### Common Deployment Issues

1. **Build failures**: Check Node.js version compatibility
2. **Module not found**: Verify all dependencies are in package.json
3. **Environment variables**: Double-check variable names and values
4. **Network errors**: Verify API URLs and CORS settings

### Getting Help

- Check platform-specific documentation
- Review build logs for specific error messages
- Test locally with production environment variables
- Use browser developer tools to debug frontend issues

---

**Next Steps**: After successful deployment, consider setting up monitoring, analytics, and automated testing for your production application.