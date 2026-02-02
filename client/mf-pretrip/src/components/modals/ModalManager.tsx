"use client";

import { AddIdeaModal } from "./AddIdeaModal";
import { IdeaDetailModal } from "./IdeaDetailModal";
import { CreateTripModal } from "./CreateTripModal";
import { InviteLinkModal } from "./InviteLinkModal";
import { TripMembersModal } from "./TripMembersModal";
import { useModals } from "../../contexts/ModalContext";
import { useIdeas } from "../../hooks/useIdeas";
import { useCurrentTrip } from "../../hooks/useCurrentTrip";

export function ModalManager() {
  const { getModalData, isOpen, closeModal } = useModals();

  // Use enhanced current trip management
  const { currentTripId } = useCurrentTrip();
  const { data: ideas = [] } = useIdeas(currentTripId);

  // Find the selected idea for the detail modal
  const ideaDetailData = getModalData("ideaDetail");
  const selectedIdea = ideaDetailData?.ideaId
    ? ideas.find((idea: any) => idea.id === ideaDetailData.ideaId)
    : null;

  // Get trip members modal data
  const tripMembersData = getModalData("tripMembers");

  return (
    <>
      <AddIdeaModal />
      <CreateTripModal />
      <InviteLinkModal />
      {/* Show modal immediately, even if idea is still loading */}
      {isOpen("ideaDetail") && <IdeaDetailModal idea={selectedIdea} />}
      {/* Trip Members Modal */}
      {isOpen("tripMembers") && tripMembersData?.tripId && (
        <TripMembersModal
          isOpen={true}
          onClose={() => closeModal("tripMembers")}
          tripId={tripMembersData.tripId}
        />
      )}
    </>
  );
}
