import { LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ProfileMenu } from "./ProfileMenu";

export const AuthNav = () => {
  const { user, loading, signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
      alert("Failed to sign in. Please try again.");
    }
  };

  if (loading) {
    return null;
    return (
      <div
        style={{ marginLeft: "auto", color: "#9ca3af", fontSize: "0.8125rem" }}
      >
        Loading...
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
    <div style={{ marginLeft: "auto" }}>
      <ProfileMenu />
    </div>
  );
};
