import { MemberProvider } from "./contexts/MemberContext";
import { ActiveTripView } from "./views/ActiveTripView";

function DuringtripApp() {
  return (
    <MemberProvider>
      <ActiveTripView />
    </MemberProvider>
  );
}

export default DuringtripApp;
