interface TripHeaderProps {
    trip: {
        id: string;
        title?: string | null;
        destination: string;
        start_date?: string | null;
        end_date?: string | null;
    } | null;
}
export declare function TripHeader({ trip }: TripHeaderProps): import("react/jsx-runtime").JSX.Element;
export {};
