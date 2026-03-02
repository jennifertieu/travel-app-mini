import {
  lazy,
  Suspense,
  useState,
  useRef,
  useEffect,
  useCallback,
  Component,
} from "react";
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
import { Globe, Calendar, Users, Settings, Menu, X } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthNav } from "./components/AuthNav";
import { supabase } from "./lib/supabase";
import { AuthGuard } from "./components/AuthGuard";
import { LandingPage } from "./components/LandingPage";
import { TripMemberAvatars } from "./components/TripMemberAvatars";
import { TripSwitcher } from "./components/TripSwitcher";
import { ShellInviteLinkModal } from "./components/ShellInviteLinkModal";
import { useTripSummary, type TripSummary } from "./hooks/useTripSummary";

// Lazy load the MFE apps with error handling
const PretripApp = lazy(() =>
  import("pretrip_main/App").catch((err) => {
    console.error("Failed to load pretrip app:", err);
    return { default: () => <div>Error loading Pre-Trip app</div> };
  }),
);
const ItineraryApp = lazy(() =>
  import("itinerary_main/App").catch((err) => {
    console.error("Failed to load itinerary app:", err);
    return { default: () => <div>Error loading Itinerary app</div> };
  }),
);
// DuringtripLoader: retries the Module Federation import when 3003 is slow to start.
// MF marks a failed remote as permanently broken in memory, so we force a re-import by
// creating a new lazy() promise on each retry attempt.
// Uses a class ErrorBoundary to catch Suspense/lazy errors (React requires class components for this).

interface ErrorBoundaryProps {
  onError: () => void;
  children: ReactNode;
  retryKey: number;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class DuringtripErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(err: Error) {
    console.error("Failed to load duringtrip app:", err);
    this.props.onError();
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (prev.retryKey !== this.props.retryKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const makeDuringtripApp = () => lazy(() => import("duringtrip_main/App"));

const DuringtripLoader = () => {
  const [retryKey, setRetryKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const AppRef = useRef(makeDuringtripApp());
  const retried = useRef(false);

  const retry = useCallback(() => {
    AppRef.current = makeDuringtripApp();
    retried.current = false;
    setFailed(false);
    setRetryKey((k) => k + 1);
  }, []);

  // Auto-retry once after 2s to handle the case where 3003 started slowly
  useEffect(() => {
    if (!failed || retried.current) return;
    retried.current = true;
    const t = setTimeout(retry, 2000);
    return () => clearTimeout(t);
  }, [failed, retry]);

  if (failed) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
          During Trip is taking a moment to load...
        </p>
        <button
          onClick={retry}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const App = AppRef.current;
  return (
    <DuringtripErrorBoundary
      retryKey={retryKey}
      onError={() => setFailed(true)}
    >
      <Suspense fallback={<LoadingFallback name="During Trip" />}>
        <App key={retryKey} />
      </Suspense>
    </DuringtripErrorBoundary>
  );
};

// Loading fallback component
const LoadingFallback = ({ name }: { name: string }) => (
  <div style={{ padding: "2rem", textAlign: "center" }}></div>
);

const TripWeaveLogo = () => (
  <svg
    width="42"
    height="16"
    viewBox="0 0 83 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <mask
      id="mask0_nav"
      style={{ maskType: "luminance" }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="83"
      height="32"
    >
      <path d="M0 0H83V32H0V0Z" fill="white" />
    </mask>
    <g mask="url(#mask0_nav)">
      <path
        d="M19.6859 -0.00136721C16.4936 -0.00136721 13.3013 1.27863 11.0667 3.6253L3.61795 11.092C1.27692 13.332 0 16.532 0 19.732C0 26.452 5.42692 31.9986 12.2372 31.9986C15.4295 31.9986 18.6218 30.7186 20.8564 28.372L26.0705 23.1453L41.1808 7.99863C42.2449 6.93196 43.7346 6.29197 45.3308 6.29197C47.8846 6.29197 50.1192 7.99863 50.8641 10.3453L55.6526 5.5453C53.5244 2.13196 49.6936 -0.108032 45.3308 -0.108032C42.1385 -0.108032 38.9461 1.17197 36.7115 3.51863L16.4936 23.7853C15.4295 24.852 13.9397 25.492 12.3436 25.492C9.15128 25.492 6.49102 22.8253 6.49102 19.6253C6.49102 18.0253 7.12949 16.6386 8.19359 15.4653L15.6423 7.99863C16.7064 6.93196 18.1961 6.29197 19.7923 6.29197C22.3461 6.29197 24.5808 7.99863 25.3256 10.3453L30.1141 5.5453C27.8795 2.23863 24.0487 -0.00136721 19.6859 -0.00136721Z"
        fill="url(#paint0_nav)"
      />
      <path
        d="M41.9259 23.8917C40.8618 24.9584 39.3721 25.5984 37.7759 25.5984C35.2221 25.5984 32.9874 23.8917 32.2426 21.5451L27.4541 26.3451C29.5823 29.7584 33.4131 31.9984 37.7759 31.9984C40.9682 31.9984 44.1605 30.7184 46.3951 28.3717L66.6131 8.10508C67.6772 7.03841 69.1669 6.39841 70.7631 6.39841C73.9554 6.39841 76.6157 9.06508 76.6157 12.2651C76.6157 13.8651 75.9772 15.2517 74.9131 16.4251L67.4644 23.8917C66.4003 24.9584 64.9105 25.5984 63.3144 25.5984C60.7605 25.5984 58.5259 23.8917 57.781 21.5451L52.9926 26.3451C55.1208 29.7584 58.9515 31.9984 63.3144 31.9984C66.5067 31.9984 69.699 30.7184 71.9336 28.3717L79.3823 20.9051C81.7233 18.6651 83.0003 15.4651 83.0003 12.2651C83.0003 5.54508 77.5733 -0.00158691 70.7631 -0.00158691C67.5708 -0.00158691 64.3785 1.27841 62.1439 3.62508L41.9259 23.8917Z"
        fill="url(#paint1_nav)"
      />
    </g>
    <defs>
      <linearGradient
        id="paint0_nav"
        x1="27.8263"
        y1="-0.108032"
        x2="27.8263"
        y2="31.9986"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#13BFB0" />
        <stop offset="1" stopColor="#B9EEEA" />
      </linearGradient>
      <linearGradient
        id="paint1_nav"
        x1="55.2272"
        y1="-0.00158691"
        x2="55.2272"
        y2="31.9984"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#37BBAF" />
        <stop offset="1" stopColor="#A6EDE6" />
      </linearGradient>
    </defs>
  </svg>
);

function formatDateRange(startDate: string, endDate: string): string | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const sameMonth = start.getMonth() === end.getMonth();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return sameMonth
    ? `${fmt(start)} - ${end.getDate()}`
    : `${fmt(start)} - ${fmt(end)}`;
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
        {summary.memberCount}{" "}
        {summary.memberCount === 1 ? "Traveler" : "Travelers"}
      </MetadataPill>
    </div>
  );
};

const DemoToggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
      enabled
        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
    }`}
    aria-label={enabled ? "Disable demo mode" : "Enable demo mode"}
  >
    <span
      className={`relative inline-flex w-6 h-3.5 rounded-full transition-colors ${
        enabled ? "bg-amber-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${
          enabled ? "translate-x-2.5" : "translate-x-0"
        }`}
      />
    </span>
    Demo
  </button>
);
const PENDING_OPEN_MODAL_KEY = "pending-open-modal";
const PENDING_OPEN_MODAL_TRIP_ID_KEY = "pending-open-modal-tripId";

const RootLayout = () => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const isLandingPage = routerState.location.pathname === "/";
  const tripSummary = useTripSummary();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [demoAccess, setDemoAccess] = useState(
    () => localStorage.getItem("demo-access") === "true",
  );
  const [demoEnabled, setDemoEnabled] = useState(
    () => localStorage.getItem("demo-enabled") === "true",
  );

  const isDuringTrip = routerState.location.pathname === "/duringtrip";
  const showDemoToggle = isDuringTrip && demoAccess;

  // Check demo access via API when on /duringtrip (falls back to localStorage cache)
  useEffect(() => {
    if (!isDuringTrip) return;
    if (localStorage.getItem("demo-access") === "true") {
      setDemoAccess(true);
      return;
    }
    const checkAccess = async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!s?.access_token) return;
      const apiBase =
        (import.meta.env.PUBLIC_API_URL as string | undefined) ??
        (import.meta.env.PUBLIC_BACKEND_URL as string | undefined) ??
        "http://localhost:5001";
      try {
        const res = await fetch(`${apiBase}/demo/access`, {
          headers: { Authorization: `Bearer ${s.access_token}` },
        });
        if (!res.ok) return;
        const { allowed } = await res.json();
        if (allowed) {
          localStorage.setItem("demo-access", "true");
          setDemoAccess(true);
        }
      } catch {
        // fail silently
      }
    };
    checkAccess();
  }, [isDuringTrip]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [routerState.location.pathname]);

  // Close mobile menu on outside click
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

  // Sync demo state with mf-duringtrip via custom events
  useEffect(() => {
    const onAccessGranted = () => {
      setDemoAccess(true);
      setDemoEnabled(localStorage.getItem("demo-enabled") === "true");
    };
    const onToggle = (e: Event) => {
      setDemoEnabled((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    };
    window.addEventListener("demo-access-granted", onAccessGranted);
    window.addEventListener("demo-toggle", onToggle);
    return () => {
      window.removeEventListener("demo-access-granted", onAccessGranted);
      window.removeEventListener("demo-toggle", onToggle);
    };
  }, []);

  const handleDemoToggle = () => {
    const next = !demoEnabled;
    setDemoEnabled(next);
    if (next) {
      localStorage.setItem("demo-enabled", "true");
    } else {
      localStorage.removeItem("demo-enabled");
    }
    window.dispatchEvent(
      new CustomEvent("demo-toggle", { detail: { enabled: next } }),
    );
  };
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalTripId, setInviteModalTripId] = useState<string | null>(
    null,
  );

  // Shell handles invite modal so it opens on any route (including /pretrip). Other modals: navigate to pretrip and store intent.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ modal?: string; tripId?: string }>)
        .detail;
      if (!detail?.modal) return;
      if (detail.modal === "inviteLink" && detail.tripId) {
        setInviteModalTripId(detail.tripId);
        setInviteModalOpen(true);
        return;
      }
      if (routerState.location.pathname !== "/pretrip") {
        try {
          sessionStorage.setItem(PENDING_OPEN_MODAL_KEY, detail.modal);
          if (detail.tripId) {
            sessionStorage.setItem(
              PENDING_OPEN_MODAL_TRIP_ID_KEY,
              detail.tripId,
            );
          }
        } catch {
          // ignore
        }
        navigate({
          to: "/pretrip",
          search: detail.tripId ? { tripId: detail.tripId } : undefined,
        });
      }
    };
    window.addEventListener("openTripModal", handler);
    return () => window.removeEventListener("openTripModal", handler);
  }, [navigate, routerState.location.pathname]);

  if (isLandingPage) {
    return <Outlet />;
  }

  const navLinkClass =
    "no-underline px-2.5 py-1 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 [&.active]:text-teal-600 [&.active]:bg-teal-50";
  const mobileNavLinkClass =
    "no-underline block px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100 [&.active]:text-teal-600 [&.active]:bg-teal-50";

  return (
    <div className="h-screen flex flex-col">
      <nav className="flex-shrink-0 relative z-[2000] border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="flex items-center">
          {/* Left: Logo, Trip switcher, then metadata pills */}
          <Link
            to="/pretrip"
            className="flex items-center gap-2 no-underline shrink-0"
          >
            <TripWeaveLogo />
            <span className="text-base font-bold text-gray-900 tracking-tight">
              TripWeave
            </span>
          </Link>
          <div className="ml-4 shrink-0">
            <TripSwitcher />
          </div>

          {/* Desktop: metadata pills */}
          {tripSummary && (
            <div className="shell-desktop-only items-center gap-2 ml-6 shrink-0">
              <TripMetadata summary={tripSummary} />
            </div>
          )}

          {/* Desktop: Nav links + trip actions + auth */}
          <div className="ml-auto flex items-center gap-4 shrink-0">
            <div className="shell-desktop-only items-center gap-1">
              <Link
                to="/pretrip"
                className={navLinkClass}
                activeProps={{ className: "active" }}
              >
                Pre-Trip
              </Link>
              <Link
                to="/itinerary"
                className={navLinkClass}
                activeProps={{ className: "active" }}
              >
                Itinerary
              </Link>
              <Link
                to="/duringtrip"
                className={navLinkClass}
                activeProps={{ className: "active" }}
              >
                During Trip
              </Link>
            </div>
            {tripSummary && (
              <div className="shell-desktop-only items-center gap-2">
                <TripMemberAvatars tripId={tripSummary.id} />
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("openTripModal", {
                        detail: { modal: "tripSettings" },
                      }),
                    )
                  }
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                  title="Trip settings"
                >
                  <Settings size={15} className="text-gray-500" />
                </button>
              </div>
            )}
            {showDemoToggle && (
              <div className="shell-desktop-only items-center">
                <DemoToggle enabled={demoEnabled} onToggle={handleDemoToggle} />
              </div>
            )}
            <div className="shell-desktop-only items-center">
              <AuthNav />
            </div>

            {/* Mobile: hamburger */}
            <button
              className="shell-mobile-only p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X size={20} className="text-gray-700" />
              ) : (
                <Menu size={20} className="text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div
            ref={menuRef}
            className="shell-mobile-only absolute top-full left-0 right-0 bg-gray-50 border-b border-gray-200 shadow-lg"
          >
            <div className="px-4 py-3 space-y-1">
              <Link
                to="/pretrip"
                className={mobileNavLinkClass}
                activeProps={{ className: "active" }}
              >
                Pre-Trip
              </Link>
              <Link
                to="/itinerary"
                className={mobileNavLinkClass}
                activeProps={{ className: "active" }}
              >
                Itinerary
              </Link>
              <Link
                to="/duringtrip"
                className={mobileNavLinkClass}
                activeProps={{ className: "active" }}
              >
                During Trip
              </Link>
              {showDemoToggle && (
                <div className="pt-1">
                  <DemoToggle
                    enabled={demoEnabled}
                    onToggle={() => {
                      handleDemoToggle();
                      setMobileMenuOpen(false);
                    }}
                  />
                </div>
              )}
            </div>

            {tripSummary && (
              <div className="px-4 py-3 border-t border-gray-200 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <MetadataPill icon={Globe}>
                    {tripSummary.destination}
                  </MetadataPill>
                  <MetadataPill icon={Calendar}>
                    {tripSummary.startDate && tripSummary.endDate
                      ? (formatDateRange(
                          tripSummary.startDate,
                          tripSummary.endDate,
                        ) ?? "Add dates")
                      : "Add dates"}
                  </MetadataPill>
                  <MetadataPill icon={Users}>
                    {tripSummary.memberCount}{" "}
                    {tripSummary.memberCount === 1 ? "Traveler" : "Travelers"}
                  </MetadataPill>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <TripMemberAvatars tripId={tripSummary.id} />
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.dispatchEvent(
                        new CustomEvent("openTripModal", {
                          detail: { modal: "tripSettings" },
                        }),
                      );
                    }}
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
      {inviteModalTripId && (
        <ShellInviteLinkModal
          tripId={inviteModalTripId}
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setInviteModalTripId(null);
          }}
        />
      )}
    </div>
  );
};

// Define routes
const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const pretripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pretrip",
  component: () => (
    <AuthGuard>
      <Suspense fallback={<LoadingFallback name="Pre-Trip" />}>
        <PretripApp />
      </Suspense>
    </AuthGuard>
  ),
});

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join/$inviteToken",
  component: () => (
    <AuthGuard>
      <Suspense fallback={<LoadingFallback name="Pre-Trip" />}>
        <PretripApp />
      </Suspense>
    </AuthGuard>
  ),
});

const itineraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/itinerary",
  component: () => (
    <AuthGuard>
      <Suspense fallback={<LoadingFallback name="Itinerary" />}>
        <ItineraryApp />
      </Suspense>
    </AuthGuard>
  ),
});

const duringtripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/duringtrip",
  component: () => (
    <AuthGuard>
      <DuringtripLoader />
    </AuthGuard>
  ),
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  pretripRoute,
  joinRoute,
  itineraryRoute,
  duringtripRoute,
]);

// Create router
const router = createRouter({ routeTree });

// Register router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const App = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
