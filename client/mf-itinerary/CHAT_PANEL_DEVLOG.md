# Chat Panel — Dev Log

Tracks all changes made to the `mf-itinerary` micro-frontend to build the Itinerary Assistant chat UI, and later the backend hookup.

## Table of Contents

- [Overview](#overview)
- [Phase 1: Chat Panel UI Shell](#phase-1-chat-panel-ui-shell)
  - [New Types](#new-types)
  - [New Hook: useChat](#new-hook-usechat)
  - [New Components](#new-components)
  - [App.tsx Layout Changes](#apptsx-layout-changes)
  - [globals.css Fix](#globalscss-fix)
- [Phase 2: Textarea UX Improvements](#phase-2-textarea-ux-improvements)
- [Phase 3: Backend Hookup](#phase-3-backend-hookup-coming-soon)

---

## Overview

The goal is to add a collapsible left-side chat panel to the itinerary view, wired to the backend `itineraryChatAgent` (SSE streaming). The agent lets users modify an existing itinerary through natural language (e.g. "move the Eiffel Tower to Day 2").

**Backend agent:** `server/src/utils/itineraryChatAgent.ts`
**Backend endpoints:** `POST /itinerary/:tripId/chat`, `POST /itinerary/:tripId/chat/confirm`, `POST /itinerary/:tripId/chat/reject`

Layout when chat is open:
```
[ChatPanel w-80] [ItineraryPanel flex-1] [MapPanel flex-1]
```
Layout when chat is closed (default):
```
[ItineraryPanel w-1/2] [MapPanel w-1/2]
```

---

## Phase 1: Chat Panel UI Shell

Static UI with mock messages — no backend connection yet.

### New Types

**File:** `src/types.ts`

Added `ChatRole` and `ChatMessage` alongside existing itinerary types:

```typescript
export type ChatRole = "agent" | "user";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
}
```

---

### New Hook: useChat

**File:** `src/hooks/useChat.ts`

Owns all chat state. Initialized with mock messages so the UI is immediately demonstrable without a backend.

| Export | Type | Purpose |
|--------|------|---------|
| `messages` | `ChatMessage[]` | Full message history |
| `isChatOpen` | `boolean` | Whether panel is visible |
| `toggleChat` | `() => void` | Open/close the panel |
| `inputValue` | `string` | Controlled textarea value |
| `setInputValue` | `Dispatch` | Update textarea |
| `handleSend` | `() => void` | Appends user message (stub — no API yet) |

`handleSend` uses `crypto.randomUUID()` (native Web Crypto API) for message IDs — no extra dependency needed.

---

### New Components

#### `src/components/chat/MessageBubble.tsx`

Renders a single message row. Agent messages align left, user messages align right.

| Role | Icon | Bubble color | Corner |
|------|------|-------------|--------|
| `agent` | `Bot` | `bg-teal-600/10` | `rounded-tl-sm` |
| `user` | `User` | `bg-muted` | `rounded-tr-sm` |

The `rounded-tl-sm` / `rounded-tr-sm` trick creates a chat "tail" effect using just border-radius — no pseudo-elements or SVGs needed.

---

#### `src/components/chat/ChatToggleButton.tsx`

Absolutely positioned teal pill button at the left edge of the itinerary panel (`left-0 top-1/2`).

- **Closed:** shows `MessageSquare` icon + "Chat" label
- **Open:** shows `ChevronLeft` icon only
- Styled as `rounded-r-full` — a half-pill shape that appears to "emerge" from the left edge

---

#### `src/components/chat/ChatPanel.tsx`

Full chat panel with three sections in a `flex flex-col h-full` layout:

| Section | Classes | Details |
|---------|---------|---------|
| Header | `flex-shrink-0 border-b` | `Sparkles` icon + "Itinerary Assistant" title |
| Message area | `flex-1 overflow-y-auto` | Scrollable history; empty state with `MessageSquare` icon |
| Input area | `flex-shrink-0 border-t` | Auto-grow textarea + Send button |

**Auto-scroll:** `useRef` + `useEffect` on `messages` sets `scrollTop = scrollHeight` — scoped to the chat container, not the page.

---

### App.tsx Layout Changes

**File:** `src/App.tsx`

Added imports: `ChatPanel`, `ChatToggleButton`, `useChat`, `cn`.

Replaced the two-panel flex block with a three-panel conditional layout:

```tsx
<div className="flex flex-1 min-h-0">
  {isChatOpen && (
    <div className="w-80 flex-shrink-0">
      <ChatPanel ... />
    </div>
  )}
  <div className={cn(isChatOpen ? "flex-1" : "w-1/2", "overflow-y-auto relative")}>
    <ChatToggleButton isOpen={isChatOpen} onClick={toggleChat} />
    <ItineraryPanel data={itineraryData} />
  </div>
  <div className={isChatOpen ? "flex-1" : "w-1/2"}>
    <MapPanel ... />
  </div>
</div>
```

When chat opens, `ItineraryPanel` and `MapPanel` switch from `w-1/2` to `flex-1`, sharing the remaining space equally. `MapPanel` already has a `ResizeObserver` that calls `map.invalidateSize()`, so the Leaflet map redraws correctly.

---

### globals.css Fix

**File:** `src/globals.css`

Added the `h-full` height chain so the app fills the full viewport:

```css
html,
body,
#root {
  height: 100%;
}
```

Without this, `h-full` on the root `App` div resolves to `auto` (content height only) because `html` and `#root` had no explicit height. This only shows up when running the MFE in isolation at port 3002 — in the shell, the shell's own CSS already sets this globally.

---

## Phase 2: Textarea UX Improvements

### Auto-grow on typing

`useEffect` on `inputValue` resets height to `"auto"` first (so the element can shrink), then sets it to `scrollHeight`. The reset-before-expand is critical — without it, the element can't shrink when text is deleted.

### Manual resize by dragging

Changed `resize-none` → `resize-y` on the textarea. Added an `isManuallyResized` ref (not state — no re-render needed) that gets set to `true` when the user's `mousedown` lands in the bottom-right 16×16px resize grip area. While `true`, the auto-grow `useEffect` skips. When the input clears after send, the flag resets so auto-grow resumes.

Key design decision: `useRef` instead of `useState` for the flag — toggling it causes zero re-renders since it's purely a side-effect guard.

Removed `max-h-36` cap (user controls height now). Added `min-h-[2.25rem]` (one line of `text-sm`) so the textarea can't be dragged to zero.

---

## Phase 2b: Panel Drag-to-Resize

Replaced the textarea's native `resize-y` handle with a custom drag divider between the message history and input area, so both sections resize together.

### Layout change

- Message history: switched from `flex-1` to explicit `height` px via `historyHeight` state (default 300px). `flex-shrink-0` keeps it from collapsing.
- Drag handle: a slim `h-3` bar with `cursor-row-resize` and a 3-dot inline SVG indicator. `GripHorizontal` from lucide was avoided — it caused a Module Federation factory error with Rsbuild.
- Input area: `flex-1` + `flex flex-col min-h-0` so it takes all remaining panel space. Inner container uses `items-stretch` so the textarea fills it vertically.
- Textarea: removed `rows`, `max-h-48`, and auto-grow effect. Now uses `flex-1` to fill the container. `overflow-y-auto` re-added so text scrolls when it overflows.
- Send button: `self-end` so it anchors to the bottom regardless of textarea height.

### Drag implementation

`startDrag` / `moveDrag` / `endDrag` callbacks share logic between mouse and touch:
- `onMouseDown` + `onTouchStart` on the handle both call `startDrag(clientY)`
- `mousemove` + `touchmove` on `document` call `moveDrag` — attaching to `document` prevents the drag from breaking when the cursor moves faster than the DOM updates
- `touchmove` registered with `{ passive: false }` so `e.preventDefault()` can block page scroll during drag
- Height is capped at `panelRef.offsetHeight - 100` (always leaves room for the input) and floored at `MIN_HISTORY_HEIGHT = 80px`

### UA stylesheet gotcha

Browsers apply `overflow: auto` to `<textarea>` by default in their UA stylesheet, which hides the native resize handle. Removing the Tailwind `overflow-y-auto` class was not enough — `overflow: hidden` had to be explicitly set to override it. (This is now moot since we don't use the native handle at all.)

---

## Phase 3: Backend Hookup _(coming soon)_

### Planned changes

- **`useChat.ts`** — Replace `handleSend` stub with a real `fetch` to `POST /itinerary/:tripId/chat` using SSE (`EventSource` or `fetch` with `ReadableStream`)
- **Streaming** — Consume `event: text` SSE events to append agent message content incrementally (typewriter effect)
- **`event: changes`** — Show a diff preview (which activities moved/swapped) after agent responds
- **Confirm/Reject bar** — New UI element above the input area with "Apply changes" / "Discard" buttons wired to `POST .../confirm` and `POST .../reject`
- **Session management** — The backend uses `${tripId}:${userId}` keyed in-memory sessions with 30-min TTL; no client-side session state needed
- **Loading state** — Disable input + show a typing indicator (`...` animation) while SSE stream is open
- **Error handling** — Show inline error bubble in the chat if the agent returns an error event
