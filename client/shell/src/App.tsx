import { lazy, Suspense, useEffect, useState } from "react";
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
import { Globe, Calendar, Users, Settings } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthNav } from "./components/AuthNav";
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
const DuringtripApp = lazy(() =>
  import("duringtrip_main/App").catch((err) => {
    console.error("Failed to load duringtrip app:", err);
    return { default: () => <div>Error loading During Trip app</div> };
  }),
);

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

const PENDING_OPEN_MODAL_KEY = "pending-open-modal";
const PENDING_OPEN_MODAL_TRIP_ID_KEY = "pending-open-modal-tripId";

const RootLayout = () => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const isLandingPage = routerState.location.pathname === "/";
  const tripSummary = useTripSummary();
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
          {tripSummary && (
            <div className="flex items-center gap-2 ml-6 shrink-0">
              <TripMetadata summary={tripSummary} />
            </div>
          )}

          {/* Right: Nav links + Auth */}
          <div className="ml-auto flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/pretrip"
                className="no-underline px-2.5 py-1 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 [&.active]:text-blue-600 [&.active]:bg-blue-50"
                activeProps={{ className: "active" }}
              >
                Pre-Trip
              </Link>
              <Link
                to="/itinerary"
                className="no-underline px-2.5 py-1 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 [&.active]:text-blue-600 [&.active]:bg-blue-50"
                activeProps={{ className: "active" }}
              >
                Itinerary
              </Link>
              <Link
                to="/duringtrip"
                className="no-underline px-2.5 py-1 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 [&.active]:text-blue-600 [&.active]:bg-blue-50"
                activeProps={{ className: "active" }}
              >
                During Trip
              </Link>
            </div>
            {tripSummary && (
              <div className="flex items-center gap-2">
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
            <AuthNav />
          </div>
        </div>
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
      <Suspense fallback={<LoadingFallback name="During Trip" />}>
        <DuringtripApp />
      </Suspense>
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
