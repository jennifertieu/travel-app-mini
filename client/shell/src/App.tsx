import { lazy, Suspense } from "react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { Globe, Calendar, Users } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthNav } from "./components/AuthNav";
import { AuthGuard } from "./components/AuthGuard";
import { LandingPage } from "./components/LandingPage";
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
    width="40"
    height="20"
    viewBox="0 0 40 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="10" cy="10" rx="8" ry="8" stroke="#0D9488" strokeWidth="2.5" fill="none" />
    <ellipse cx="20" cy="10" rx="8" ry="8" stroke="#0D9488" strokeWidth="2.5" fill="none" />
    <ellipse cx="30" cy="10" rx="8" ry="8" stroke="#0D9488" strokeWidth="2.5" fill="none" />
  </svg>
);

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
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

const TripMetadata = ({ summary }: { summary: TripSummary }) => (
  <div className="flex items-center gap-2">
    <MetadataPill icon={Globe}>{summary.destination}</MetadataPill>
    {summary.startDate && summary.endDate && (
      <MetadataPill icon={Calendar}>
        {formatDateRange(summary.startDate, summary.endDate)}
      </MetadataPill>
    )}
    <MetadataPill icon={Users}>
      {summary.memberCount} {summary.memberCount === 1 ? "Traveler" : "Travelers"}
    </MetadataPill>
  </div>
);

const RootLayout = () => {
  const routerState = useRouterState();
  const isLandingPage = routerState.location.pathname === "/";
  const tripSummary = useTripSummary();

  if (isLandingPage) {
    return <Outlet />;
  }

  return (
    <div className="h-screen flex flex-col">
      <nav className="flex-shrink-0 relative z-[2000] border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="flex items-center">
          {/* Left: Logo */}
          <Link to="/pretrip" className="flex items-center gap-2 no-underline shrink-0">
            <TripWeaveLogo />
            <span className="text-base font-bold text-gray-900 tracking-tight">
              TripWeave
            </span>
          </Link>

          {/* Center: Trip metadata pills - dead center irrespective of other elements */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {tripSummary && <TripMetadata summary={tripSummary} />}
          </div>

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
            <AuthNav />
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
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
