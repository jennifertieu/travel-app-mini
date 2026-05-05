import { MemberProvider } from "./contexts/MemberContext";
import { TripView } from "./views/TripView";
import { ModalManager } from "./components/modals/ModalManager";
import { Toaster } from "./components/ui/sonner";

function PretripApp() {
  return (
    <MemberProvider>
      <TripView />
      <ModalManager />
      <Toaster position="bottom-right" closeButton />
    </MemberProvider>
  );
}

export default PretripApp;
