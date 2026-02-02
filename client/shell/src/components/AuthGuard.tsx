import { LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
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
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontSize: "0.875rem",
          color: "#9ca3af",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "360px",
            display: "flex",
            flexDirection: "column",
            gap: "2rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "500",
                color: "#374151",
                margin: "0 0 0.75rem 0",
                letterSpacing: "-0.01em",
              }}
            >
              Travel App
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#9ca3af",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              Sign in to access your trips and continue planning
            </p>
          </div>
          <button
            onClick={handleSignIn}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.25rem",
              backgroundColor: "#ffffff",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "400",
              width: "100%",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f9fafb";
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <LogIn size={16} />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
