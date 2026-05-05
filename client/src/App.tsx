import { useState, useRef, useEffect, type ComponentType, type ReactNode } from "react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Link,
  Outlet,
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
import PretripApp from "./features/pretrip/App";
import { JoinTripPage } from "./features/pretrip/views/JoinTripPage";

const queryClient = new QueryClient();

// Phase 1 placeholders — replaced in Phases 2-4
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
  icon: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
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
  component: () => <AuthGuard><JoinTripPage /></AuthGuard>,
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
