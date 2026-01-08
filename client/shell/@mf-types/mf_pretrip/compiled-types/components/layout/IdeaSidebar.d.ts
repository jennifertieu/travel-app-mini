import type { Database } from "@travel-app/shared-types";
type Idea = Database['public']['Tables']['trip_reel_ideas']['Row'];
interface IdeaSidebarProps {
    ideas: Idea[];
    isLoading?: boolean;
}
export declare function IdeaSidebar({ ideas, isLoading }: IdeaSidebarProps): import("react/jsx-runtime").JSX.Element;
export {};
