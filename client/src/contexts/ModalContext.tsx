import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type ModalName = "inviteLink" | "tripSettings" | "createTrip" | "tripMembers";

interface ModalOptions {
  tripId?: string;
  [key: string]: unknown;
}

interface ModalContextValue {
  openModal: (name: ModalName, options?: ModalOptions) => void;
  closeModal: () => void;
  activeModal: ModalName | null;
  modalOptions: ModalOptions;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalName | null>(null);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({});

  const openModal = (name: ModalName, options: ModalOptions = {}) => {
    setActiveModal(name);
    setModalOptions(options);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalOptions({});
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, activeModal, modalOptions }}>
      {children}
    </ModalContext.Provider>
  );
}
