import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemberProvider } from './contexts/MemberContext';
import { ModalProvider } from './contexts/ModalContext';
import { TripView } from './views/TripView';
import { ModalManager } from './components/modals/ModalManager';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MemberProvider>
        <ModalProvider>
          <TripView />
          <ModalManager />
        </ModalProvider>
      </MemberProvider>
    </QueryClientProvider>
  );
}

export default App;
