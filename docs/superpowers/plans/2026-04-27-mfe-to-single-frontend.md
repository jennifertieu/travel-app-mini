# MFE → Single Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate four Module Federation packages (shell + 3 MFEs) into one unified React app under `client/src/`, eliminating inter-process remote loading and `window` event coupling.

**Architecture:** A single Rsbuild app at port 3000 with TanStack Router routes (`/pretrip`, `/itinerary`, `/duringtrip`), React Query for server state, and a `ModalContext` replacing the `window.dispatchEvent("openTripModal")` event bus. Feature code lives in `src/features/<name>/` during migration and gets promoted to `src/hooks/` and `src/components/` in Phase 5 consolidation.

**Tech Stack:** React 19, TanStack Router, React Query 5, Rsbuild, Vitest + Testing Library, Playwright, pnpm, TypeScript, Tailwind CSS

---

## Phase 1 — Foundation

### Task 1: Create branch and directory skeleton

**Files:**
- Create: `client/src/features/pretrip/` (empty dir marker)
- Create: `client/src/features/itinerary/` (empty dir marker)
- Create: `client/src/features/duringtrip/` (empty dir marker)
- Create: `client/src/components/` (empty dir marker)
- Create: `client/src/hooks/` (empty dir marker)
- Create: `client/src/lib/` (empty dir marker)
- Create: `client/src/contexts/` (empty dir marker)
- Create: `client/src/types/` (empty dir marker)
- Create: `client/tests/e2e/` (empty dir marker)

- [ ] **Step 1: Create the branch**

```bash
cd /path/to/travel-app-mini
git checkout -b refactor/single-frontend
```

Expected: `Switched to a new branch 'refactor/single-frontend'`

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p client/src/features/pretrip \
          client/src/features/itinerary \
          client/src/features/duringtrip \
          client/src/components \
          client/src/hooks \
          client/src/lib \
          client/src/contexts \
          client/src/types \
          client/tests/e2e
```

- [ ] **Step 3: Add .gitkeep to preserve empty directories**

```bash
touch client/src/features/pretrip/.gitkeep \
      client/src/features/itinerary/.gitkeep \
      client/src/features/duringtrip/.gitkeep \
      client/src/hooks/.gitkeep \
      client/tests/e2e/.gitkeep
```

---

### Task 2: Consolidate `client/package.json`

**Files:**
- Modify: `client/package.json` (replace workspace-root config with app config)

- [ ] **Step 1: Replace `client/package.json` with the consolidated app config**

Write the following content to `client/package.json`:

```json
{
  "name": "travel-app-client",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "rsbuild dev",
    "build": "rsbuild build",
    "preview": "rsbuild preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "dev:browser": "rsbuild dev & wait-on http://localhost:3000 && ./scripts/launch-chrome-beta.sh",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-slot": "^1.1.1",
    "@supabase/supabase-js": "^2.95.3",
    "@tanstack/react-query": "^5.90.20",
    "@tanstack/react-router": "^1.158.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.468.0",
    "motion": "^11.18.2",
    "react": "^19.0.0",
    "react-day-picker": "^9.13.2",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "react-social-media-embed": "^2.5.17",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.6.0",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@rsbuild/core": "^1.7.2",
    "@rsbuild/plugin-react": "^1.4.5",
    "@tailwindcss/container-queries": "^0.1.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/leaflet": "^1.9.15",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^2.0.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.7.2",
    "vitest": "^2.0.0",
    "wait-on": "^9.0.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd client
pnpm install
```

Expected: Lock file updated, `node_modules` populated.

---

### Task 3: Create `client/rsbuild.config.ts`

**Files:**
- Create: `client/rsbuild.config.ts`

- [ ] **Step 1: Write the rsbuild config**

```typescript
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  server: {
    port: 3000,
  },
  html: {
    title: "TripWeave",
    favicon: "./public/favicon.svg",
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});
```

- [ ] **Step 2: Copy the shell's public folder**

```bash
cp -r client/shell/public client/public
```

---

### Task 4: Create TypeScript and Tailwind configs

**Files:**
- Create: `client/tsconfig.json`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.cjs`

- [ ] **Step 1: Write `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 2: Write `client/tailwind.config.js`**

This merges the pretrip extended theme (custom colors, animations) with the shell's simpler config:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

- [ ] **Step 3: Write `client/postcss.config.cjs`**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

### Task 5: Create Vitest config and test setup

**Files:**
- Create: `client/vitest.config.ts`
- Create: `client/src/test-setup.ts`

- [ ] **Step 1: Write `client/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/hooks/**"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 2: Write `client/src/test-setup.ts`**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 3: Verify vitest can run (no tests yet)**

```bash
cd client
pnpm test
```

Expected: `No test files found` or exit 0 — not an error.

---

### Task 6: Create Playwright config

**Files:**
- Create: `client/playwright.config.ts`

- [ ] **Step 1: Write `client/playwright.config.ts`**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### Task 7: Inline shared-types into `src/types/`

**Files:**
- Create: `client/src/types/database.types.ts` (copy from shared-types)
- Create: `client/src/types/index.ts` (copy + extend from shared-types)

- [ ] **Step 1: Copy the generated database types**

```bash
cp client/shared-types/src/database.types.ts client/src/types/database.types.ts
```

- [ ] **Step 2: Copy and update the index**

```bash
cp client/shared-types/src/index.ts client/src/types/index.ts
```

Open `client/src/types/index.ts` and update the import path:

```typescript
// Re-export Supabase types
export * from "./database.types";

// Shared utility types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
```

(The file content should already be correct — just verify the `./database.types` import resolves locally.)

- [ ] **Step 3: Verify the types file compiles**

```bash
cd client
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: No errors related to `src/types/`.

---

### Task 8: Create `ModalContext` with tests

**Files:**
- Create: `client/src/contexts/ModalContext.tsx`
- Create: `client/src/contexts/ModalContext.test.tsx`

- [ ] **Step 1: Write the failing test first**

Write `client/src/contexts/ModalContext.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ModalProvider, useModal } from "./ModalContext";

function TestConsumer() {
  const { openModal, closeModal, activeModal, modalOptions } = useModal();
  return (
    <div>
      <span data-testid="modal">{activeModal ?? "none"}</span>
      <span data-testid="tripId">{(modalOptions.tripId as string) ?? ""}</span>
      <button onClick={() => openModal("inviteLink", { tripId: "t1" })}>open</button>
      <button onClick={closeModal}>close</button>
    </div>
  );
}

describe("ModalContext", () => {
  it("starts with no active modal", () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    );
    expect(screen.getByTestId("modal").textContent).toBe("none");
  });

  it("opens a modal by name and stores options", async () => {
    const user = userEvent.setup();
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    );
    await user.click(screen.getByText("open"));
    expect(screen.getByTestId("modal").textContent).toBe("inviteLink");
    expect(screen.getByTestId("tripId").textContent).toBe("t1");
  });

  it("closes the active modal and clears options", async () => {
    const user = userEvent.setup();
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    );
    await user.click(screen.getByText("open"));
    await user.click(screen.getByText("close"));
    expect(screen.getByTestId("modal").textContent).toBe("none");
    expect(screen.getByTestId("tripId").textContent).toBe("");
  });

  it("throws when used outside ModalProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useModal must be used within ModalProvider",
    );
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run — expect it to fail (module not found)**

```bash
cd client
pnpm test src/contexts/ModalContext.test.tsx
```

Expected: `Cannot find module './ModalContext'`

- [ ] **Step 3: Write `client/src/contexts/ModalContext.tsx`**

```tsx
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type ModalName = "inviteLink" | "tripSettings" | "createTrip" | "tripMembers";

interface ModalOptions {
  tripId?: string;
  [key: string]: unknown;
}

interface ModalContextValue {
  openModal: (name: ModalName, options?: ModalOptions) => void;
  closeModal: () => void;
  activeModal: ModalName | null;
  modalOptions: ModalOptions;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalName | null>(null);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({});

  const openModal = (name: ModalName, options: ModalOptions = {}) => {
    setActiveModal(name);
    setModalOptions(options);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalOptions({});
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, activeModal, modalOptions }}>
      {children}
    </ModalContext.Provider>
  );
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
cd client
pnpm test src/contexts/ModalContext.test.tsx
```

Expected: `4 passed`

---

### Task 9: Copy shell foundation + create App entry point, commit Phase 1

**Files:**
- Copy: `client/shell/src/contexts/AuthContext.tsx` → `client/src/contexts/AuthContext.tsx`
- Copy: `client/shell/src/lib/supabase.ts` → `client/src/lib/supabase.ts`
- Copy: `client/shell/src/types/auth.ts` → `client/src/types/auth.ts`
- Copy: `client/shell/src/hooks/useTripSummary.ts` → `client/src/hooks/useTripSummary.ts`
- Copy: all `client/shell/src/components/` files → `client/src/components/`
- Create: `client/src/index.css`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`

- [ ] **Step 1: Copy shell source files**

```bash
cp client/shell/src/contexts/AuthContext.tsx client/src/contexts/AuthContext.tsx
cp client/shell/src/lib/supabase.ts client/src/lib/supabase.ts
cp client/shell/src/types/auth.ts client/src/types/auth.ts
cp client/shell/src/hooks/useTripSummary.ts client/src/hooks/useTripSummary.ts
cp client/shell/src/components/AuthGuard.tsx client/src/components/AuthGuard.tsx
cp client/shell/src/components/AuthNav.tsx client/src/components/AuthNav.tsx
cp client/shell/src/components/LandingPage.tsx client/src/components/LandingPage.tsx
cp client/shell/src/components/ProfileMenu.tsx client/src/components/ProfileMenu.tsx
cp client/shell/src/components/ProfileUpdateModal.tsx client/src/components/ProfileUpdateModal.tsx
cp client/shell/src/components/ShellInviteLinkModal.tsx client/src/components/InviteLinkModal.tsx
cp client/shell/src/components/TripMemberAvatars.tsx client/src/components/TripMemberAvatars.tsx
cp client/shell/src/components/TripSwitcher.tsx client/src/components/TripSwitcher.tsx
```

- [ ] **Step 2: Update imports in the copied shell files**

Any imports that reference `../contexts/AuthContext` or `../lib/supabase` should already resolve correctly since the relative paths are preserved. Verify there are no broken imports by checking for `shell` or `mf_` in the copied files:

```bash
grep -r "shell\|mf_pretrip\|mf_itinerary\|mf_duringtrip\|@travel-app/shared-types" client/src/contexts/ client/src/lib/ client/src/hooks/ client/src/components/ 2>/dev/null
```

Expected: No output. If any imports are found, update them to their equivalent local paths.

- [ ] **Step 3: Write `client/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
    "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.shell-desktop-only {
  display: flex;
}
.shell-mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .shell-desktop-only {
    display: none;
  }
  .shell-mobile-only {
    display: flex;
  }
}
```

- [ ] **Step 4: Write `client/src/main.tsx`**

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
```

- [ ] **Step 5: Write `client/src/App.tsx`**

This is based on `client/shell/src/App.tsx` with:
- MFE lazy imports replaced by phase placeholders
- `ModalProvider` + `QueryClientProvider` added
- `window.dispatchEvent("openTripModal")` replaced by `openModal()` from context
- Demo-access `localStorage` logic removed
- `DuringtripLoader` error-boundary retry logic removed (simplified)

```tsx
import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Globe, Calendar, Users, Settings, Menu, X } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { ModalProvider, useModal } from "./contexts/ModalContext";
import { AuthNav } from "./components/AuthNav";
import { AuthGuard } from "./components/AuthGuard";
import { LandingPage } from "./components/LandingPage";
import { TripMemberAvatars } from "./components/TripMemberAvatars";
import { TripSwitcher } from "./components/TripSwitcher";
import { InviteLinkModal } from "./components/InviteLinkModal";
import { useTripSummary, type TripSummary } from "./hooks/useTripSummary";

const queryClient = new QueryClient();

// Phase 1 placeholders — replaced in Phases 2-4
const PretripApp = () => <div className="p-8 text-gray-500">Pre-trip (Phase 2)</div>;
const ItineraryApp = () => <div className="p-8 text-gray-500">Itinerary (Phase 3)</div>;
const DuringtripApp = () => <div className="p-8 text-gray-500">During trip (Phase 4)</div>;

const TripWeaveLogo = () => (
  <svg width="42" height="16" viewBox="0 0 83 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask id="mask0_nav" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="83" height="32">
      <path d="M0 0H83V32H0V0Z" fill="white" />
    </mask>
    <g mask="url(#mask0_nav)">
      <path d="M19.6859 -0.00136721C16.4936 -0.00136721 13.3013 1.27863 11.0667 3.6253L3.61795 11.092C1.27692 13.332 0 16.532 0 19.732C0 26.452 5.42692 31.9986 12.2372 31.9986C15.4295 31.9986 18.6218 30.7186 20.8564 28.372L26.0705 23.1453L41.1808 7.99863C42.2449 6.93196 43.7346 6.29197 45.3308 6.29197C47.8846 6.29197 50.1192 7.99863 50.8641 10.3453L55.6526 5.5453C53.5244 2.13196 49.6936 -0.108032 45.3308 -0.108032C42.1385 -0.108032 38.9461 1.17197 36.7115 3.51863L16.4936 23.7853C15.4295 24.852 13.9397 25.492 12.3436 25.492C9.15128 25.492 6.49102 22.8253 6.49102 19.6253C6.49102 18.0253 7.12949 16.6386 8.19359 15.4653L15.6423 7.99863C16.7064 6.93196 18.1961 6.29197 19.7923 6.29197C22.3461 6.29197 24.5808 7.99863 25.3256 10.3453L30.1141 5.5453C27.8795 2.23863 24.0487 -0.00136721 19.6859 -0.00136721Z" fill="url(#paint0_nav)" />
      <path d="M41.9259 23.8917C40.8618 24.9584 39.3721 25.5984 37.7759 25.5984C35.2221 25.5984 32.9874 23.8917 32.2426 21.5451L27.4541 26.3451C29.5823 29.7584 33.4131 31.9984 37.7759 31.9984C40.9682 31.9984 44.1605 30.7184 46.3951 28.3717L66.6131 8.10508C67.6772 7.03841 69.1669 6.39841 70.7631 6.39841C73.9554 6.39841 76.6157 9.06508 76.6157 12.2651C76.6157 13.8651 75.9772 15.2517 74.9131 16.4251L67.4644 23.8917C66.4003 24.9584 64.9105 25.5984 63.3144 25.5984C60.7605 25.5984 58.5259 23.8917 57.781 21.5451L52.9926 26.3451C55.1208 29.7584 58.9515 31.9984 63.3144 31.9984C66.5067 31.9984 69.699 30.7184 71.9336 28.3717L79.3823 20.9051C81.7233 18.6651 83.0003 15.4651 83.0003 12.2651C83.0003 5.54508 77.5733 -0.00158691 70.7631 -0.00158691C67.5708 -0.00158691 64.3785 1.27841 62.1439 3.62508L41.9259 23.8917Z" fill="url(#paint1_nav)" />
    </g>
    <defs>
      <linearGradient id="paint0_nav" x1="27.8263" y1="-0.108032" x2="27.8263" y2="31.9986" gradientUnits="userSpaceOnUse">
        <stop stopColor="#13BFB0" /><stop offset="1" stopColor="#B9EEEA" />
      </linearGradient>
      <linearGradient id="paint1_nav" x1="55.2272" y1="-0.00158691" x2="55.2272" y2="31.9984" gradientUnits="userSpaceOnUse">
        <stop stopColor="#37BBAF" /><stop offset="1" stopColor="#A6EDE6" />
      </linearGradient>
    </defs>
  </svg>
);

function formatDateRange(startDate: string, endDate: string): string | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const sameMonth = start.getMonth() === end.getMonth();
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return sameMonth ? `${fmt(start)} - ${end.getDate()}` : `${fmt(start)} - ${fmt(end)}`;
}

const MetadataPill = ({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
    <Icon size={13} className="text-gray-400" />
    {children}
  </span>
);

const TripMetadata = ({ summary }: { summary: TripSummary }) => {
  const dateRange =
    summary.startDate && summary.endDate
      ? formatDateRange(summary.startDate, summary.endDate)
      : null;
  return (
    <div className="flex items-center gap-2">
      <MetadataPill icon={Globe}>{summary.destination}</MetadataPill>
      <MetadataPill icon={Calendar}>{dateRange ?? "Add dates"}</MetadataPill>
      <MetadataPill icon={Users}>
        {summary.memberCount} {summary.memberCount === 1 ? "Traveler" : "Travelers"}
      </MetadataPill>
    </div>
  );
};

const RootLayout = () => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const isLandingPage = routerState.location.pathname === "/";
  const tripSummary = useTripSummary();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { activeModal, modalOptions, openModal, closeModal } = useModal();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [routerState.location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuOpen]);

  if (isLandingPage) return <Outlet />;

  const navLinkClass =
    "no-underline px-2.5 py-1 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 [&.active]:text-teal-600 [&.active]:bg-teal-50";
  const mobileNavLinkClass =
    "no-underline block px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100 [&.active]:text-teal-600 [&.active]:bg-teal-50";

  return (
    <div className="h-screen flex flex-col">
      <nav className="flex-shrink-0 relative z-[2000] border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="flex items-center">
          <Link to="/pretrip" className="flex items-center gap-2 no-underline shrink-0">
            <TripWeaveLogo />
            <span className="text-base font-bold text-gray-900 tracking-tight">TripWeave</span>
          </Link>
          <div className="ml-4 shrink-0">
            <TripSwitcher />
          </div>
          {tripSummary && (
            <div className="shell-desktop-only items-center gap-2 ml-6 shrink-0">
              <TripMetadata summary={tripSummary} />
            </div>
          )}
          <div className="ml-auto flex items-center gap-4 shrink-0">
            <div className="shell-desktop-only items-center gap-1">
              <Link to="/pretrip" className={navLinkClass} activeProps={{ className: "active" }}>Pre-Trip</Link>
              <Link to="/itinerary" className={navLinkClass} activeProps={{ className: "active" }}>Itinerary</Link>
              <Link to="/duringtrip" className={navLinkClass} activeProps={{ className: "active" }}>During Trip</Link>
            </div>
            {tripSummary && (
              <div className="shell-desktop-only items-center gap-2">
                <TripMemberAvatars tripId={tripSummary.id} />
                <button
                  onClick={() => openModal("tripSettings")}
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                  title="Trip settings"
                >
                  <Settings size={15} className="text-gray-500" />
                </button>
              </div>
            )}
            <div className="shell-desktop-only items-center">
              <AuthNav />
            </div>
            <button
              className="shell-mobile-only p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} className="text-gray-700" /> : <Menu size={20} className="text-gray-700" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div ref={menuRef} className="shell-mobile-only absolute top-full left-0 right-0 bg-gray-50 border-b border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-1">
              <Link to="/pretrip" className={mobileNavLinkClass} activeProps={{ className: "active" }}>Pre-Trip</Link>
              <Link to="/itinerary" className={mobileNavLinkClass} activeProps={{ className: "active" }}>Itinerary</Link>
              <Link to="/duringtrip" className={mobileNavLinkClass} activeProps={{ className: "active" }}>During Trip</Link>
            </div>
            {tripSummary && (
              <div className="px-4 py-3 border-t border-gray-200 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <MetadataPill icon={Globe}>{tripSummary.destination}</MetadataPill>
                  <MetadataPill icon={Calendar}>
                    {tripSummary.startDate && tripSummary.endDate
                      ? (formatDateRange(tripSummary.startDate, tripSummary.endDate) ?? "Add dates")
                      : "Add dates"}
                  </MetadataPill>
                  <MetadataPill icon={Users}>
                    {tripSummary.memberCount} {tripSummary.memberCount === 1 ? "Traveler" : "Travelers"}
                  </MetadataPill>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <TripMemberAvatars tripId={tripSummary.id} />
                  <button
                    onClick={() => { setMobileMenuOpen(false); openModal("tripSettings"); }}
                    className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                    title="Trip settings"
                  >
                    <Settings size={15} className="text-gray-500" />
                  </button>
                </div>
              </div>
            )}
            <div className="px-4 py-3 border-t border-gray-200">
              <AuthNav />
            </div>
          </div>
        )}
      </nav>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      {activeModal === "inviteLink" && modalOptions.tripId && (
        <InviteLinkModal
          tripId={modalOptions.tripId as string}
          isOpen={true}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

const rootRoute = createRootRoute({ component: RootLayout });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: LandingPage });
const pretripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pretrip",
  component: () => <AuthGuard><PretripApp /></AuthGuard>,
});
const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join/$inviteToken",
  component: () => <AuthGuard><PretripApp /></AuthGuard>,
});
const itineraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/itinerary",
  component: () => <AuthGuard><ItineraryApp /></AuthGuard>,
});
const duringtripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/duringtrip",
  component: () => <AuthGuard><DuringtripApp /></AuthGuard>,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  pretripRoute,
  joinRoute,
  itineraryRoute,
  duringtripRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ModalProvider>
        <RouterProvider router={router} />
      </ModalProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
```

- [ ] **Step 6: Start the dev server and confirm the app loads**

```bash
cd client
pnpm dev
```

Navigate to `http://localhost:3000`. Expected: TripWeave nav bar visible, landing page renders, no console errors about MFE remotes.

- [ ] **Step 7: Commit Phase 1**

```bash
git add client/src/ client/package.json client/rsbuild.config.ts client/tsconfig.json \
        client/tailwind.config.js client/postcss.config.cjs client/vitest.config.ts \
        client/playwright.config.ts client/public/
git commit -m "feat(migration): Phase 1 — foundation, ModalContext, inlined types"
```

---

## Phase 2 — Pre-trip Migration

### Task 10: Copy mf-pretrip source into `features/pretrip/`

**Files:**
- Copy: `client/mf-pretrip/src/*` → `client/src/features/pretrip/`

- [ ] **Step 1: Copy the source tree**

```bash
cp -r client/mf-pretrip/src/. client/src/features/pretrip/
```

- [ ] **Step 2: Remove the MFE entry files (not needed in unified app)**

```bash
rm -f client/src/features/pretrip/bootstrap.tsx \
      client/src/features/pretrip/index.ts
```

- [ ] **Step 3: Verify the copy**

```bash
ls client/src/features/pretrip/
```

Expected: `App.tsx`, `components/`, `contexts/`, `hooks/`, `lib/`, `services/`, `views/` (and any other folders present in mf-pretrip/src).

---

### Task 11: Update `@travel-app/shared-types` imports in pretrip

**Files:**
- Modify: all `.ts`/`.tsx` files in `client/src/features/pretrip/`

- [ ] **Step 1: Replace the package import with the inlined path**

```bash
find client/src/features/pretrip -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|@travel-app/shared-types|@/types|g' {} +
```

- [ ] **Step 2: Verify no remaining references**

```bash
grep -r "@travel-app/shared-types" client/src/features/pretrip/
```

Expected: No output.

- [ ] **Step 3: Check TypeScript compiles**

```bash
cd client
npx tsc --noEmit 2>&1 | head -40
```

Resolve any errors before proceeding. Common issue: if pretrip imports `Database` type, ensure `@/types` exports it (it does — it re-exports from `database.types.ts`).

---

### Task 12: Wire `ModalContext` — replace `window.dispatchEvent` in pretrip

**Files:**
- Modify: any file in `client/src/features/pretrip/` that calls `window.dispatchEvent(new CustomEvent("openTripModal", ...))`

- [ ] **Step 1: Find all dispatch call sites**

```bash
grep -r "openTripModal\|window.dispatchEvent" client/src/features/pretrip/ -l
```

Note the list of files.

- [ ] **Step 2: In each file, add the `useModal` import and replace the dispatch**

For each file found, add at the top of the component imports:

```typescript
import { useModal } from "@/contexts/ModalContext";
```

Inside the component, add:

```typescript
const { openModal } = useModal();
```

Replace calls like:

```typescript
// Before
window.dispatchEvent(new CustomEvent("openTripModal", { detail: { modal: "inviteLink", tripId: trip.id } }));

// After
openModal("inviteLink", { tripId: trip.id });
```

And:

```typescript
// Before
window.dispatchEvent(new CustomEvent("openTripModal", { detail: { modal: "tripSettings" } }));

// After
openModal("tripSettings");
```

And:

```typescript
// Before
window.dispatchEvent(new CustomEvent("openTripModal", { detail: { modal: "createTrip" } }));

// After
openModal("createTrip");
```

- [ ] **Step 3: Verify no remaining window event dispatches for modals**

```bash
grep -r "openTripModal\|window.dispatchEvent.*modal" client/src/features/pretrip/
```

Expected: No output.

---

### Task 13: Wire pretrip into `App.tsx`

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Replace the pretrip placeholder with the real App**

In `client/src/App.tsx`, replace:

```typescript
// Phase 1 placeholders — replaced in Phases 2-4
const PretripApp = () => <div className="p-8 text-gray-500">Pre-trip (Phase 2)</div>;
```

With:

```typescript
import PretripApp from "./features/pretrip/App";
```

- [ ] **Step 2: Add `tripSettings` and `createTrip` modal rendering in `RootLayout`**

In `RootLayout`, locate the modal rendering section near `InviteLinkModal`. Add handling for tripSettings and createTrip modals. Look at what modals mf-pretrip's App.tsx renders and import them:

```bash
grep -r "tripSettings\|TripSettings\|createTrip\|CreateTrip" client/src/features/pretrip/components/ -l
```

Import and render those modal components in `RootLayout` based on `activeModal`, following the same pattern as `InviteLinkModal`:

```tsx
{activeModal === "tripSettings" && (
  <TripSettingsModal isOpen={true} onClose={closeModal} />
)}
{activeModal === "createTrip" && (
  <CreateTripModal isOpen={true} onClose={closeModal} />
)}
```

(Import paths: `"./features/pretrip/components/modals/TripSettingsModal"` etc. — check actual file names in `client/src/features/pretrip/components/modals/`.)

---

### Task 14: Convert 6 Jest tests to Vitest

**Files:**
- Modify: `client/src/features/pretrip/components/TripDropdownComponents.test.tsx`
- Modify: `client/src/features/pretrip/components/TripSelector.test.tsx`
- Modify: `client/src/features/pretrip/components/TripItem.test.tsx`
- Modify: `client/src/features/pretrip/hooks/useCurrentTrip.test.ts`
- Modify: `client/src/features/pretrip/hooks/useUserTrips.integration.test.tsx`
- Modify: `client/src/features/pretrip/hooks/useUserTrips.test.ts`

- [ ] **Step 1: Replace Jest globals with Vitest imports in all 6 test files**

```bash
# Replace jest.mock with vi.mock, jest.fn with vi.fn, jest.MockedFunction with MockedFunction
find client/src/features/pretrip -name "*.test.*" -exec sed -i '' \
  -e 's/jest\.mock/vi.mock/g' \
  -e 's/jest\.fn/vi.fn/g' \
  -e 's/jest\.spyOn/vi.spyOn/g' \
  -e 's/jest\.MockedFunction/MockedFunction/g' \
  -e 's/jest\.clearAllMocks/vi.clearAllMocks/g' \
  -e 's/jest\.resetAllMocks/vi.resetAllMocks/g' \
  {} +
```

- [ ] **Step 2: Add Vitest imports to each test file**

Each test file needs Vitest imports. For each of the 6 files, add at the top:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockedFunction } from "vitest";
```

Remove any `import ... from 'jest'` lines if present.

- [ ] **Step 3: Update `@travel-app/shared-types` imports in test files**

```bash
find client/src/features/pretrip -name "*.test.*" \
  -exec sed -i '' 's|@travel-app/shared-types|@/types|g' {} +
```

- [ ] **Step 4: Run the converted tests**

```bash
cd client
pnpm test src/features/pretrip
```

Expected: All 6 tests pass (or confirm which are skipped/commented-out in the original). Fix any import errors before moving on.

---

### Task 15: Smoke test pretrip + delete mf-pretrip, commit Phase 2

**Files:**
- Delete: `client/mf-pretrip/`

- [ ] **Step 1: Start the dev server**

```bash
cd client
pnpm dev
```

- [ ] **Step 2: Manually verify pretrip**

Navigate to `http://localhost:3000/pretrip`. Confirm:
- Trip selector renders in the nav
- Can create or select a trip
- Idea collection loads
- Map renders
- No console errors about Module Federation

- [ ] **Step 3: Delete mf-pretrip**

```bash
rm -rf client/mf-pretrip
```

- [ ] **Step 4: Commit Phase 2**

```bash
git add -A
git commit -m "feat(migration): Phase 2 — pretrip migrated, Jest → Vitest, ModalContext wired"
```

---

## Phase 3 — Itinerary Migration

### Task 16: Copy mf-itinerary source into `features/itinerary/`

**Files:**
- Copy: `client/mf-itinerary/src/*` → `client/src/features/itinerary/`

- [ ] **Step 1: Copy the source tree**

```bash
cp -r client/mf-itinerary/src/. client/src/features/itinerary/
```

- [ ] **Step 2: Remove MFE entry files**

```bash
rm -f client/src/features/itinerary/bootstrap.tsx \
      client/src/features/itinerary/index.ts
```

---

### Task 17: Update imports in itinerary

**Files:**
- Modify: all `.ts`/`.tsx` in `client/src/features/itinerary/`

- [ ] **Step 1: Replace shared-types import**

```bash
find client/src/features/itinerary -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|@travel-app/shared-types|@/types|g' {} +
```

- [ ] **Step 2: Check for any remaining external MFE imports**

```bash
grep -r "pretrip_main\|duringtrip_main\|@travel-app/shared-types" client/src/features/itinerary/
```

Expected: No output.

- [ ] **Step 3: TypeScript check**

```bash
cd client
npx tsc --noEmit 2>&1 | head -40
```

Resolve errors before continuing.

---

### Task 18: Wire itinerary into `App.tsx`

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Replace the itinerary placeholder**

In `client/src/App.tsx`, replace:

```typescript
const ItineraryApp = () => <div className="p-8 text-gray-500">Itinerary (Phase 3)</div>;
```

With:

```typescript
import ItineraryApp from "./features/itinerary/App";
```

---

### Task 19: Add `useChatAgent` unit test

**Files:**
- Create: `client/src/features/itinerary/hooks/useChatAgent.test.ts`

- [ ] **Step 1: Write the test**

First read the hook to understand its signature:

```bash
head -40 client/src/features/itinerary/hooks/useChatAgent.ts
```

Then write a test covering its initial state:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChatAgent } from "./useChatAgent";

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

describe("useChatAgent", () => {
  it("initializes with empty messages", () => {
    const { result } = renderHook(() => useChatAgent({ tripId: "trip-1" }));
    expect(result.current.messages).toEqual([]);
  });

  it("initializes with isLoading false", () => {
    const { result } = renderHook(() => useChatAgent({ tripId: "trip-1" }));
    expect(result.current.isLoading).toBe(false);
  });
});
```

(Adjust the mock and assertions to match the hook's actual API — read the hook source first.)

- [ ] **Step 2: Run the test**

```bash
cd client
pnpm test src/features/itinerary/hooks/useChatAgent.test.ts
```

Expected: Tests pass.

---

### Task 20: Smoke test itinerary + delete mf-itinerary, commit Phase 3

**Files:**
- Delete: `client/mf-itinerary/`

- [ ] **Step 1: Start the dev server and test**

```bash
cd client
pnpm dev
```

Navigate to `http://localhost:3000/itinerary`. Confirm:
- Itinerary panel renders with a selected trip
- AI chat panel opens and accepts input
- Budget summary visible
- No console errors

- [ ] **Step 2: Delete mf-itinerary**

```bash
rm -rf client/mf-itinerary
```

- [ ] **Step 3: Commit Phase 3**

```bash
git add -A
git commit -m "feat(migration): Phase 3 — itinerary migrated, useChatAgent test added"
```

---

## Phase 4 — During-trip Migration

### Task 21: Copy mf-duringtrip source into `features/duringtrip/`

**Files:**
- Copy: `client/mf-duringtrip/src/*` → `client/src/features/duringtrip/`

- [ ] **Step 1: Copy the source tree**

```bash
cp -r client/mf-duringtrip/src/. client/src/features/duringtrip/
```

- [ ] **Step 2: Remove MFE entry files and the internal router (it merges into App.tsx)**

```bash
rm -f client/src/features/duringtrip/bootstrap.tsx \
      client/src/features/duringtrip/index.tsx \
      client/src/features/duringtrip/routeTree.tsx
```

---

### Task 22: Remove demo mode

**Files:**
- Delete: `client/src/features/duringtrip/demo/DemoBanner.tsx`
- Delete: `client/src/features/duringtrip/demo/DemoContext.tsx`
- Delete: `client/src/features/duringtrip/demo/DemoControlPanel.tsx`
- Modify: any file that imports from `../demo/` or `./demo/`

- [ ] **Step 1: Delete the demo folder**

```bash
rm -rf client/src/features/duringtrip/demo/
```

- [ ] **Step 2: Find and remove demo imports**

```bash
grep -r "demo\|DemoBanner\|DemoContext\|DemoControlPanel\|demo-access" \
  client/src/features/duringtrip/ -l
```

For each file listed, remove the import lines and any JSX usage of `<DemoBanner />`, `<DemoControlPanel />`, and `useDemoContext()` calls.

- [ ] **Step 3: Verify no demo references remain**

```bash
grep -r "DemoBanner\|DemoContext\|DemoControlPanel\|demo-access" \
  client/src/features/duringtrip/
```

Expected: No output.

---

### Task 23: Update imports in duringtrip

**Files:**
- Modify: all `.ts`/`.tsx` in `client/src/features/duringtrip/`

- [ ] **Step 1: Replace shared-types import**

```bash
find client/src/features/duringtrip -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|@travel-app/shared-types|@/types|g' {} +
```

- [ ] **Step 2: Check for any remaining external MFE imports**

```bash
grep -r "pretrip_main\|itinerary_main\|@travel-app/shared-types" client/src/features/duringtrip/
```

Expected: No output.

- [ ] **Step 3: TypeScript check**

```bash
cd client
npx tsc --noEmit 2>&1 | head -40
```

---

### Task 24: Wire duringtrip into `App.tsx` (merge routeTree)

**Files:**
- Modify: `client/src/App.tsx`

The duringtrip had its own `routeTree.tsx` with routes `/`, `/trips`, `/trip/$tripId` (all relative within the MFE). In the unified app, these nest under `/duringtrip/`.

- [ ] **Step 1: Replace the duringtrip placeholder and update routes**

In `client/src/App.tsx`, replace:

```typescript
const DuringtripApp = () => <div className="p-8 text-gray-500">During trip (Phase 4)</div>;
```

With imports for the duringtrip views:

```typescript
import { ActiveTripView } from "./features/duringtrip/views/ActiveTripView";
import { TripsListView } from "./features/duringtrip/views/TripsListView";
```

- [ ] **Step 2: Update the duringtrip route to render `ActiveTripView` directly**

Replace the `duringtripRoute` definition:

```typescript
// Before
const duringtripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/duringtrip",
  component: () => <AuthGuard><DuringtripApp /></AuthGuard>,
});

// After
const duringtripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/duringtrip",
  component: () => <AuthGuard><ActiveTripView /></AuthGuard>,
});

const duringtripTripsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/duringtrip/trips",
  component: () => <AuthGuard><TripsListView /></AuthGuard>,
});
```

Add `duringtripTripsRoute` to the `routeTree.addChildren` call.

---

### Task 25: Add `useLocation` unit test

**Files:**
- Create: `client/src/features/duringtrip/hooks/useLocation.test.ts`

- [ ] **Step 1: Read the hook signature**

```bash
head -30 client/src/features/duringtrip/hooks/useLocation.ts
```

- [ ] **Step 2: Write the test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLocation } from "./useLocation";

describe("useLocation", () => {
  it("initializes with null coordinates", () => {
    const { result } = renderHook(() => useLocation());
    expect(result.current.coords).toBeNull();
  });

  it("initializes with isTracking false", () => {
    const { result } = renderHook(() => useLocation());
    expect(result.current.isTracking).toBe(false);
  });
});
```

(Adjust property names to match the actual hook API.)

- [ ] **Step 3: Run the test**

```bash
cd client
pnpm test src/features/duringtrip/hooks/useLocation.test.ts
```

Expected: Tests pass.

---

### Task 26: Add Playwright e2e test

**Files:**
- Create: `client/tests/e2e/full-flow.spec.ts`

- [ ] **Step 1: Write the e2e test**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Full trip flow", () => {
  test.beforeEach(async ({ page }) => {
    // Use the app's test credentials or Supabase local dev — configure via env
    await page.goto("/");
  });

  test("landing page loads", async ({ page }) => {
    await expect(page).toHaveTitle(/TripWeave/);
    await expect(page.locator("text=TripWeave")).toBeVisible();
  });

  test("navigates to pretrip after login", async ({ page }) => {
    // This test requires auth — skip if no test credentials are configured
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;
    if (!email || !password) test.skip();

    await page.goto("/pretrip");
    // AuthGuard redirects unauthenticated users — confirm redirect or login
    await expect(page).toHaveURL(/pretrip|login/);
  });

  test("itinerary route is accessible", async ({ page }) => {
    await page.goto("/itinerary");
    // Confirms the route renders without a 404 or crash
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("duringtrip route is accessible", async ({ page }) => {
    await page.goto("/duringtrip");
    await expect(page.locator("body")).not.toContainText("404");
  });
});
```

- [ ] **Step 2: Run e2e tests (with dev server already running)**

```bash
cd client
pnpm test:e2e
```

Expected: Landing page test passes. Auth tests skip if no credentials configured.

---

### Task 27: Smoke test duringtrip + delete mf-duringtrip, commit Phase 4

**Files:**
- Delete: `client/mf-duringtrip/`

- [ ] **Step 1: Start the dev server and test**

```bash
cd client
pnpm dev
```

Navigate to `http://localhost:3000/duringtrip`. Confirm:
- ActiveTripView renders with the selected trip
- Chat panel works
- Map renders
- No `DemoBanner` visible
- No `demo-access` localStorage key is set automatically
- No console errors

- [ ] **Step 2: Delete mf-duringtrip**

```bash
rm -rf client/mf-duringtrip
```

- [ ] **Step 3: Commit Phase 4**

```bash
git add -A
git commit -m "feat(migration): Phase 4 — duringtrip migrated, demo removed, Playwright e2e added"
```

---

## Phase 5 — Consolidation

### Task 28: Promote shared hooks to `src/hooks/`

The hooks to promote are the ones duplicated across features. Use the `mf-pretrip` (React Query) versions as canonical. The hooks are:

- `useTripMembers` — pretrip version (React Query + collaboration lib)
- `useChatAgent` — pretrip or itinerary version (check which is more complete)
- `useAnnotations`
- `usePhotoGuide`
- `useTravelGuide`
- `useItineraryDeletion`
- `usePlacesEnrichment`

**Files:**
- Create: `client/src/hooks/useTripMembers.ts`
- Create: `client/src/hooks/useChatAgent.ts`
- Create: `client/src/hooks/useAnnotations.ts`
- Create: `client/src/hooks/usePhotoGuide.ts`
- Create: `client/src/hooks/useTravelGuide.ts`
- Create: `client/src/hooks/useItineraryDeletion.ts`
- Create: `client/src/hooks/usePlacesEnrichment.ts`

- [ ] **Step 1: For each hook, copy the canonical version to `src/hooks/`**

```bash
# useTripMembers — canonical is mf-pretrip's React Query version
cp client/src/features/pretrip/hooks/useTripMembers.ts client/src/hooks/useTripMembers.ts
```

Repeat for each hook, choosing the pretrip version (or the more feature-complete version if pretrip lacks one):

```bash
cp client/src/features/itinerary/hooks/useChatAgent.ts client/src/hooks/useChatAgent.ts
cp client/src/features/pretrip/hooks/useAnnotations.ts client/src/hooks/useAnnotations.ts 2>/dev/null || \
  cp client/src/features/duringtrip/hooks/useAnnotations.ts client/src/hooks/useAnnotations.ts
cp client/src/features/itinerary/hooks/usePhotoGuide.ts client/src/hooks/usePhotoGuide.ts
cp client/src/features/itinerary/hooks/useTravelGuide.ts client/src/hooks/useTravelGuide.ts
cp client/src/features/itinerary/hooks/useItineraryDeletion.ts client/src/hooks/useItineraryDeletion.ts
cp client/src/features/pretrip/hooks/usePlacesEnrichment.ts client/src/hooks/usePlacesEnrichment.ts 2>/dev/null || \
  cp client/src/features/duringtrip/hooks/usePlacesEnrichment.ts client/src/hooks/usePlacesEnrichment.ts
```

- [ ] **Step 2: Update imports in the promoted hooks**

The promoted hooks may reference local lib files (`../lib/supabase`, `../lib/queryKeys`). Update their imports to point to `@/lib/`:

```bash
find client/src/hooks -type f -name "*.ts" \
  -exec sed -i '' \
    -e 's|\.\./lib/supabase|@/lib/supabase|g' \
    -e 's|\.\./lib/queryKeys|@/lib/queryKeys|g' \
    -e 's|\.\./lib/collaboration|@/lib/collaboration|g' \
  {} +
```

---

### Task 29: Consolidate `lib/` files into `src/lib/`

**Files:**
- Create/modify: `client/src/lib/queryKeys.ts`
- Create/modify: `client/src/lib/collaboration.ts`
- Create/modify: `client/src/lib/sse.ts`
- Create/modify: `client/src/lib/api.ts`
- Create/modify: `client/src/lib/utils.ts`
- Create/modify: `client/src/lib/map-config.ts`
- Create/modify: `client/src/lib/icon-mapping.ts`
- Create/modify: `client/src/lib/annotation-utils.ts`
- Create/modify: `client/src/lib/budget-utils.ts`

- [ ] **Step 1: Copy canonical lib files (pretrip has the most complete set)**

```bash
# Core libs from pretrip
cp client/src/features/pretrip/lib/queryKeys.ts client/src/lib/queryKeys.ts
cp client/src/features/pretrip/lib/collaboration.ts client/src/lib/collaboration.ts
cp client/src/features/pretrip/lib/sse.ts client/src/lib/sse.ts
cp client/src/features/pretrip/lib/utils.ts client/src/lib/utils.ts

# Feature-specific libs
cp client/src/features/itinerary/lib/api.ts client/src/lib/api.ts 2>/dev/null || \
  cp client/src/features/duringtrip/lib/api.ts client/src/lib/api.ts
cp client/src/features/pretrip/lib/map-config.ts client/src/lib/map-config.ts
cp client/src/features/pretrip/lib/icon-mapping.ts client/src/lib/icon-mapping.ts
cp client/src/features/itinerary/lib/annotation-utils.ts client/src/lib/annotation-utils.ts 2>/dev/null || true
cp client/src/features/itinerary/lib/budget-utils.ts client/src/lib/budget-utils.ts 2>/dev/null || true
```

- [ ] **Step 2: Update supabase.ts imports in consolidated lib files**

```bash
find client/src/lib -type f -name "*.ts" \
  -exec sed -i '' 's|./supabase|@/lib/supabase|g' {} +
```

---

### Task 30: Update features to import shared hooks and lib from `src/`

**Files:**
- Modify: all hook/component files in `src/features/` that import the now-shared hooks

- [ ] **Step 1: Find all files importing from the duplicate hook paths**

```bash
grep -r "from.*hooks/useTripMembers\|from.*hooks/useChatAgent\|from.*hooks/useAnnotations\|from.*hooks/usePhotoGuide\|from.*hooks/useTravelGuide\|from.*hooks/useItineraryDeletion\|from.*hooks/usePlacesEnrichment" \
  client/src/features/ -l
```

- [ ] **Step 2: For each file, update the import to use the shared hook**

For example, in `client/src/features/itinerary/components/SomeComponent.tsx`:

```typescript
// Before
import { useTripMembers } from "../hooks/useTripMembers";

// After
import { useTripMembers } from "@/hooks/useTripMembers";
```

Run the update for all hooks at once:

```bash
find client/src/features -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' \
    -e 's|from "\.\./hooks/useTripMembers"|from "@/hooks/useTripMembers"|g' \
    -e 's|from "\.\./hooks/useChatAgent"|from "@/hooks/useChatAgent"|g' \
    -e 's|from "\.\./hooks/useAnnotations"|from "@/hooks/useAnnotations"|g' \
    -e 's|from "\.\./hooks/usePhotoGuide"|from "@/hooks/usePhotoGuide"|g' \
    -e 's|from "\.\./hooks/useTravelGuide"|from "@/hooks/useTravelGuide"|g' \
    -e 's|from "\.\./hooks/useItineraryDeletion"|from "@/hooks/useItineraryDeletion"|g' \
    -e 's|from "\.\./hooks/usePlacesEnrichment"|from "@/hooks/usePlacesEnrichment"|g' \
  {} +
```

Also update two-level-up paths (`../../hooks/`):

```bash
find client/src/features -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' \
    -e 's|from "\.\.\/\.\.\/hooks/useTripMembers"|from "@/hooks/useTripMembers"|g' \
    -e 's|from "\.\.\/\.\.\/hooks/useChatAgent"|from "@/hooks/useChatAgent"|g' \
    -e 's|from "\.\.\/\.\.\/hooks/useAnnotations"|from "@/hooks/useAnnotations"|g' \
    -e 's|from "\.\.\/\.\.\/hooks/usePhotoGuide"|from "@/hooks/usePhotoGuide"|g' \
    -e 's|from "\.\.\/\.\.\/hooks/useTravelGuide"|from "@/hooks/useTravelGuide"|g' \
    -e 's|from "\.\.\/\.\.\/hooks/useItineraryDeletion"|from "@/hooks/useItineraryDeletion"|g' \
    -e 's|from "\.\.\/\.\.\/hooks/usePlacesEnrichment"|from "@/hooks/usePlacesEnrichment"|g' \
  {} +
```

- [ ] **Step 3: TypeScript check**

```bash
cd client
npx tsc --noEmit 2>&1 | head -40
```

Resolve all errors before proceeding.

---

### Task 31: Delete `shell/` and `shared-types/`, update workspace config

**Files:**
- Delete: `client/shell/`
- Delete: `client/shared-types/`
- Modify: `pnpm-workspace.yaml` (repo root)

- [ ] **Step 1: Delete shell and shared-types**

```bash
rm -rf client/shell client/shared-types
```

- [ ] **Step 2: Update `pnpm-workspace.yaml` at repo root**

Open `/path/to/travel-app-mini/pnpm-workspace.yaml` and replace the `packages` list:

```yaml
packages:
  - client
  - server

ignoredBuiltDependencies:
  - core-js
  - esbuild
```

- [ ] **Step 3: Reinstall to remove orphaned workspace deps**

```bash
cd /path/to/travel-app-mini
pnpm install
```

---

### Task 32: Final test sweep

- [ ] **Step 1: Run all unit tests**

```bash
cd client
pnpm test
```

Expected: All tests pass. Fix any broken imports surfaced by the removal of shell/shared-types.

- [ ] **Step 2: Run TypeScript check**

```bash
cd client
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Run coverage check on shared hooks**

```bash
cd client
pnpm test:coverage
```

Expected: `src/hooks/` meets 80% threshold for lines/functions/branches/statements.

- [ ] **Step 4: Start dev server — verify all routes**

```bash
cd client
pnpm dev
```

Manually test:
- `/` — landing page
- `/pretrip` — trip selector, idea collection, map
- `/itinerary` — itinerary display, AI chat
- `/duringtrip` — active trip view, chat
- Invite link modal (click invite in nav)
- Trip settings modal (gear icon in nav)

- [ ] **Step 5: Run e2e tests**

```bash
cd client
pnpm test:e2e
```

Expected: All Playwright tests pass.

---

### Task 33: Final commit and merge to main

- [ ] **Step 1: Commit Phase 5**

```bash
git add -A
git commit -m "feat(migration): Phase 5 — consolidation, shared hooks promoted, shell/shared-types deleted"
```

- [ ] **Step 2: Rebase onto main**

```bash
git fetch origin
git rebase origin/main
```

Resolve any conflicts (unlikely — `main` hasn't touched the client during migration).

- [ ] **Step 3: Merge to main**

```bash
git checkout main
git merge refactor/single-frontend --no-ff -m "feat: migrate MFE architecture to single unified frontend"
```

- [ ] **Step 4: Verify build**

```bash
cd client
pnpm build
```

Expected: Build completes without errors. Bundle output in `client/dist/`.

---

## Self-Review

**Spec coverage:**
- ✅ Demo mode fully removed (Tasks 22, delete demo/)
- ✅ shared-types inlined (Task 7)
- ✅ ModalContext replaces window events (Tasks 8, 12)
- ✅ React Query hooks canonical (Task 28, pretrip versions)
- ✅ Single branch, commit per phase (Tasks 9, 15, 20, 27, 33)
- ✅ Vitest unit tests (Tasks 5, 8, 14, 19, 25)
- ✅ Playwright e2e (Task 26)
- ✅ 80% coverage threshold (Task 32)
- ✅ pnpm-workspace.yaml updated (Task 31)
- ✅ Shell and shared-types deleted (Task 31)

**Placeholder scan:** No TBDs present. Task 13 notes to check actual modal file names — this is intentional since file names in pretrip/components/modals/ weren't enumerated; the plan directs the engineer to check.

**Type consistency:** `ModalName`, `ModalOptions`, `ModalContextValue` defined in Task 8 and referenced consistently in Task 9's App.tsx. `openModal(name, options)` signature is consistent throughout.
