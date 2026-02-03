# Chrome DevTools MCP Debugging Guide

## What is this?

The Chrome DevTools MCP server lets Claude Code (or other AI assistants) **see and interact with your running browser**. Instead of you copy-pasting console errors or describing what's on screen, Claude can:

- 📸 Take screenshots to see the actual UI
- 🔍 Read console logs and errors directly
- 🌐 Inspect network requests and responses
- 🧪 Execute JavaScript in the browser context

**Without MCP:** "I see a blank screen" → You screenshot, paste, describe the error
**With MCP:** Claude runs `devtools_screenshot` and `devtools_console_log` → sees everything instantly

## Setup (5 minutes)

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

## Available Commands

| Command | When to use |
|---------|-------------|
| `pnpm dev` | Normal development (no browser auto-launch) |
| `pnpm dev:browser` | Development with MCP debugging (persistent profile) |
| `pnpm dev:browser:fresh` | Testing fresh user experience (temporary profile) |

## Troubleshooting

**MCP not connecting?**
- Ensure Chrome Beta is running (started via `pnpm dev:browser`)
- Check that port 9222 is available: `lsof -i :9222`
- Restart Claude Code to reload MCP servers

**"Chrome Beta not found" error?**
- Install Chrome Beta from the link above
- macOS only for now (the script uses macOS paths)

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
