import type { Database } from "@travel-app/shared-types";
type Idea = Database['public']['Tables']['trip_reel_ideas']['Row'];
interface IdeaCardProps {
    idea: Idea;
}
export declare function IdeaCard({ idea }: IdeaCardProps): import("react/jsx-runtime").JSX.Element;
export {};
