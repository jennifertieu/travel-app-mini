"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { generateInviteLink } from "../../lib/collaboration";
import { X, Link, Copy, Check } from "lucide-react";

export function InviteLinkModal() {
  const { isOpen, closeModal, modalData } = useModals();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const tripId = modalData?.inviteLink?.tripId;

  const handleGenerateLink = async () => {
    if (!tripId) return;

    setIsGenerating(true);
    try {
      const link = await generateInviteLink(tripId);
      setInviteLink(link);
    } catch (error) {
      console.error("Failed to generate invite link:", error);
      // Error handling - could add toast notification here
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Fallback for older browsers
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

  const handleClose = () => {
    closeModal("inviteLink");
    setInviteLink(null);
    setIsGenerating(false);
    setCopied(false);
  };

  if (!isOpen("inviteLink")) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transform transition-[transform,opacity] duration-300 scale-100 opacity-100">
        {/* Header */}
        <div className="border-b border-border px-6 py-5 flex items-center justify-between flex-shrink-0 bg-background">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Invite Collaborators
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Share your trip with others
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!inviteLink ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Link className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-2">Generate Invite Link</h3>
                <p className="text-sm text-muted-foreground">
                  Create a shareable link that allows others to join your trip
                  as collaborators. The link will contain your trip ID.
                </p>
              </div>
              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? "Generating..." : "Generate Link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Invite Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-4 py-3 border border-border rounded-lg bg-muted/50 text-sm font-mono"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 mt-2">
                    Copied to clipboard!
                  </p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Share this link with people you want to collaborate with.
                  They'll be able to view and edit all trip details. This is a
                  direct link to your trip.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end flex-shrink-0 bg-background">
          <Button variant="outline" onClick={handleClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
