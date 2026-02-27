import { createRouter, createRootRoute, createRoute, Outlet, createHashHistory } from '@tanstack/react-router';
import { TripsListView } from './views/TripsListView';
import { ActiveTripView } from './views/ActiveTripView';

// Root layout (shell provides the global nav)
const rootRoute = createRootRoute({
  component: () => (
    <div className="bg-background" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  ),
});

// Home route - show itinerary directly (reads tripId from localStorage like mf-itinerary)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ActiveTripView,
});

// Trips list route (accessible if needed)
const tripsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trips',
  component: TripsListView,
});

// Active trip route - map + voice assistant
const tripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trip/$tripId',
  component: ActiveTripView,
});

// Build route tree
const routeTree = rootRoute.addChildren([indexRoute, tripsListRoute, tripRoute]);

// Use hash history to avoid conflicts with HMR/dev server
const hashHistory = createHashHistory();

// Create and export router
export const router = createRouter({
  routeTree,
  history: hashHistory,
});

// Type registration for type-safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
