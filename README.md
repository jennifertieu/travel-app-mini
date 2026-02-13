# Travel App

A modern travel planning application built with **Module Federation** micro frontends and a Node.js/Express backend.

## 🏗️ Architecture

### Frontend (Micro Frontends)
- **Shell App** (`localhost:2000`) - Main host application with authentication and routing
- **Pre-Trip MF** (`localhost:3001`) - Trip planning and idea collection
- **Itinerary MF** (`localhost:3002`) - Trip itinerary management  
- **During Trip MF** (`localhost:3003`) - Live trip features and maps

### Backend
- **Express API** (`localhost:5001`) - REST API with Supabase integration
- **Supabase** - Database, authentication, and real-time features

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **pnpm** (recommended) or npm
- **Git**

### 1. Clone and Install

```bash
git clone <repository-url>
cd travel-app

# Install all dependencies (root, client, server)
pnpm install
```

### 2. Environment Setup

#### Backend Environment
```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your configuration:
```env
PORT=5001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

#### Frontend Environment
```bash
cd client/shell
cp .env.local.example .env.local
```

Edit `client/shell/.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:5001
```

**Note**: For production, set `VITE_BACKEND_URL` to your deployed backend URL.

**Additional Environment Files**: 
- Copy `client/mf-pretrip/.env.local.example` to `client/mf-pretrip/.env.local` if using AI features
- Copy `client/mf-duringtrip/.env.local.example` to `client/mf-duringtrip/.env.local` if using maps

### 3. Start Development Servers

**Important**: Always start the backend first, then the frontend services.

#### Step 1: Start Backend API
```bash
cd server
pnpm dev
```
Wait for the server to start (you'll see "Server running on port 5001").

#### Step 2: Start Frontend Services
In a new terminal:
```bash
cd client  
pnpm dev
```

This will start all micro frontends concurrently:
- Pre-Trip MF: http://localhost:3001
- Itinerary MF: http://localhost:3002  
- During Trip MF: http://localhost:3003
- Shell App: http://localhost:2000

#### Alternative: Start Frontend Services Individually
If you prefer more control or are debugging specific services:
```bash
# Terminal 2: Pre-trip MF
cd client && pnpm dev:pretrip    # Port 3001

# Terminal 3: Itinerary MF  
cd client && pnpm dev:itinerary  # Port 3002

# Terminal 4: During Trip MF
cd client && pnpm dev:duringtrip # Port 3003

# Terminal 5: Shell App (start this last)
cd client && pnpm dev:shell      # Port 2000
```

**Note**: The shell app requires all micro frontends to be running first.

### 4. Access the Application

- **Main App**: http://localhost:2000
- **API**: http://localhost:5001
- **Individual MFs** (for development):
  - Pre-Trip: http://localhost:3001
  - Itinerary: http://localhost:3002
  - During Trip: http://localhost:3003

## 🛠️ Development

### Project Structure
```
travel-app/
├── client/                 # Frontend micro frontends
│   ├── shell/             # Main host application
│   ├── mf-pretrip/        # Pre-trip planning MF
│   ├── mf-itinerary/      # Itinerary management MF
│   ├── mf-duringtrip/     # During trip features MF
│   ├── shared-types/      # Shared TypeScript types
│   └── package.json       # Workspace configuration
├── server/                # Backend API
│   ├── src/              # Express application
│   └── package.json      # Server dependencies
└── docs/                 # Documentation
```

### Environment Variables

The app uses environment variables for configuration:

**Backend** (`server/.env`):
- `PORT` - Server port (default: 5001)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

**Frontend** (`.env.local` files):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_BACKEND_URL` - Backend API URL (dev: `http://localhost:5001`, prod: your deployed URL)
- `VITE_MAPBOX_TOKEN` - Mapbox token for maps (during-trip MF only)

### Available Scripts

#### Root Level
```bash
pnpm install              # Install all dependencies
```

**Note**: We recommend running server and client separately for better development experience.

#### Client (Frontend)
```bash
cd client
pnpm dev                         # Run all MFs + shell concurrently

pnpm dev:shell                   # Shell only (requires MFs running)
pnpm dev:pretrip                 # Pre-trip MF only
pnpm dev:itinerary               # Itinerary MF only
pnpm dev:duringtrip              # During trip MF only

pnpm build                       # Build all for production
pnpm lint                        # Lint all frontend code
pnpm format                      # Format code with Prettier

# MCP browser debugging + auto-launch Chrome Beta (macOS, untested on Windows)
pnpm dev:browser                 # saves logins
pnpm dev:browser:fresh           # temporary profile

pnpm dev:shell:browser           # Shell (port 2000)
pnpm dev:pretrip:browser         # Pre-trip (port 3001)
pnpm dev:itinerary:browser       # Itinerary (port 3002)
pnpm dev:duringtrip:browser      # During-trip (port 3003)
# ^Add :fresh for temporary profile (e.g., pnpm dev:pretrip:browser:fresh)
```

#### Server (Backend)
```bash
cd server
pnpm dev                 # Start with hot reload
pnpm build               # Build for production
pnpm start               # Start production server
```

### Key Technologies

#### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Module Federation** - Micro frontend architecture
- **Rsbuild** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Tanstack Router** - Client-side routing
- **Supabase Client** - Database and auth

#### Backend  
- **Node.js + Express** - Server framework
- **TypeScript** - Type safety
- **Supabase** - Database and authentication
- **OpenAI API** - AI features
- **Google Maps API** - Location services

## 🔧 Troubleshooting

### Common Issues

#### "Factory is undefined" Error
This is a Module Federation React sharing issue:
1. Ensure all MF services are running
2. Check that ports match the configuration in `client/shell/rsbuild.config.ts`
3. Clear browser cache and restart dev servers

#### Port Conflicts
If you see `EADDRINUSE` errors:
1. Kill existing processes: `pkill -f "rsbuild"`
2. Check port availability: `lsof -i :3001` (replace with specific port)
3. Restart the dev servers

#### Module Federation Type Errors
The app disables DTS generation to avoid build issues. If you see type-related errors:
1. Ensure `DISABLE_DTS=true MF_DISABLE_DTS=true` is in the dev scripts
2. Clear federation cache: `rm -rf client/*/node_modules/.federation`
3. Restart dev servers

#### Authentication Issues
1. Verify Supabase environment variables are set correctly
2. Check browser console for auth-related errors
3. Ensure Supabase project has Google OAuth configured

### Development Tips

1. **Always start backend first** - Frontend depends on API endpoints and will show errors if backend isn't running
2. **Use separate terminals** - Easier to monitor logs and restart individual services
3. **Use pnpm** - Faster installs and better workspace support
4. **Check browser console** - Module Federation errors appear there
5. **Individual MF testing** - Each MF can run standalone for isolated development
6. **Hot reload** - All services support hot reload for fast development
7. **Kill processes cleanly** - Use `Ctrl+C` in each terminal rather than killing all at once

## 🚢 Deployment

### Frontend (Micro Frontends)
Each micro frontend can be deployed independently:

1. **Build all MFs**:
   ```bash
   cd client
   pnpm build
   ```

2. **Deploy each MF** to your hosting platform (Netlify, Vercel, etc.)

3. **Update shell configuration** with production URLs in `client/shell/rsbuild.config.ts`

4. **Deploy shell** last (it references the remote MF URLs)

### Backend
```bash
cd server
pnpm build
pnpm start
```

Deploy to your preferred platform (Railway, Render, AWS, etc.)

## 🤖🔧 Real-time AI Browser Debugging with MCP

This project ships **two browser MCP servers** that let your AI assistant (Claude Code) directly see and interact with your running app — no more copy-pasting errors or describing what's on screen.

| Server | What it does | Best for |
|--------|-------------|----------|
| **Chrome DevTools MCP** | Connects to your running Chrome Beta | Inspecting console errors, network requests, performance traces |
| **Playwright MCP** | Launches and drives its own browser | Clicking buttons, filling forms, testing user flows end-to-end |

### Quick setup (macOS)

```bash
# 1. Install Chrome Beta: https://www.google.com/chrome/beta/
# 2. Copy config files
cp .mcp.json.example .mcp.json
cp .claude/settings.local.json.example .claude/settings.local.json
```

**Chrome DevTools MCP** — attach to your browser:
```bash
cd client && pnpm dev:browser        # persistent profile (keeps logins)
cd client && pnpm dev:browser:fresh  # temporary profile (fresh session)
```

**Playwright MCP** — no extra launch step needed:
```bash
cd client && pnpm dev    # Playwright launches its own browser when Claude needs it
```

Both can run simultaneously without conflict.

See the full guides:
- [CHROME_DEVTOOLS_MCP_GUIDE.md](./CHROME_DEVTOOLS_MCP_GUIDE.md) — setup, Windows instructions, troubleshooting
- [PLAYWRIGHT_MCP_GUIDE.md](./PLAYWRIGHT_MCP_GUIDE.md) — setup, capabilities comparison, artifacts

## 📚 Additional Resources

- [Chrome DevTools MCP Guide](./CHROME_DEVTOOLS_MCP_GUIDE.md) - AI-assisted browser inspection
- [Playwright MCP Guide](./PLAYWRIGHT_MCP_GUIDE.md) - AI-driven browser interaction and testing
- [Module Federation Documentation](https://module-federation.io/)
- [Rsbuild Documentation](https://rsbuild.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Documentation](./docs/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `pnpm dev`
4. Submit a pull request

For questions or issues, please check the troubleshooting section above or create an issue.

