"use client";

import { AddIdeaModal } from "./AddIdeaModal";
import { IdeaDetailModal } from "./IdeaDetailModal";
import { useModals } from "../../contexts/ModalContext";
import { useIdeas } from "../../hooks/useIdeas";

export function ModalManager() {
  const { getModalData, isOpen } = useModals();
  
  // Get current trip ID for fetching ideas
  const tripId = typeof window !== 'undefined' ? localStorage.getItem('current-trip-id') : null;
  const { data: ideas = [] } = useIdeas(tripId);
  
  // Find the selected idea for the detail modal
  const ideaDetailData = getModalData('ideaDetail');
  const selectedIdea = ideaDetailData?.ideaId 
    ? ideas.find((idea: any) => idea.id === ideaDetailData.ideaId)
    : null;

  return (
    <>
      <AddIdeaModal />
      {/* Show modal immediately, even if idea is still loading */}
      {isOpen('ideaDetail') && <IdeaDetailModal idea={selectedIdea} />}
    </>
  );
}

