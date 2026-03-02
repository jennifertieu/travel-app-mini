# Playwright CLI Guide

## Table of Contents

- [What is playwright-cli?](#what-is-playwright-cli)
- [Why CLI over MCP?](#why-cli-over-mcp)
- [When to use playwright-cli vs Chrome DevTools MCP](#when-to-use-playwright-cli-vs-chrome-devtools-mcp)
- [TripWeave Setup](#tripweave-setup)

---

## 🤖 What is playwright-cli?

`playwright-cli` is a command-line browser automation tool that lets Claude Code **launch and control a browser** to interact with the running app. Instead of you manually testing a change and describing what you saw, Claude can click buttons, fill forms, navigate pages, and take snapshots — all autonomously.

❌ **Without playwright-cli:** "Go to the pretrip page, add an idea, and tell me if it saved" → You do it manually, paste the result back

✅ **With playwright-cli:** Claude opens the browser, navigates, clicks, reads the result → end-to-end verification without switching windows

You don't need to know the commands — Claude handles those. This guide explains when and why the tool is used.

## 🔄 Why CLI over MCP?

This project previously used the Playwright **MCP** server (`@playwright/mcp`). We switched to **playwright-cli** for the following reasons:

1. **🔧 Config reproducibility** — CLI uses project config files (`client/.playwright/cli.config.json`), so every teammate and every Claude session gets the same browser, same profile path, and the same flags. MCP has no equivalent concept.

2. **👻 No rogue browser processes** — Playwright MCP manages its own persistent browser process independently of Claude Code, leaving orphaned Chrome instances behind. CLI sessions are explicit and short-lived.

3. **📁 Predictable artifacts** — CLI output lands in `.playwright-cli/` (gitignored, project root). MCP scattered files into `.playwright-mcp/` with no config control.

4. **♻️ Reproducibility** — Any session started with `--config=.playwright/cli.config.json` is reproducible. Teammates can run the same commands locally and get identical behavior.

## 🧭 When to use playwright-cli vs Chrome DevTools MCP

Both tools are active in this project. Use the one that fits the scenario:

| | playwright-cli | Chrome DevTools MCP |
|---|---|---|
| **Best for** | Testing flows, verifying UI changes, filling forms, recording | Debugging network issues, performance, inspecting live state |
| **Browser lifecycle** | Launches its own browser | Connects to your running Chrome Beta |
| **Setup required** | None — just run `playwright-cli open` | Must run `pnpm dev:browser` first (port 9222) |
| **Video recording** | ✅ Yes | ❌ No |
| **Performance tracing** | ❌ Not available | ✅ Full Chrome DevTools Performance panel |

**Rule of thumb:**
- 🎬 **playwright-cli** when Claude needs to *do things* in the browser (test a flow, verify a fix, fill a form)
- 🔍 **Chrome DevTools MCP** when Claude needs to *inspect things* (console errors, network requests, performance traces)

See [CHROME_DEVTOOLS_MCP_GUIDE.md](CHROME_DEVTOOLS_MCP_GUIDE.md) for Chrome DevTools setup.

## 🛠️ TripWeave Setup

### Installation (one-time, global)

```bash
sudo npm install -g @playwright/cli@latest
```

### 🔑 First-time auth setup (one-time per machine)

playwright-cli uses a saved auth state file (`client/.playwright/auth.json`) so Claude stays signed in across sessions. This file is gitignored — each teammate does this once:

```bash
cd client

# 1. Open browser using the same profile as pnpm dev:browser (already signed in)
playwright-cli open --browser=chrome-beta --profile=$HOME/.tripweave-chrome-debug --headed http://localhost:2000/pretrip

# 2. Once the browser opens and the app loads, save auth state and close
playwright-cli state-save .playwright/auth.json
playwright-cli close
```

> **Why this profile?** `pnpm dev:browser` uses `~/.tripweave-chrome-debug`. Pointing playwright-cli at the same directory means you're already signed into Google — no re-authentication needed.

After this, Claude will automatically load the saved auth state at the start of each session.
