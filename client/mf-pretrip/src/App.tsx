import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemberProvider } from "./contexts/MemberContext";
import { ModalProvider } from "./contexts/ModalContext";
import { TripView } from "./views/TripView";
import { JoinTripPage } from "./views/JoinTripPage";
import { ModalManager } from "./components/modals/ModalManager";
import { Toaster } from "./components/ui/sonner";
import { setupGlobalDebugUtils } from "./lib/debugUtils";
import "./globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Setup debug utilities in development
const isDevelopment =
  typeof window !== "undefined" && window.location.hostname === "localhost";
if (isDevelopment) {
  setupGlobalDebugUtils(queryClient);
}

function App() {
  // Check if we're in join mode by looking at the URL
  const isJoinMode = window.location.pathname.startsWith("/join/");

  return (
    <QueryClientProvider client={queryClient}>
      <MemberProvider>
        <ModalProvider>
          {isJoinMode ? <JoinTripPage /> : <TripView />}
          <ModalManager />
          <Toaster position="bottom-left" closeButton />
        </ModalProvider>
      </MemberProvider>
      {/* 
        React Query DevTools can be added by installing: 
        pnpm add @tanstack/react-query-devtools
        Then import and use: <ReactQueryDevtools initialIsOpen={false} />
      */}
    </QueryClientProvider>
  );
}

export default App;
