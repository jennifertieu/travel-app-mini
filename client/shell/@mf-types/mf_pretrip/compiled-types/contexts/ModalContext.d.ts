import { ReactNode } from 'react';
type ModalType = 'createTrip' | 'addIdea' | 'ideaDetail' | 'tripSettings' | 'profile' | 'shortlist' | 'ratingMode' | 'changeLocation';
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
export declare function ModalProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useModals(): ModalContextValue;
export {};
