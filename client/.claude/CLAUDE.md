# Claude Instructions — TripWeave Client

This file is loaded automatically for all Claude sessions in the `client/` directory.

## Browser Automation: Tool Selection

Two tools are available. Use the right one for the task:

| Task | Tool |
|------|------|
| Driving user flows (create trip, fill forms, navigate pages) | `playwright-cli` skill |
| Inspecting an already-open page (debug DOM, check console/network) | Chrome DevTools MCP |

**Never use Chrome DevTools MCP to drive a user flow.** Even though it has `click` and `fill` tools, it attaches to a live tab with unknown state. Use `playwright-cli` for any task that involves acting in the browser as a user would.

### playwright-cli setup

```bash
# From client/ — persistent profile (default, retains auth)
playwright-cli open --config=.playwright/cli.config.json

# From client/ — fresh profile (clean slate)
playwright-cli open --config=.playwright/cli.fresh.config.json
```

Artifacts (screenshots, snapshots) go to `../../.playwright-cli/` relative to `client/`.
Full reference: [`PLAYWRIGHT_CLI_GUIDE.md`](../PLAYWRIGHT_CLI_GUIDE.md) at the repo root.

### Chrome DevTools MCP setup

1. `list_pages` → confirm the target tab is open
2. `select_page` → attach to it
3. Use `take_snapshot`, `list_console_messages`, `list_network_requests`, `evaluate_script` to observe

If no server is running, ask the user before attempting to start one.
