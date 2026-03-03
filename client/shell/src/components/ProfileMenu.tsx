import React, { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, ChevronDown, Trash2, FlaskConical } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ProfileUpdateModal } from "./ProfileUpdateModal";
import { supabase } from "../lib/supabase";

export const ProfileMenu = () => {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [demoAccess, setDemoAccess] = useState(
    () => localStorage.getItem("demo-access") === "true",
  );
  const [demoEnabled, setDemoEnabled] = useState(
    () => localStorage.getItem("demo-enabled") === "true",
  );

  useEffect(() => {
    const onAccessGranted = () => setDemoAccess(true);
    const onToggle = (e: Event) => {
      setDemoEnabled((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    };
    window.addEventListener("demo-access-granted", onAccessGranted);
    window.addEventListener("demo-toggle", onToggle);
    return () => {
      window.removeEventListener("demo-access-granted", onAccessGranted);
      window.removeEventListener("demo-toggle", onToggle);
    };
  }, []);

  const handleDemoToggle = () => {
    const next = !demoEnabled;
    setDemoEnabled(next);
    if (next) {
      localStorage.setItem("demo-enabled", "true");
    } else {
      localStorage.removeItem("demo-enabled");
    }
    window.dispatchEvent(
      new CustomEvent("demo-toggle", { detail: { enabled: next } }),
    );
  };

  // Reset avatar error when profile/avatar_url changes
  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error("Sign out failed:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  const handleNukeTrips = async () => {
    if (!user) return;
    if (!confirm("💣 Nuke ALL your trips and data? This cannot be undone."))
      return;
    setIsOpen(false);

    try {
      // Get member profile id
      const { data: profile } = await supabase
        .from("member_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Get all trip ids created by this user
      const { data: trips } = await supabase
        .from("trips")
        .select("id")
        .eq("created_by", profile.id);

      const tripIds = (trips ?? []).map((t) => t.id);

      if (tripIds.length > 0) {
        // Get idea ids for cascade
        const { data: ideas } = await supabase
          .from("trip_reel_ideas")
          .select("id")
          .in("trip_id", tripIds);

        const ideaIds = (ideas ?? []).map((i) => i.id);

        if (ideaIds.length > 0) {
          await supabase
            .from("trip_reel_idea_reactions")
            .delete()
            .in("idea_id", ideaIds);
          await supabase
            .from("trip_reel_idea_comments")
            .delete()
            .in("idea_id", ideaIds);
        }

        await supabase
          .from("trip_reel_shortlist_items")
          .delete()
          .in("trip_id", tripIds);
        await supabase.from("trip_reel_ideas").delete().in("trip_id", tripIds);
        await supabase.from("trip_annotations").delete().in("trip_id", tripIds);
        await supabase
          .from("trip_collaborators")
          .delete()
          .in("trip_id", tripIds);
        await supabase.from("trip_members").delete().in("trip_id", tripIds);
        await supabase.from("trip_itineraries").delete().in("trip_id", tripIds);
        await supabase.from("trips").delete().in("id", tripIds);
      }

      // Clear all trip-related localStorage
      localStorage.removeItem("current-trip-id");
      localStorage.removeItem("generating-suggestions");
      localStorage.removeItem("pending-suggestion-input");
      localStorage.removeItem("building-itinerary");
      // Clear any map-view keys
      Object.keys(localStorage)
        .filter((k) => k.startsWith("map-view-"))
        .forEach((k) => localStorage.removeItem(k));

      window.location.href = "/pretrip";
    } catch (err) {
      console.error("Nuke failed:", err);
      alert("Something went wrong. Check console.");
    }
  };

  const handleUpdateProfile = () => {
    setIsOpen(false);
    setShowProfileModal(true);
  };

  if (!user) {
    return null;
  }

  const displayName =
    profile?.display_name || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div style={{ position: "relative" }} ref={dropdownRef}>
        {/* Profile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.15s ease",
            color: "#374151",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f9fafb";
            e.currentTarget.style.borderColor = "#d1d5db";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "#e5e7eb";
          }}
        >
          {/* Avatar */}
          {profile?.avatar_url && !avatarError ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "600",
              }}
            >
              {initials}
            </div>
          )}

          {/* Name and Chevron */}
          <span
            style={{
              maxWidth: "120px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
          <ChevronDown
            size={16}
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: "0",
              marginTop: "0.5rem",
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              minWidth: "200px",
              zIndex: 2000,
            }}
          >
            {/* User Info Header */}
            <div
              style={{ padding: "0.75rem", borderBottom: "1px solid #f3f4f6" }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {displayName}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                {user.email}
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ padding: "0.25rem" }}>
              <button
                onClick={handleUpdateProfile}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#374151",
                  textAlign: "left",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Settings size={16} />
                Update Travel Profile
              </button>

              {demoAccess && (
                <button
                  onClick={handleDemoToggle}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: demoEnabled ? "#b45309" : "#374151",
                    textAlign: "left",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = demoEnabled ? "#fffbeb" : "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <FlaskConical size={16} />
                  <span style={{ flex: 1 }}>Demo Mode</span>
                  <span
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      width: "28px",
                      height: "16px",
                      borderRadius: "9999px",
                      backgroundColor: demoEnabled ? "#f59e0b" : "#d1d5db",
                      transition: "background-color 0.15s ease",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: "2px",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: "white",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        transition: "transform 0.15s ease",
                        transform: demoEnabled ? "translateX(12px)" : "translateX(0)",
                      }}
                    />
                  </span>
                </button>
              )}

              <button
                onClick={handleNukeTrips}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#dc2626",
                  textAlign: "left",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fef2f2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Trash2 size={16} />
                Nuke User Trips
              </button>

              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "#dc2626",
                  textAlign: "left",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fef2f2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Update Modal */}
      <ProfileUpdateModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
};
