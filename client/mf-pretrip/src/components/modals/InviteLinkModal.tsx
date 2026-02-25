"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { generateInviteLink } from "../../lib/collaboration";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check } from "lucide-react";

export function InviteLinkModal() {
  const { isOpen, closeModal, modalData } = useModals();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tripId = modalData?.inviteLink?.tripId;
  const showModal = isOpen("inviteLink");

  // Auto-generate link when modal opens
  useEffect(() => {
    if (!showModal || !tripId) return;

    setInviteLink(null);
    setError(null);
    setIsGenerating(true);

    const generate = async () => {
      try {
        const link = await generateInviteLink(tripId);
        setInviteLink(link);
      } catch (err) {
        console.error("Failed to generate invite link:", err);
        setError(err instanceof Error ? err.message : "Failed to generate link");
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [showModal, tripId]);

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
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
    if (tripId) {
      generateInviteLink(tripId)
        .then(setInviteLink)
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to generate link");
        })
        .finally(() => setIsGenerating(false));
    }
  };

  const handleClose = () => {
    closeModal("inviteLink");
    setInviteLink(null);
    setIsGenerating(true);
    setError(null);
    setCopied(false);
  };

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          key="invite-link-modal"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
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
            <div className="p-6 space-y-4">
            {isGenerating ? (
              <div className="space-y-4">
                <div className="h-12 rounded-lg bg-muted/60 animate-pulse" />
                <div className="h-4 w-[75%] rounded bg-muted/40 animate-pulse" />
              </div>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button onClick={handleRetry} variant="outline" className="w-full">
                  Retry
                </Button>
              </div>
            ) : inviteLink ? (
              <div className="space-y-4">
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-4 py-3 border border-border rounded-lg bg-muted/50 text-sm font-mono truncate"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant={copied ? "default" : "outline"}
                      size="default"
                      className={`shrink-0 px-4 transition-colors ${
                        copied ? "bg-green-600 hover:bg-green-600" : ""
                      }`}
                    >
                      <motion.span
                        key={copied ? "check" : "copy"}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.15 }}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </motion.span>
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-sm text-green-600 mt-2">Copied to clipboard!</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can join your trip as a collaborator.
                </p>
              </div>
            ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
