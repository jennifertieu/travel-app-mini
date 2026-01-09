import { lazy, Suspense } from "react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Link,
  Outlet,
} from "@tanstack/react-router";

// Lazy load the MFE apps
// Using unique aliases to prevent Zephyr from auto-overriding URLs
const PretripApp = lazy(() => import("pretrip_main/App"));
const ItineraryApp = lazy(() => import("itinerary_main/App"));
const DuringtripApp = lazy(() => import("duringtrip_main/App"));

// Loading fallback component
const LoadingFallback = ({ name }: { name: string }) => (
  <div style={{ padding: "2rem", textAlign: "center" }}>Loading {name}...</div>
);

// Root layout with navigation
const RootLayout = () => {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <nav
        style={{
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
          backgroundColor: "#f9fafb",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "1rem",
            maxWidth: "1200px",
            margin: "0 auto",
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
  component: () => (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Welcome to Travel App</h1>
      <p>Select a tab above to get started.</p>
    </div>
  ),
});

const pretripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pretrip",
  component: () => (
    <Suspense fallback={<LoadingFallback name="Pre-Trip" />}>
      <PretripApp />
    </Suspense>
  ),
});

const itineraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/itinerary",
  component: () => (
    <Suspense fallback={<LoadingFallback name="Itinerary" />}>
      <ItineraryApp />
    </Suspense>
  ),
});

const duringtripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/duringtrip",
  component: () => (
    <Suspense fallback={<LoadingFallback name="During Trip" />}>
      <DuringtripApp />
    </Suspense>
  ),
});

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  pretripRoute,
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
  return <RouterProvider router={router} />;
};

export default App;

