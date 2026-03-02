# Playwright CLI Guide

## Table of Contents

- [What is playwright-cli?](#what-is-playwright-cli)
- [Why CLI over MCP?](#why-cli-over-mcp)
- [When to use playwright-cli vs Chrome DevTools MCP](#when-to-use-playwright-cli-vs-chrome-devtools-mcp)
- [TripWeave Setup](#tripweave-setup)
  - [Installation](#installation-one-time-global)
  - [First-time auth setup](#first-time-auth-setup-one-time-per-machine)
  - [Every session](#every-session-claude-does-this-automatically)
- [Quick Start](#quick-start)
- [Common Commands](#common-commands)
- [Snapshots vs Screenshots](#snapshots-vs-screenshots)
- [Video Recording](#video-recording)
- [Artifacts Directory](#artifacts-directory)
- [Troubleshooting](#troubleshooting)

---

## What is playwright-cli?

`playwright-cli` is a command-line browser automation tool that lets Claude Code (or you, manually) **launch and control a browser** to interact with the running app. Instead of describing what's on screen, Claude can click buttons, fill forms, navigate pages, take snapshots, and record sessions — all via Bash commands.

**Without playwright-cli:** "Go to the pretrip page, add an idea, and tell me if it saved" → You do it manually, paste the result back
**With playwright-cli:** Claude opens the browser, navigates, clicks, reads the snapshot → end-to-end verification without switching windows

## Why CLI over MCP?

This project previously used the Playwright **MCP** server (`@playwright/mcp`). We switched to **playwright-cli** for the following reasons:

1. **Config reproducibility** — CLI uses project config files (`client/.playwright/cli.config.json`), so every teammate and every Claude session gets the same browser, same profile path, and the same flags. MCP has no equivalent concept.

2. **No rogue browser processes** — Playwright MCP manages its own persistent browser process independently of Claude Code. This means it can leave orphaned Chrome instances behind and bypasses any Bash-level tooling (env vars, launch scripts, port checks). CLI sessions are explicit and short-lived.

3. **Predictable artifacts** — CLI output lands in `.playwright-cli/` (gitignored, project root). MCP scattered files into `.playwright-mcp/` with no config control over naming or location.

4. **Easier to reproduce** — Any session started with `--config=.playwright/cli.config.json` is reproducible. Teammates can run the same commands locally and get identical behavior.

## When to use playwright-cli vs Chrome DevTools MCP

Both tools are active in this project. Use the one that fits your debugging scenario:

| Capability | playwright-cli | Chrome DevTools MCP |
|---|---|---|
| **Browser lifecycle** | Launches its own browser | Connects to your running Chrome Beta |
| **Setup required** | None — just run `playwright-cli open` | Must run `pnpm dev:browser` first (port 9222) |
| **Click / fill / navigate** | Full interaction support | Basic click/fill support |
| **Accessibility snapshots** | Built-in (preferred over screenshots) | Snapshot via a11y tree |
| **Screenshots** | Page, element, or full-page | Page or element |
| **Video recording** | Yes (`video-start` / `video-stop`) | No |
| **Console logs** | `playwright-cli console` | `list_console_messages` with severity filter |
| **Network requests** | `playwright-cli network` | Full inspect + request body |
| **JavaScript execution** | `playwright-cli eval "..."` | `evaluate_script` |
| **Performance tracing** | Not available | Full Chrome DevTools Performance panel |
| **Emulation (viewport, geo)** | Resize only | Full emulation controls |
| **Multi-tab support** | `tab-new`, `tab-select`, `tab-list` | Select from open pages |
| **Best for** | Testing flows, verifying UI changes, filling forms, recording | Debugging network issues, performance, inspecting live state |

**Rule of thumb:**
- Use **playwright-cli** when Claude needs to *do things* in the browser (test a flow, verify a fix, fill a form, record a session)
- Use **Chrome DevTools MCP** when Claude needs to *inspect things* (console errors, network requests, performance traces)

See [CHROME_DEVTOOLS_MCP_GUIDE.md](CHROME_DEVTOOLS_MCP_GUIDE.md) for full Chrome DevTools setup.

## TripWeave Setup

### Installation (one-time, global)

```bash
sudo npm install -g @playwright/cli@latest
```

### First-time auth setup (one-time per machine)

playwright-cli uses a saved auth state file (`client/.playwright/auth.json`) so you stay signed in across sessions. This file is gitignored — each teammate does this once:

```bash
cd client

# 1. Open browser using the same profile as pnpm dev:browser (already signed in)
playwright-cli open --browser=chrome-beta --profile=$HOME/.tripweave-chrome-debug --headed http://localhost:2000/pretrip

# 2. Once the browser opens and the app loads, save auth state and close
playwright-cli state-save .playwright/auth.json
playwright-cli close
```

> **Why this profile?** `pnpm dev:browser` uses `~/.tripweave-chrome-debug`. Pointing playwright-cli at the same directory means you're already signed into Google — no re-authentication needed.

### Every session (Claude does this automatically)

```bash
cd client
playwright-cli open --browser=chrome-beta     # headless by default
playwright-cli state-load .playwright/auth.json
playwright-cli goto http://localhost:2000/pretrip
# ... interact with the app ...
playwright-cli close
```

### Fresh profile (clean slate)

```bash
playwright-cli open --browser=chrome-beta --headed
playwright-cli goto http://localhost:2000/pretrip
# Sign in manually, then proceed
```

### Start your dev server first

```bash
cd client && pnpm dev    # playwright-cli needs the dev server running
```

Unlike Chrome DevTools MCP, you do **not** need `pnpm dev:browser`. Playwright CLI manages its own browser.

### Notes
- The `profile` key in `cli.config.json` is **not supported** — always pass `--profile` as a CLI flag
- `playwright-cli open` does not start an interactive REPL — it opens the browser and returns to the shell. Run follow-up commands as separate `playwright-cli` calls.
- The `[active]` attribute in a11y snapshots does not always reflect visual selected state — take a screenshot to verify when in doubt

## Quick Start

```bash
# 1. Open browser (persistent Chrome Beta — TripWeave default)
playwright-cli open --config=client/.playwright/cli.config.json

# 2. Navigate to a page
playwright-cli goto http://localhost:2000/pretrip

# 3. Snapshot the current state (get element refs)
playwright-cli snapshot

# 4. Interact using refs from the snapshot
playwright-cli click e15
playwright-cli fill e3 "Tokyo"
playwright-cli press Enter

# 5. Verify the result
playwright-cli snapshot

# 6. Close the browser
playwright-cli close
```

## Common Commands

### Navigation

```bash
playwright-cli goto https://localhost:2000
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

### Interaction

```bash
playwright-cli click e3
playwright-cli dblclick e7
playwright-cli fill e5 "user@example.com"
playwright-cli type "search query"          # types into focused element
playwright-cli press Enter
playwright-cli press ArrowDown
playwright-cli hover e4
playwright-cli select e9 "option-value"
playwright-cli check e12
playwright-cli uncheck e12
playwright-cli drag e2 e8
playwright-cli upload ./document.pdf
playwright-cli dialog-accept
playwright-cli dialog-dismiss
```

### Snapshots & Screenshots

```bash
# Accessibility snapshot (preferred — returns element refs for interaction)
playwright-cli snapshot
playwright-cli snapshot --filename=../../.playwright-cli/after-click.yaml

# Screenshot (use when verifying visual layout)
playwright-cli screenshot --filename=../../.playwright-cli/page.png
playwright-cli screenshot e5 --filename=../../.playwright-cli/button.png  # element only
```

> Always prefix output paths with `../../.playwright-cli/` — CLI commands run from `client/`, so relative paths default there.

### Tabs

```bash
playwright-cli tab-new https://localhost:2000/itinerary
playwright-cli tab-list
playwright-cli tab-select 0
playwright-cli tab-close
```

### DevTools

```bash
playwright-cli console           # read all console messages
playwright-cli console warning   # filter by level (log, info, warning, error)
playwright-cli network           # list network requests
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" e5
```

### Storage

```bash
playwright-cli state-save auth.json       # save auth cookies/storage
playwright-cli state-load auth.json       # restore saved state

playwright-cli cookie-list
playwright-cli cookie-get session_id
playwright-cli localstorage-list
playwright-cli localstorage-get theme
```

## Snapshots vs Screenshots

playwright-cli has two ways to "see" the page:

- **`playwright-cli snapshot`** (preferred) — Returns an accessibility tree as text. Faster, more reliable, and gives Claude element references (`e1`, `e2`, …) it can use for subsequent click/fill/hover commands. Always try this first.
- **`playwright-cli screenshot`** — Returns an actual image. Use when you need to verify visual layout, colors, or spacing that the a11y tree can't capture.

## Video Recording

Record a browser session as a WebM video — useful for demos, documentation, or creating a visual artifact of a bug or verified fix.

```bash
# 1. Start the browser
playwright-cli open --config=client/.playwright/cli.config.json

# 2. Start recording (before any actions you want captured)
playwright-cli video-start

# 3. Perform actions
playwright-cli goto http://localhost:2000/pretrip
playwright-cli snapshot
playwright-cli click e4
playwright-cli fill e7 "Tokyo food tour"
playwright-cli press Enter
playwright-cli snapshot

# 4. Stop and save the video
playwright-cli video-stop ../../.playwright-cli/recordings/pretrip-add-idea.webm

# 5. Close the browser
playwright-cli close
```

**Output format:** WebM (VP8/VP9 codec) — playable in Chrome, Firefox, and most video players.

**Save location:** Always use `../../.playwright-cli/recordings/` so artifacts land in the gitignored `.playwright-cli/` directory at the project root.

### Tracing vs Video

| | Video | Tracing |
|---|---|---|
| **Output** | `.webm` file | Trace file (viewable in Playwright Trace Viewer) |
| **Shows** | Visual recording | DOM snapshots, network, console, actions |
| **Use case** | Demos, documentation, bug reports | Deep debugging, step-by-step analysis |
| **Size** | Larger | Smaller |

To use tracing instead:

```bash
playwright-cli tracing-start
# ... actions ...
playwright-cli tracing-stop ../../.playwright-cli/traces/session.zip
```

Open trace files with: `npx playwright show-trace .playwright-cli/traces/session.zip`

## Artifacts Directory

playwright-cli saves screenshots, snapshots, videos, and traces to:

```
.playwright-cli/
├── page-2026-02-14T19-22-42-679Z.yml      # Auto-named snapshots
├── page-2026-02-14T19-22-55-012Z.png      # Auto-named screenshots
├── recordings/
│   └── pretrip-add-idea.webm              # Video recordings
└── traces/
    └── session.zip                        # Trace files
```

This directory lives at the project root and is gitignored. Files are timestamped by default so they don't overwrite each other.

## Troubleshooting

**"Browser not installed" error?**
- The config targets Chrome Beta. Install it from [google.com/chrome/beta](https://www.google.com/chrome/beta/) or change `--browser` in the config file.

**Snapshot returns empty / wrong page?**
- Make sure `pnpm dev` is running first — playwright-cli launches a browser but doesn't start the dev server.
- Confirm you used `--config` on `open` — without it you may be on the wrong browser/profile.

**Element refs not matching after navigation?**
- Refs (`e1`, `e2`, …) are scoped to the current snapshot. Always take a fresh `playwright-cli snapshot` after navigating or after the DOM changes.

**Artifacts going to the wrong place?**
- Commands run from `client/`, so relative paths resolve there. Always prefix with `../../.playwright-cli/` to land in the project root artifact dir.

**Video file is empty or missing?**
- Ensure `video-stop` is called before `close`. Closing the browser before stopping the recording will discard the video.

**Session already exists?**
- Run `playwright-cli kill-all` to forcefully terminate any lingering browser processes, then start fresh.
