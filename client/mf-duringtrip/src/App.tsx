import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { MemberProvider } from "./contexts/MemberContext";
import { router } from "./routeTree";
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
        <RouterProvider router={router} />
      </MemberProvider>
    </QueryClientProvider>
  );
};

export default App;
