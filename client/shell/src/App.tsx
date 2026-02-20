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
import { AuthProvider } from "./contexts/AuthContext";
import { AuthNav } from "./components/AuthNav";
import { AuthGuard } from "./components/AuthGuard";
import { LandingPage } from "./components/LandingPage";

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

// Root layout with navigation
const RootLayout = () => {
  const routerState = useRouterState();
  const isLandingPage = routerState.location.pathname === "/";

  if (isLandingPage) {
    return <Outlet />;
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <nav
        style={{
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
          backgroundColor: "#f9fafb",
          flexShrink: 0,
          position: "relative",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "1rem",
            maxWidth: "1200px",
            margin: "0 auto",
            alignItems: "center",
          }}
        >
          <Link
            to="/pretrip"
            style={{ textDecoration: "none" }}
            activeProps={{ style: { fontWeight: "bold", color: "#2563eb" } }}
            inactiveProps={{ style: { color: "#374151" } }}
          >
            Pre-Trip
          </Link>
          <Link
            to="/itinerary"
            style={{ textDecoration: "none" }}
            activeProps={{ style: { fontWeight: "bold", color: "#2563eb" } }}
            inactiveProps={{ style: { color: "#374151" } }}
          >
            Itinerary
          </Link>
          <Link
            to="/duringtrip"
            style={{ textDecoration: "none" }}
            activeProps={{ style: { fontWeight: "bold", color: "#2563eb" } }}
            inactiveProps={{ style: { color: "#374151" } }}
          >
            During Trip
          </Link>
          <AuthNav />
        </div>
      </nav>
      <main style={{ flex: 1, overflow: "hidden" }}>
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
