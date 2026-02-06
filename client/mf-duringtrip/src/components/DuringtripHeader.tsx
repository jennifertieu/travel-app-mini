import { useState } from "react";
import { Menu, X } from "lucide-react";

export function DuringtripHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Logo + App Name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-muted rounded" />
          <span className="text-base font-semibold text-foreground">
            TripWeave
          </span>
        </div>

        {/* Center-Right: Post-Itinerary Button */}
        <button
          className="px-4 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
          onClick={() => {
            // TODO: Post-Itinerary flow
            console.log("Post-Itinerary clicked");
          }}
        >
          Post-Itinerary
        </button>

        {/* Right: Hamburger Menu */}
        <button
          className="p-2 text-foreground hover:bg-muted rounded-md transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <nav className="absolute top-full left-0 right-0 bg-background border-b border-border shadow-md">
          <ul className="py-2">
            <li>
              <button
                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors"
                onClick={() => {
                  console.log("Settings clicked");
                  setMenuOpen(false);
                }}
              >
                Settings
              </button>
            </li>
            <li>
              <button
                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors"
                onClick={() => {
                  console.log("Log out clicked");
                  setMenuOpen(false);
                }}
              >
                Log out
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
