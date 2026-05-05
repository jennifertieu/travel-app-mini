import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type ModalName =
  | "inviteLink"
  | "tripSettings"
  | "createTrip"
  | "tripMembers"
  | "addIdea"
  | "ideaDetail"
  | "ratingMode"
  | "profile"
  | "shortlist"
  | "changeLocation";

interface ModalOptions {
  tripId?: string;
  [key: string]: unknown;
}

interface ModalState {
  [key: string]: boolean;
}

interface ModalDataMap {
  [key: string]: ModalOptions | undefined;
}

interface ModalContextValue {
  // Rich multi-modal API (used by pretrip components)
  isOpen: (modalType: ModalName) => boolean;
  openModal: (modalType: ModalName, options?: ModalOptions) => void;
  closeModal: (modalType?: ModalName | unknown) => void;
  getModalData: (modalType: ModalName) => ModalOptions | undefined;
  modalData: ModalDataMap;
  // Single-modal convenience (used by shell)
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
  const [modalState, setModalState] = useState<ModalState>({});
  const [modalDataMap, setModalDataMap] = useState<ModalDataMap>({});

  const isOpen = (modalType: ModalName): boolean => {
    return modalState[modalType] || false;
  };

  const openModal = (modalType: ModalName, options: ModalOptions = {}) => {
    setModalState((prev) => ({ ...prev, [modalType]: true }));
    setModalDataMap((prev) => ({ ...prev, [modalType]: options }));
  };

  const closeModal = (modalType?: ModalName | unknown) => {
    // Guard: only treat arg as ModalName if it's a non-empty string
    const name = typeof modalType === "string" ? (modalType as ModalName) : undefined;
    if (name) {
      setModalState((prev) => ({ ...prev, [name]: false }));
      setModalDataMap((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } else {
      // Close all modals (shell convenience usage or called with no arg / event object)
      setModalState({});
      setModalDataMap({});
    }
  };

  const getModalData = (modalType: ModalName): ModalOptions | undefined => {
    return modalDataMap[modalType];
  };

  // Shell-compat: activeModal = first open modal (or null)
  const activeModal =
    (Object.keys(modalState).find((k) => modalState[k]) as ModalName) ?? null;
  const modalOptions: ModalOptions = activeModal
    ? (modalDataMap[activeModal] ?? {})
    : {};

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        openModal,
        closeModal,
        getModalData,
        modalData: modalDataMap,
        activeModal,
        modalOptions,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}
