# Chrome DevTools MCP Debugging Guide

## What is this?

The Chrome DevTools MCP server lets Claude Code (or other AI assistants) **see and interact with your running browser**. Instead of you copy-pasting console errors or describing what's on screen, Claude can:

- 📸 Take screenshots to see the actual UI
- 🔍 Read console logs and errors directly
- 🌐 Inspect network requests and responses
- 🧪 Execute JavaScript in the browser context

**Without MCP:** "I see a blank screen" → You screenshot, paste, describe the error
**With MCP:** Claude runs `devtools_screenshot` and `devtools_console_log` → sees everything instantly

## Setup for MacOS (details below for Windows) - 5 minutes
### 1. Install Chrome Beta

Download from: https://www.google.com/chrome/beta/

**Why Chrome Beta instead of regular Chrome?**

Using a separate browser keeps your debugging workflow isolated from your personal browsing:
- Your personal Chrome stays untouched (bookmarks, extensions, logins)
- No risk of accidentally exposing personal sessions to the debugging port
- Clean separation between "work" and "personal" browser contexts
- Chrome Beta runs as a completely separate app with its own profile

You *could* configure regular Chrome with a custom profile and remote debugging flags, but using Chrome Beta is cleaner and avoids accidentally mixing contexts.

### 2. Copy the MCP config

```bash
cp .mcp.json.example .mcp.json
```

This tells Claude Code how to connect to the Chrome DevTools MCP server.

### 3. Enable the MCP server in Claude Code

**Option A:** If you don't have a `.claude/settings.local.json` file yet:
```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

**Option B:** If you already have a `.claude/settings.local.json`, add this to your existing config:
```json
{
  "enabledMcpjsonServers": [
    "chrome-devtools"
  ]
}
```

This pre-enables the MCP server so Claude Code doesn't prompt you on first use.

### 4. Start the dev server with browser

```bash
cd client
pnpm dev:browser
```

This runs all the MFEs and opens Chrome Beta with remote debugging enabled on port 9222.

### 5. Verify MCP connection

In Claude Code, type `/mcp` to see connected servers. You should see `chrome-devtools` listed.

## Usage

Once set up, Claude can use DevTools tools automatically when debugging. You can also ask directly:

- "Take a screenshot of the current page"
- "Show me any console errors"
- "What network requests failed?"

## Chrome DevTools MCP vs playwright-cli

This project uses two browser automation tools with different purposes:

| | Chrome DevTools MCP | playwright-cli |
|---|---|---|
| **Approach** | **Observes** your running browser | **Drives** its own browser |
| **Setup** | Needs `pnpm dev:browser` (Chrome Beta on port 9222) | Just `playwright-cli open --config=...` |
| **Strengths** | Console logs, network inspection, performance tracing, device emulation | Clicking, form filling, navigating, video recording, end-to-end flow testing |
| **Weaknesses** | Limited interaction (basic click/fill only) | No performance tracing or device emulation |
| **Best for** | Debugging runtime issues (errors, failed requests, slow rendering) | Verifying UI changes, testing user flows, filling forms, recording sessions |

**Rule of thumb:** Use **Chrome DevTools MCP** when Claude needs to *inspect* the app. Use **playwright-cli** when Claude needs to *interact* with the app.

Both can run simultaneously — they use separate browser instances and don't conflict. See [PLAYWRIGHT_CLI_GUIDE.md](PLAYWRIGHT_CLI_GUIDE.md) for full playwright-cli setup and command reference.

## Available Commands

| Command | When to use |
|---------|-------------|
| `pnpm dev` | Normal development (no browser auto-launch) |
| `pnpm dev:browser` | All MFEs + MCP debugging (persistent profile) |
| `pnpm dev:browser:fresh` | All MFEs + MCP debugging (temporary profile) |

### Individual MFE Debugging

Debug a single micro-frontend with Chrome Beta:

| Command | Port | Description |
|---------|------|-------------|
| `pnpm dev:shell:browser` | 2000 | Shell app only |
| `pnpm dev:pretrip:browser` | 3001 | Pre-trip MFE only |
| `pnpm dev:itinerary:browser` | 3002 | Itinerary MFE only |
| `pnpm dev:duringtrip:browser` | 3003 | During-trip MFE only |

Add `:fresh` suffix for a temporary profile (e.g., `pnpm dev:pretrip:browser:fresh`).

## Setup for Windows (untested)

The `pnpm dev:browser` command only works on macOS. Windows users have two options:

### Option A: Use WSL (Windows Subsystem for Linux)

If you're running the dev server in WSL, the existing bash script should work. You'll need Chrome Beta installed in WSL or accessible from WSL.

### Option B: Native Windows with batch file

**1. Complete steps 1-3 above** (install Chrome Beta, copy config files)

**2. Create a batch file** at `client/scripts/launch-chrome-beta.bat`:
```batch
@echo off
"C:\Program Files\Google\Chrome Beta\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%USERPROFILE%\.tripweave-chrome-debug" ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-default-apps ^
  http://localhost:2000
```

**3. Run manually in two terminals:**
```bash
# Terminal 1: Start dev servers
cd client && pnpm dev

# Terminal 2: Once servers are ready, launch Chrome Beta
.\scripts\launch-chrome-beta.bat
```

**Note:** The Chrome Beta path may vary. Check your installation location if the script fails.

## Troubleshooting

**MCP not connecting?**
- Ensure Chrome Beta is running (started via `pnpm dev:browser` or the batch file)
- Check that port 9222 is available: `lsof -i :9222` (macOS) or `netstat -ano | findstr :9222` (Windows)
- Restart Claude Code to reload MCP servers

**"Chrome Beta not found" error?**
- Install Chrome Beta from the link above
- macOS: The script expects Chrome Beta at `/Applications/Google Chrome Beta.app/`
- Windows: Update the batch file path if Chrome Beta is installed elsewhere

## How it works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│  MCP Server      │────▶│  Chrome Beta    │
│                 │     │  (port bridge)   │     │  (port 9222)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
     stdio                localhost:9222          DevTools Protocol
```

1. `pnpm dev:browser` launches Chrome Beta with `--remote-debugging-port=9222`
2. The MCP server connects to that port
3. Claude Code communicates with the MCP server to access DevTools capabilities
