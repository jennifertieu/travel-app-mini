import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemberProvider } from "./contexts/MemberContext";
import { DuringtripHeader } from "./components/DuringtripHeader";
import { TripsListView } from "./views/TripsListView";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MemberProvider>
        <div className="bg-background" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <DuringtripHeader />
          <div style={{ flex: 1, overflowY: "auto" }}>
            <TripsListView />
          </div>
        </div>
      </MemberProvider>
    </QueryClientProvider>
  );
};

export default App;
