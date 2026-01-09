interface PlaceReview {
    authorName: string;
    authorUrl?: string;
    rating: number;
    text?: string;
    time: number;
    relativeTimeDescription: string;
    profilePhotoUrl?: string;
    language?: string;
}
interface ReviewsSectionProps {
    reviews?: PlaceReview[];
    isLoading?: boolean;
}
export declare function ReviewsSection({ reviews, isLoading, }: ReviewsSectionProps): import("react/jsx-runtime").JSX.Element;
export {};
