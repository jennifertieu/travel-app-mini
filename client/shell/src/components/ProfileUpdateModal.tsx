import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { MemberProfile } from "../types/auth";

interface ProfileUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRAVEL_STYLES = [
  { value: "chill", label: "Chill - Relaxed pace with plenty of downtime" },
  { value: "balanced", label: "Balanced - Mix of activities and relaxation" },
  { value: "packed", label: "Packed - Action-packed with lots of activities" },
];

const WALKING_TOLERANCE = [
  { value: "low", label: "Low - Prefer minimal walking" },
  { value: "medium", label: "Medium - Comfortable with moderate walking" },
  { value: "high", label: "High - Love long walks and hiking" },
];

const COMMON_INTERESTS = [
  "Food & Dining",
  "Museums & Culture",
  "Nature & Outdoors",
  "Shopping",
  "Nightlife",
  "Photography",
  "History",
  "Architecture",
  "Adventure Sports",
  "Local Experiences",
  "Art & Galleries",
  "Music & Entertainment",
];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut Allergy",
  "Halal",
  "Kosher",
  "Pescatarian",
  "Keto",
  "Low-Carb",
];

export const ProfileUpdateModal: React.FC<ProfileUpdateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    travel_style: "",
    walking_tolerance: "",
    interests: [] as string[],
    dietary: [] as string[],
  });

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        display_name: profile.display_name || "",
        travel_style: profile.travel_style || "",
        walking_tolerance: profile.walking_tolerance || "",
        interests: profile.interests || [],
        dietary: profile.dietary || [],
      });
    }
  }, [isOpen, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("member_profiles")
        .update({
          display_name: formData.display_name,
          travel_style: formData.travel_style || null,
          walking_tolerance: formData.walking_tolerance || null,
          interests: formData.interests,
          dietary: formData.dietary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
        return;
      }

      // Refresh the page to update the auth context
      window.location.reload();
    } catch (error) {
      console.error("Unexpected error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.5rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}
          >
            Update Travel Profile
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {/* Display Name */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) =>
                setFormData({ ...formData, display_name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                boxSizing: "border-box",
              }}
              placeholder="Enter your display name"
            />
          </div>

          {/* Travel Style */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Travel Style
            </label>
            <select
              value={formData.travel_style}
              onChange={(e) =>
                setFormData({ ...formData, travel_style: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                backgroundColor: "white",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select your travel style</option>
              {TRAVEL_STYLES.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>

          {/* Walking Tolerance */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Walking Tolerance
            </label>
            <select
              value={formData.walking_tolerance}
              onChange={(e) =>
                setFormData({ ...formData, walking_tolerance: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                backgroundColor: "white",
                boxSizing: "border-box",
              }}
            >
              <option value="">Select your walking preference</option>
              {WALKING_TOLERANCE.map((tolerance) => (
                <option key={tolerance.value} value={tolerance.value}>
                  {tolerance.label}
                </option>
              ))}
            </select>
          </div>

          {/* Interests */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Interests
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {COMMON_INTERESTS.map((interest) => (
                <label
                  key={interest}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    backgroundColor: formData.interests.includes(interest)
                      ? "#eff6ff"
                      : "white",
                    borderColor: formData.interests.includes(interest)
                      ? "#3b82f6"
                      : "#e5e7eb",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        interests: toggleArrayItem(
                          formData.interests,
                          interest,
                        ),
                      })
                    }
                    style={{ margin: 0 }}
                  />
                  {interest}
                </label>
              ))}
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div style={{ marginBottom: "2rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Dietary Restrictions
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {DIETARY_OPTIONS.map((dietary) => (
                <label
                  key={dietary}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    backgroundColor: formData.dietary.includes(dietary)
                      ? "#fef3c7"
                      : "white",
                    borderColor: formData.dietary.includes(dietary)
                      ? "#f59e0b"
                      : "#e5e7eb",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.dietary.includes(dietary)}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        dietary: toggleArrayItem(formData.dietary, dietary),
                      })
                    }
                    style={{ margin: 0 }}
                  />
                  {dietary}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "#374151",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                border: "none",
                borderRadius: "0.5rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                color: "white",
                fontWeight: "500",
              }}
            >
              <Save size={16} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
