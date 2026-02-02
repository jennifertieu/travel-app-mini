"use client";

import { AddIdeaModal } from "./AddIdeaModal";
import { IdeaDetailModal } from "./IdeaDetailModal";
import { CreateTripModal } from "./CreateTripModal";
import { useModals } from "../../contexts/ModalContext";
import { useIdeas } from "../../hooks/useIdeas";
import { useCurrentTrip } from "../../hooks/useCurrentTrip";

export function ModalManager() {
  const { getModalData, isOpen } = useModals();

  // Use enhanced current trip management
  const { currentTripId } = useCurrentTrip();
  const { data: ideas = [] } = useIdeas(currentTripId);

  // Find the selected idea for the detail modal
  const ideaDetailData = getModalData("ideaDetail");
  const selectedIdea = ideaDetailData?.ideaId
    ? ideas.find((idea: any) => idea.id === ideaDetailData.ideaId)
    : null;

  return (
    <>
      <AddIdeaModal />
      <CreateTripModal />
      {/* Show modal immediately, even if idea is still loading */}
      {isOpen("ideaDetail") && <IdeaDetailModal idea={selectedIdea} />}
    </>
  );
}
