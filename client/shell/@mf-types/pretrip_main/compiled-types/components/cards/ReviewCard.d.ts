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
interface ReviewCardProps {
    review: PlaceReview;
}
export declare function ReviewCard({ review }: ReviewCardProps): import("react/jsx-runtime").JSX.Element;
export {};
