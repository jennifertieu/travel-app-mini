import { ReactNode } from 'react';
interface MemberProfile {
    id: string;
    displayName?: string;
    dietary: string[];
    travelStyle: 'chill' | 'balanced' | 'packed';
    interests: string[];
    walkingTolerance?: 'low' | 'medium' | 'high';
}
interface MemberContextValue {
    member: MemberProfile;
    updateMember: (updates: Partial<MemberProfile>) => void;
    isInitialized: boolean;
}
export declare function MemberProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useMember(): MemberContextValue;
export {};
