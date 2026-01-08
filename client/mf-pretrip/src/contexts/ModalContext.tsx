import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 
  | 'createTrip'
  | 'addIdea'
  | 'ideaDetail'
  | 'tripSettings'
  | 'profile'
  | 'shortlist'
  | 'ratingMode'
  | 'changeLocation';

interface ModalState {
  [key: string]: boolean;
}

interface ModalData {
  [key: string]: any;
}

interface ModalContextValue {
  isOpen: (modalType: ModalType) => boolean;
  openModal: (modalType: ModalType, data?: any) => void;
  closeModal: (modalType: ModalType) => void;
  getModalData: (modalType: ModalType) => any;
  modalData: ModalData;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>({});
  const [modalData, setModalData] = useState<ModalData>({});

  const isOpen = (modalType: ModalType): boolean => {
    return modalState[modalType] || false;
  };

  const openModal = (modalType: ModalType, data?: any) => {
    setModalState((prev) => ({ ...prev, [modalType]: true }));
    if (data !== undefined) {
      setModalData((prev) => ({ ...prev, [modalType]: data }));
    }
  };

  const closeModal = (modalType: ModalType) => {
    setModalState((prev) => ({ ...prev, [modalType]: false }));
    // Clear modal data when closing
    setModalData((prev) => {
      const newData = { ...prev };
      delete newData[modalType];
      return newData;
    });
  };

  const getModalData = (modalType: ModalType): any => {
    return modalData[modalType];
  };

  return (
    <ModalContext.Provider value={{ isOpen, openModal, closeModal, getModalData, modalData }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
}

