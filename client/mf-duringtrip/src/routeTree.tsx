import { createRouter, createRootRoute, createRoute, Outlet, createHashHistory } from '@tanstack/react-router';
import { DuringtripHeader } from './components/DuringtripHeader';
import { TripsListView } from './views/TripsListView';
import { ActiveTripView } from './views/ActiveTripView';

// Root layout with header
const rootRoute = createRootRoute({
  component: () => (
    <div className="bg-background" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DuringtripHeader />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  ),
});

// Home route - trips list
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: TripsListView,
});

// Active trip route - map + voice assistant
const tripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trip/$tripId',
  component: ActiveTripView,
});

// Build route tree
const routeTree = rootRoute.addChildren([indexRoute, tripRoute]);

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
