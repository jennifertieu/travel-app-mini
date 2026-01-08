import { Database } from '@travel-app/shared-types';
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<Database, "public", "public", {
    Tables: {
        member_profiles: {
            Row: {
                created_at: string;
                dietary: string[] | null;
                display_name: string | null;
                id: string;
                interests: string[] | null;
                travel_style: string | null;
                updated_at: string;
                user_id: string | null;
                walking_tolerance: string | null;
            };
            Insert: {
                created_at?: string;
                dietary?: string[] | null;
                display_name?: string | null;
                id: string;
                interests?: string[] | null;
                travel_style?: string | null;
                updated_at?: string;
                user_id?: string | null;
                walking_tolerance?: string | null;
            };
            Update: {
                created_at?: string;
                dietary?: string[] | null;
                display_name?: string | null;
                id?: string;
                interests?: string[] | null;
                travel_style?: string | null;
                updated_at?: string;
                user_id?: string | null;
                walking_tolerance?: string | null;
            };
            Relationships: [];
        };
        trip_members: {
            Row: {
                id: string;
                joined_at: string;
                member_id: string;
                role: string | null;
                trip_id: string;
            };
            Insert: {
                id?: string;
                joined_at?: string;
                member_id: string;
                role?: string | null;
                trip_id: string;
            };
            Update: {
                id?: string;
                joined_at?: string;
                member_id?: string;
                role?: string | null;
                trip_id?: string;
            };
            Relationships: [{
                foreignKeyName: "trip_members_member_id_fkey";
                columns: ["member_id"];
                isOneToOne: false;
                referencedRelation: "member_profiles";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "trip_members_trip_id_fkey";
                columns: ["trip_id"];
                isOneToOne: false;
                referencedRelation: "trips";
                referencedColumns: ["id"];
            }];
        };
        trip_reel_idea_comments: {
            Row: {
                author_id: string;
                author_name: string | null;
                created_at: string;
                id: string;
                idea_id: string;
                text: string;
                updated_at: string;
            };
            Insert: {
                author_id: string;
                author_name?: string | null;
                created_at?: string;
                id?: string;
                idea_id: string;
                text: string;
                updated_at?: string;
            };
            Update: {
                author_id?: string;
                author_name?: string | null;
                created_at?: string;
                id?: string;
                idea_id?: string;
                text?: string;
                updated_at?: string;
            };
            Relationships: [{
                foreignKeyName: "trip_reel_idea_comments_author_id_fkey";
                columns: ["author_id"];
                isOneToOne: false;
                referencedRelation: "member_profiles";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "trip_reel_idea_comments_idea_id_fkey";
                columns: ["idea_id"];
                isOneToOne: false;
                referencedRelation: "trip_reel_ideas";
                referencedColumns: ["id"];
            }];
        };
        trip_reel_idea_reactions: {
            Row: {
                comment: string | null;
                created_at: string;
                id: string;
                idea_id: string;
                member_id: string;
                member_name: string | null;
                signal: string;
            };
            Insert: {
                comment?: string | null;
                created_at?: string;
                id?: string;
                idea_id: string;
                member_id: string;
                member_name?: string | null;
                signal: string;
            };
            Update: {
                comment?: string | null;
                created_at?: string;
                id?: string;
                idea_id?: string;
                member_id?: string;
                member_name?: string | null;
                signal?: string;
            };
            Relationships: [{
                foreignKeyName: "trip_reel_idea_reactions_idea_id_fkey";
                columns: ["idea_id"];
                isOneToOne: false;
                referencedRelation: "trip_reel_ideas";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "trip_reel_idea_reactions_member_id_fkey";
                columns: ["member_id"];
                isOneToOne: false;
                referencedRelation: "member_profiles";
                referencedColumns: ["id"];
            }];
        };
        trip_reel_ideas: {
            Row: {
                category: string | null;
                comment: string | null;
                cost_bucket: string | null;
                created_at: string;
                created_by: string;
                duration_bucket: string | null;
                enrichment_status: string;
                icon_type: string | null;
                id: string;
                latitude: number | null;
                location: import("@travel-app/shared-types/src/database.types").Json | null;
                longitude: number | null;
                place: import("@travel-app/shared-types/src/database.types").Json | null;
                source_canonical_url: string | null;
                source_platform: string;
                source_url: string;
                source_video_id: string;
                summary: string | null;
                tags: string[] | null;
                time_of_day: string | null;
                title: string | null;
                trip_id: string;
                updated_at: string;
            };
            Insert: {
                category?: string | null;
                comment?: string | null;
                cost_bucket?: string | null;
                created_at?: string;
                created_by: string;
                duration_bucket?: string | null;
                enrichment_status?: string;
                icon_type?: string | null;
                id?: string;
                latitude?: number | null;
                location?: import("@travel-app/shared-types/src/database.types").Json | null;
                longitude?: number | null;
                place?: import("@travel-app/shared-types/src/database.types").Json | null;
                source_canonical_url?: string | null;
                source_platform: string;
                source_url: string;
                source_video_id: string;
                summary?: string | null;
                tags?: string[] | null;
                time_of_day?: string | null;
                title?: string | null;
                trip_id: string;
                updated_at?: string;
            };
            Update: {
                category?: string | null;
                comment?: string | null;
                cost_bucket?: string | null;
                created_at?: string;
                created_by?: string;
                duration_bucket?: string | null;
                enrichment_status?: string;
                icon_type?: string | null;
                id?: string;
                latitude?: number | null;
                location?: import("@travel-app/shared-types/src/database.types").Json | null;
                longitude?: number | null;
                place?: import("@travel-app/shared-types/src/database.types").Json | null;
                source_canonical_url?: string | null;
                source_platform?: string;
                source_url?: string;
                source_video_id?: string;
                summary?: string | null;
                tags?: string[] | null;
                time_of_day?: string | null;
                title?: string | null;
                trip_id?: string;
                updated_at?: string;
            };
            Relationships: [{
                foreignKeyName: "trip_reel_ideas_created_by_fkey";
                columns: ["created_by"];
                isOneToOne: false;
                referencedRelation: "member_profiles";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "trip_reel_ideas_trip_id_fkey";
                columns: ["trip_id"];
                isOneToOne: false;
                referencedRelation: "trips";
                referencedColumns: ["id"];
            }];
        };
        trip_reel_shortlist_items: {
            Row: {
                created_at: string;
                id: string;
                idea_id: string;
                member_id: string;
                sort_order: number;
                trip_id: string;
            };
            Insert: {
                created_at?: string;
                id?: string;
                idea_id: string;
                member_id: string;
                sort_order?: number;
                trip_id: string;
            };
            Update: {
                created_at?: string;
                id?: string;
                idea_id?: string;
                member_id?: string;
                sort_order?: number;
                trip_id?: string;
            };
            Relationships: [{
                foreignKeyName: "trip_reel_shortlist_items_idea_id_fkey";
                columns: ["idea_id"];
                isOneToOne: false;
                referencedRelation: "trip_reel_ideas";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "trip_reel_shortlist_items_member_id_fkey";
                columns: ["member_id"];
                isOneToOne: false;
                referencedRelation: "member_profiles";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "trip_reel_shortlist_items_trip_id_fkey";
                columns: ["trip_id"];
                isOneToOne: false;
                referencedRelation: "trips";
                referencedColumns: ["id"];
            }];
        };
        trips: {
            Row: {
                created_at: string;
                created_by: string | null;
                destination: string;
                destination_lat: number | null;
                destination_lng: number | null;
                end_date: string | null;
                id: string;
                start_date: string | null;
                title: string | null;
                updated_at: string;
            };
            Insert: {
                created_at?: string;
                created_by?: string | null;
                destination: string;
                destination_lat?: number | null;
                destination_lng?: number | null;
                end_date?: string | null;
                id?: string;
                start_date?: string | null;
                title?: string | null;
                updated_at?: string;
            };
            Update: {
                created_at?: string;
                created_by?: string | null;
                destination?: string;
                destination_lat?: number | null;
                destination_lng?: number | null;
                end_date?: string | null;
                id?: string;
                start_date?: string | null;
                title?: string | null;
                updated_at?: string;
            };
            Relationships: [{
                foreignKeyName: "trips_created_by_fkey";
                columns: ["created_by"];
                isOneToOne: false;
                referencedRelation: "member_profiles";
                referencedColumns: ["id"];
            }];
        };
    };
    Views: { [_ in never]: never; };
    Functions: { [_ in never]: never; };
    Enums: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
}, {
    PostgrestVersion: "14.1";
}>;
