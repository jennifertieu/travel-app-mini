# Playwright MCP Guide

## What is this?

The Playwright MCP server lets Claude Code **launch and control a browser** to interact with your running app. Unlike the Chrome DevTools MCP (which *observes* an existing browser), Playwright MCP *owns* the browser — it can click buttons, fill forms, navigate pages, and take snapshots, all autonomously.

**Without MCP:** "Click the Add Trip button and tell me what happens" → You do it manually, describe the result
**With MCP:** Claude launches a browser, clicks the button itself, reads the result → end-to-end verification

## When to use Playwright MCP vs Chrome DevTools MCP 🤔❓

Both are configured in `.mcp.json`. Use whichever fits your debugging scenario:

| Capability | Playwright MCP | Chrome DevTools MCP |
|------------|---------------|-------------------|
| **Browser lifecycle** | Launches its own browser | Connects to your running Chrome Beta |
| **Setup required** | None beyond `.mcp.json` | Must run `pnpm dev:browser` first |
| **Click / fill / navigate** | Full interaction support | Basic click/fill support |
| **Form filling** | Multi-field form fill, drag & drop | Single element fill |
| **Screenshots** | Page, element, or full-page scroll | Page or element |
| **Accessibility snapshots** | Built-in (preferred over screenshots) | Snapshot via a11y tree |
| **Console logs** | Read with severity filtering | Read all logs |
| **Network requests** | List with static resource filtering | List + inspect individual requests |
| **JavaScript execution** | Eval on page or element | Eval on page |
| **Performance tracing** | Not available | Full Chrome DevTools Performance panel |
| **Multi-tab support** | Create, close, switch tabs | Select from open pages |
| **File upload** | Supported | Supported |
| **Emulation (viewport, geo, CPU)** | Not built-in | Full emulation controls |
| **Best for** | Testing flows, verifying UI changes, filling forms | Debugging network issues, performance, inspecting state |

**Rule of thumb:**
- Use **Playwright** when Claude needs to *do things* in the browser (test a flow, verify a fix, fill a form)
- Use **Chrome DevTools** when Claude needs to *inspect things* (console errors, network requests, performance traces)

## Setup — 2 minutes

### 1. Copy the MCP config (if you haven't already)

```bash
cp .mcp.json.example .mcp.json
```

Two Playwright servers are already configured in `.mcp.json`:

```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@playwright/mcp", "--browser", "chrome-beta",
             "--user-data-dir", "~/.tripweave-playwright-debug"]
  },
  "playwright-fresh": {
    "command": "npx",
    "args": ["-y", "@playwright/mcp", "--browser", "chrome-beta"]
  }
}
```

| Server | Profile | Use case |
|--------|---------|----------|
| **`playwright`** | Persistent (`~/.tripweave-playwright-debug`) | Keeps Google sign-in and cookies across sessions |
| **`playwright-fresh`** | Ephemeral (new profile each launch) | Clean slate for testing first-time user flows |

This mirrors the `pnpm dev:browser` vs `pnpm dev:browser:fresh` pattern used by Chrome DevTools MCP.

> **Note:** Both are configured to use Chrome Beta (`--browser chrome-beta`). If you don't have Chrome Beta installed, you can change this to `"chrome"` or `"chromium"`, or remove the `--browser` flag entirely to use the bundled Chromium.

### 2. Enable the MCP server in Claude Code

Add `"playwright"` to your `.claude/settings.local.json` (already included if you copied from the example):

```json
{
  "enabledMcpjsonServers": [
    "chrome-devtools",
    "playwright"
  ]
}
```

This enables the **persistent profile** server, which keeps your Google sign-in and cookies across sessions.

### Need a fresh profile?

If you're testing first-time user flows (onboarding, signup, etc.), add `"playwright-fresh"` to your `enabledMcpjsonServers`:

```json
{
  "enabledMcpjsonServers": [
    "chrome-devtools",
    "playwright",
    "playwright-fresh"
  ]
}
```

Then tell Claude which one to use:

> "Use the fresh playwright browser to test the signup flow"

### 3. Start your dev server

```bash
cd client
pnpm dev         # Standard dev — Playwright launches its own browser
```

Unlike Chrome DevTools MCP, you do **not** need `pnpm dev:browser`. Playwright manages its own browser instance.

### 4. Verify MCP connection

In Claude Code, type `/mcp` to see connected servers. You should see `playwright` listed.

## Usage

Once connected, Claude can interact with the browser. Some examples:

### Navigate and verify
> "Open localhost:2000 and take a snapshot of the page"

### Test a user flow
> "Go to the pretrip page, add a new idea, and verify it appears in the list"

### Fill forms
> "Fill in the trip creation form with a trip to Tokyo for next week"

### Debug visually
> "Take a screenshot of the itinerary page — does the layout look broken?"

### Check for errors
> "Navigate to /duringtrip and show me any console errors"

## Key Concepts

### Snapshots vs Screenshots

Playwright MCP has two ways to "see" the page:

- **`browser_snapshot`** (preferred) — Returns an accessibility tree as text. Faster, more reliable, and gives Claude element references (`ref`) it can use to click/type. Always try this first.
- **`browser_take_screenshot`** — Returns an actual image. Use when you need to verify visual layout, colors, or spacing.

### Element References

Snapshots return elements with `ref` attributes. Claude uses these to interact:

```
snapshot → finds button[ref="e42"] "Add Trip"
click    → clicks ref="e42"
```

This is more reliable than CSS selectors because it uses the live accessibility tree.

### Tab Management

Playwright can manage multiple tabs:

```
browser_tabs(action: "list")     → see all tabs
browser_tabs(action: "new")      → open new tab
browser_tabs(action: "select")   → switch to tab
browser_tabs(action: "close")    → close tab
```

## Artifacts Directory

Playwright MCP saves screenshots, console logs, and other output to:

```
.playwright-mcp/
├── page-2026-02-13T14-02-04-253Z.png      # Screenshots
├── console-2026-02-13T14-01-56-166Z.log   # Console message dumps
└── ...
```

This directory is created automatically in the project root. Files are timestamped so they don't overwrite each other. You can open these directly from your IDE to see what Claude saw during a session.

> **Tip:** This folder is gitignored. If it isn't, add `.playwright-mcp/` to your `.gitignore`.

## Troubleshooting

**"Browser not installed" error?**
- Run the install command that the error message suggests, or change `--browser` in `.mcp.json` to a browser you have installed

**Playwright browser conflicts with Chrome DevTools MCP?**
- They use separate browser instances — both can run simultaneously without conflict
- Chrome DevTools connects to port 9222; Playwright manages its own process

**Slow first launch?**
- First run downloads the browser binary via `npx`. Subsequent runs are fast.

**Page not loading?**
- Make sure `pnpm dev` is running first — Playwright launches a browser but doesn't start your dev server

## How it works

```
+--------------+      +--------------------+      +-------------------------+
|  Claude Code |----->|    playwright      |----->|  Chrome Beta            |
|              |      |    (persistent)    |      |  ~/.tripweave-          |
+--------------+      +--------------------+      |  playwright-debug       |
       |                                          +-------------------------+
       |              +--------------------+      +-------------------------+
       +------------->| playwright-fresh   |----->|  Chrome Beta            |
                      |    (ephemeral)     |      |  (temp profile)         |
                      +--------------------+      +-------------------------+

    stdio             Launches + controls          Playwright API
```

1. Claude Code starts the selected Playwright MCP server via `npx @playwright/mcp`
2. Playwright launches Chrome Beta with either a persistent or ephemeral profile
3. Claude sends commands (navigate, click, snapshot) through the MCP protocol
4. Playwright executes them and returns results to Claude
5. **Persistent** (`playwright`): sign-ins, cookies, and history survive across sessions
6. **Ephemeral** (`playwright-fresh`): clean browser state every launch
