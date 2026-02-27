import { useState, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

async function generateInviteLink(tripId: string): Promise<string> {
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .single();

  if (tripError) {
    throw new Error(`Trip not found: ${tripError.message}`);
  }

  return `${window.location.origin}/join/${tripId}`;
}

interface ShellInviteLinkModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShellInviteLinkModal({
  tripId,
  isOpen,
  onClose,
}: ShellInviteLinkModalProps) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !tripId) return;

    setInviteLink(null);
    setError(null);
    setIsGenerating(true);
    setCopied(false);

    generateInviteLink(tripId)
      .then(setInviteLink)
      .catch((err) => {
        console.error("Failed to generate invite link:", err);
        setError(err instanceof Error ? err.message : "Failed to generate link");
      })
      .finally(() => setIsGenerating(false));
  }, [isOpen, tripId]);

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsGenerating(true);
    generateInviteLink(tripId)
      .then(setInviteLink)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to generate link");
      })
      .finally(() => setIsGenerating(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between flex-shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">
              Invite Collaborators
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Share your trip with others
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isGenerating ? (
            <div className="space-y-4">
              <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-4 w-[75%] rounded bg-gray-100 animate-pulse" />
            </div>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={handleRetry}
                className="w-full px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Retry
              </button>
            </div>
          ) : inviteLink ? (
            <div className="space-y-4">
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                      copied
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 mt-2">
                    Copied to clipboard!
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Anyone with this link can join your trip as a collaborator.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
