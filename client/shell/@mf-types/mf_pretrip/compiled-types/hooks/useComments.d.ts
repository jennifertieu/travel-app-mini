/**
 * Fetch all comments for an idea with realtime subscription
 */
export declare function useComments(ideaId: string | null): import("@tanstack/react-query").UseQueryResult<{
    author_id: string;
    author_name: string | null;
    created_at: string;
    id: string;
    idea_id: string;
    text: string;
    updated_at: string;
}[], Error>;
/**
 * Add a new comment
 */
export declare function useAddComment(): import("@tanstack/react-query").UseMutationResult<{
    author_id: string;
    author_name: string | null;
    created_at: string;
    id: string;
    idea_id: string;
    text: string;
    updated_at: string;
}, Error, {
    author_id: string;
    author_name?: string | null;
    created_at?: string;
    id?: string;
    idea_id: string;
    text: string;
    updated_at?: string;
}, unknown>;
/**
 * Update a comment
 */
export declare function useUpdateComment(commentId: string): import("@tanstack/react-query").UseMutationResult<{
    author_id: string;
    author_name: string | null;
    created_at: string;
    id: string;
    idea_id: string;
    text: string;
    updated_at: string;
}, Error, {
    author_id?: string;
    author_name?: string | null;
    created_at?: string;
    id?: string;
    idea_id?: string;
    text?: string;
    updated_at?: string;
}, unknown>;
/**
 * Delete a comment
 */
export declare function useDeleteComment(): import("@tanstack/react-query").UseMutationResult<{
    commentId: string;
    ideaId: string;
}, Error, {
    commentId: string;
    ideaId: string;
}, unknown>;
