import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const AuthNav = () => {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
      alert("Failed to sign in. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ marginLeft: "auto", color: "#9ca3af", fontSize: "0.8125rem" }}>
        ...
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.4rem 0.75rem",
          backgroundColor: "transparent",
          color: "#6b7280",
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontSize: "0.8125rem",
          fontWeight: "400",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#f9fafb";
          e.currentTarget.style.borderColor = "#d1d5db";
          e.currentTarget.style.color = "#374151";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.borderColor = "#e5e7eb";
          e.currentTarget.style.color = "#6b7280";
        }}
      >
        <LogIn size={14} />
        Sign in
      </button>
    );
  }

  return (
    <div
      style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
        {profile?.display_name || user.email}
      </span>
      <button
        onClick={handleSignOut}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.4rem 0.75rem",
          backgroundColor: "transparent",
          color: "#9ca3af",
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontSize: "0.8125rem",
          fontWeight: "400",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#f9fafb";
          e.currentTarget.style.color = "#6b7280";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#9ca3af";
        }}
      >
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  );
};
