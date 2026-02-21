import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabase";

interface MemberInfo {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_creator: boolean;
}

function dispatchTripModal(modal: string, extra?: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent("openTripModal", { detail: { modal, ...extra } }),
  );
}

export function TripMemberAvatars({ tripId }: { tripId: string }) {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const [collabResult, tripResult] = await Promise.all([
      supabase
        .from("trip_collaborators")
        .select("user_id, member_profiles!inner(display_name, avatar_url)")
        .eq("trip_id", tripId)
        .not("user_id", "is", null),
      supabase
        .from("trips")
        .select("created_by, member_profiles!inner(display_name, avatar_url)")
        .eq("id", tripId)
        .single(),
    ]);

    const list: MemberInfo[] = [];

    if (tripResult.data?.created_by) {
      const p = tripResult.data.member_profiles as any;
      list.push({
        user_id: tripResult.data.created_by,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        is_creator: true,
      });
    }

    if (collabResult.data) {
      for (const row of collabResult.data) {
        if (row.user_id === tripResult.data?.created_by) continue;
        const p = row.member_profiles as any;
        list.push({
          user_id: row.user_id!,
          display_name: p?.display_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          is_creator: false,
        });
      }
    }

    setMembers(list);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetchMembers();

    const channel = supabase
      .channel(`shell-members:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_collaborators",
          filter: `trip_id=eq.${tripId}`,
        },
        () => fetchMembers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchMembers]);

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse" />
      </div>
    );
  }

  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - 3);

  return (
    <div className="flex items-center">
      <div className="flex items-center -space-x-1.5">
        {visible.map((m) => {
          const initials = (m.display_name || "?").charAt(0).toUpperCase();
          return (
            <button
              key={m.user_id}
              onClick={() => dispatchTripModal("tripMembers", { tripId })}
              className="relative h-7 w-7 rounded-full border-2 border-gray-50 flex items-center justify-center text-[10px] font-medium bg-gray-100 text-gray-600 overflow-hidden transition-transform hover:scale-110 hover:z-10"
              title={m.display_name || "Member"}
            >
              {m.avatar_url ? (
                <img
                  src={m.avatar_url}
                  alt={m.display_name || "Member"}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials
              )}
            </button>
          );
        })}
        {extra > 0 && (
          <button
            onClick={() => dispatchTripModal("tripMembers", { tripId })}
            className="h-7 w-7 rounded-full border-2 border-gray-50 bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-110 hover:z-10"
          >
            +{extra}
          </button>
        )}
      </div>
      <button
        onClick={() => dispatchTripModal("inviteLink", { tripId })}
        className="h-7 w-7 p-0 ml-1.5 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors"
        title="Invite collaborators"
      >
        <Plus size={14} className="text-gray-400" />
      </button>
    </div>
  );
}
