import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Save,
  MapPin,
  UtensilsCrossed,
  TreePine,
  Music,
  Landmark,
  Camera,
  Building2,
  ShoppingBag,
  Dumbbell,
  Palette,
  Globe,
  Mic2,
  BookOpen,
  Leaf,
  WheatOff,
  Milk,
  NutOff,
  Fish,
  User,
  Footprints,
  Compass,
  Check,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

interface ProfileUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRAVEL_STYLES = [
  { value: "chill", label: "Chill", sub: "Easy pace" },
  { value: "balanced", label: "Balanced", sub: "Best of both" },
  { value: "packed", label: "Packed", sub: "See it all" },
];

const WALKING_TOLERANCE = [
  { value: "low", label: "Light", dots: 1 },
  { value: "medium", label: "Moderate", dots: 2 },
  { value: "high", label: "Heavy", dots: 3 },
];

const INTERESTS = [
  { label: "Food & Dining", icon: UtensilsCrossed },
  { label: "Museums & Culture", icon: BookOpen },
  { label: "Nature & Outdoors", icon: TreePine },
  { label: "Shopping", icon: ShoppingBag },
  { label: "Nightlife", icon: Music },
  { label: "Photography", icon: Camera },
  { label: "History", icon: Landmark },
  { label: "Architecture", icon: Building2 },
  { label: "Adventure Sports", icon: Dumbbell },
  { label: "Local Experiences", icon: Globe },
  { label: "Art & Galleries", icon: Palette },
  { label: "Music & Entertainment", icon: Mic2 },
];

const DIETARY_OPTIONS = [
  { label: "Vegetarian", icon: Leaf },
  { label: "Vegan", icon: Leaf },
  { label: "Gluten-Free", icon: WheatOff },
  { label: "Dairy-Free", icon: Milk },
  { label: "Nut Allergy", icon: NutOff },
  { label: "Halal", icon: Globe },
  { label: "Kosher", icon: Globe },
  { label: "Pescatarian", icon: Fish },
  { label: "Keto", icon: Leaf },
  { label: "Low-Carb", icon: Leaf },
];

// Hash name to one of several muted colors
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface NominatimResult {
  display_name: string;
  place_id: number;
}

type FormData = {
  display_name: string;
  hometown: string;
  travel_style: string;
  walking_tolerance: string;
  interests: string[];
  dietary: string[];
};

function formsDiffer(a: FormData, b: FormData) {
  return (
    a.display_name !== b.display_name ||
    a.hometown !== b.hometown ||
    a.travel_style !== b.travel_style ||
    a.walking_tolerance !== b.walking_tolerance ||
    JSON.stringify([...a.interests].sort()) !==
      JSON.stringify([...b.interests].sort()) ||
    JSON.stringify([...a.dietary].sort()) !==
      JSON.stringify([...b.dietary].sort())
  );
}

// Profile completion score
function completionScore(f: FormData) {
  let filled = 0;
  if (f.display_name) filled++;
  if (f.hometown) filled++;
  if (f.travel_style) filled++;
  if (f.walking_tolerance) filled++;
  if (f.interests.length > 0) filled++;
  if (f.dietary.length > 0) filled++;
  return Math.round((filled / 6) * 100);
}

export const ProfileUpdateModal: React.FC<ProfileUpdateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hometownSuggestions, setHometownSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const hometownDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const emptyForm: FormData = {
    display_name: "",
    hometown: "",
    travel_style: "",
    walking_tolerance: "",
    interests: [],
    dietary: [],
  };

  const [originalData, setOriginalData] = useState<FormData>(emptyForm);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  useEffect(() => {
    if (isOpen && profile) {
      const initial: FormData = {
        display_name: profile.display_name || "",
        hometown: profile.hometown || "",
        travel_style: profile.travel_style || "",
        walking_tolerance: profile.walking_tolerance || "",
        interests: profile.interests || [],
        dietary: profile.dietary || [],
      };
      setFormData(initial);
      setOriginalData(initial);
    }
  }, [isOpen, profile]);

  const isDirty = useMemo(
    () => formsDiffer(formData, originalData),
    [formData, originalData],
  );
  const completion = useMemo(() => completionScore(formData), [formData]);

  const searchHometown = (query: string) => {
    if (hometownDebounceRef.current) clearTimeout(hometownDebounceRef.current);
    if (!query || query.length < 2) {
      setHometownSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    hometownDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&featuretype=city`,
          { headers: { "Accept-Language": "en" } },
        );
        const data: NominatimResult[] = await res.json();
        setHometownSuggestions(data.map((r) => r.display_name));
        setShowSuggestions(true);
      } catch {
        setHometownSuggestions([]);
      }
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !isDirty) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("member_profiles")
        .update({
          display_name: formData.display_name,
          hometown: formData.hometown || null,
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
      window.location.reload();
    } catch (error) {
      console.error("Unexpected error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) =>
    array.includes(item) ? array.filter((i) => i !== item) : [...array, item];

  const initials = formData.display_name
    ? formData.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const avatarColor = getAvatarColor(formData.display_name || "?");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={formData.display_name || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center text-sm font-semibold ${avatarColor}`}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                  Travel Profile
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Personalize your travel preferences
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>

          {/* Completion bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">
                Profile completeness
              </span>
              <span className="text-xs font-semibold text-gray-600">
                {completion}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Display Name + Hometown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Hometown
              </label>
              <div className="relative" ref={suggestionsRef}>
                <MapPin
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                />
                <input
                  type="text"
                  value={formData.hometown}
                  onChange={(e) => {
                    setFormData({ ...formData, hometown: e.target.value });
                    searchHometown(e.target.value);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 150)
                  }
                  onFocus={() => {
                    if (hometownSuggestions.length > 0)
                      setShowSuggestions(true);
                  }}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, Country"
                />
                {showSuggestions && hometownSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    {hometownSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => {
                          setFormData({ ...formData, hometown: suggestion });
                          setShowSuggestions(false);
                          setHometownSuggestions([]);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Travel Style */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Compass size={13} className="text-gray-400" />
              Travel Style
            </label>
            <div className="flex gap-2">
              {TRAVEL_STYLES.map((style) => {
                const active = formData.travel_style === style.value;
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, travel_style: style.value })
                    }
                    className={`flex-1 py-2.5 px-3 rounded-lg border transition-all text-left ${
                      active
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{style.label}</span>
                      {active && (
                        <Check size={13} className="text-white opacity-80" />
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${active ? "text-gray-300" : "text-gray-400"}`}
                    >
                      {style.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Walking Tolerance */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Footprints size={13} className="text-gray-400" />
              Walking Tolerance
            </label>
            <div className="flex gap-2">
              {WALKING_TOLERANCE.map((t) => {
                const active = formData.walking_tolerance === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, walking_tolerance: t.value })
                    }
                    className={`flex-1 py-2.5 px-3 rounded-lg border transition-all text-left ${
                      active
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{t.label}</span>
                      {active && (
                        <Check size={13} className="text-white opacity-80" />
                      )}
                    </div>
                    {/* Dot indicator */}
                    <div className="flex gap-1">
                      {[1, 2, 3].map((d) => (
                        <div
                          key={d}
                          className={`w-1.5 h-1.5 rounded-full ${
                            d <= t.dots
                              ? active
                                ? "bg-white opacity-70"
                                : "bg-gray-400"
                              : active
                                ? "bg-white opacity-20"
                                : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Interests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Interests
              </label>
              {formData.interests.length > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {formData.interests.length} selected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(({ label, icon: Icon }) => {
                const active = formData.interests.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        interests: toggleArrayItem(formData.interests, label),
                      })
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                      active
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {active ? <Check size={12} /> : <Icon size={12} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Dietary Restrictions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Dietary Restrictions
              </label>
              {formData.dietary.length > 0 && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {formData.dietary.length} selected
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map(({ label, icon: Icon }) => {
                const active = formData.dietary.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        dietary: toggleArrayItem(formData.dietary, label),
                      })
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                      active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {active ? <Check size={12} /> : <Icon size={12} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isDirty}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                isDirty && !loading
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Save size={15} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
