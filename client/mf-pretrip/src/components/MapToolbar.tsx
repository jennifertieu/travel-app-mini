"use client";

import * as React from "react";
import {
  Square,
  Pentagon,
  Pencil,
  Keyboard,
  LocateFixed,
  Hand,
} from "lucide-react";
import { motion, type Variants, type Transition } from "motion/react";
import { cn } from "../lib/utils";
import type { MemberProfile } from "../contexts/MemberContext";

// ── Animation config (inspired by animate-ui ManagementBar) ──────────────
const TOOL_BUTTON_MOTION = {
  initial: "rest",
  whileHover: "hover",
  whileTap: "tap",
  variants: {
    rest: { width: 36 },
    hover: {
      width: "auto",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 35,
        delay: 0.15,
      },
    },
    tap: { scale: 0.95 },
  },
  transition: { type: "spring", stiffness: 250, damping: 25 } as Transition,
} as const;

const LABEL_VARIANTS: Variants = {
  rest: { opacity: 0, width: 0, marginLeft: 0 },
  hover: { opacity: 1, width: "auto", marginLeft: 6 },
  tap: { opacity: 1, width: "auto", marginLeft: 6 },
};

const LABEL_TRANSITION: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

// ── Types ────────────────────────────────────────────────────────────────
export interface DrawingColor {
  value: string;
  label: string;
}

export interface MapToolbarProps {
  onlineUsers: MemberProfile[];
  isDrawMode: boolean;
  onDrawModeToggle: (enabled: boolean) => void;
  drawTool: "polygon" | "rect" | "path";
  onDrawToolChange: (tool: "polygon" | "rect" | "path") => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  drawingColors: DrawingColor[];
  onShortcutsOpen: () => void;
  onRecenter: () => void;
}

// ── Tool definitions ─────────────────────────────────────────────────────
const TOOLS = [
  { id: "rect" as const, label: "Rectangle", icon: Square, shortcut: "R" },
  { id: "polygon" as const, label: "Polygon", icon: Pentagon, shortcut: "P" },
  { id: "path" as const, label: "Freeform", icon: Pencil, shortcut: null },
];

// ── Component ────────────────────────────────────────────────────────────
export function MapToolbar({
  onlineUsers,
  isDrawMode,
  onDrawModeToggle,
  drawTool,
  onDrawToolChange,
  selectedColor,
  onColorChange,
  drawingColors,
  onShortcutsOpen,
  onRecenter,
}: MapToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="flex items-center gap-1 px-2 py-1.5 bg-background/90 backdrop-blur-md border border-border/50 rounded-full shadow-lg"
      >
        {/* ── Online Users Section ─────────────────────────────── */}
        <div className="flex items-center gap-2 px-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>

          {onlineUsers.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((user) => {
                  const displayName =
                    user.displayName?.trim() || `User ${user.id.slice(0, 4)}`;
                  const initial = displayName[0]?.toUpperCase() || "?";
                  return (
                    <div
                      key={user.id}
                      className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold"
                      title={displayName}
                    >
                      {initial}
                    </div>
                  );
                })}
                {onlineUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium">
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {onlineUsers.length} online
              </span>
            </>
          ) : (
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Only you
            </span>
          )}
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="w-px h-5 bg-border/60 mx-1" />

        {/* ── Drawing Tools Section ────────────────────────────── */}
        <div className="flex items-center gap-1">
          {/* Pan / Select tool */}
          <motion.button
            {...TOOL_BUTTON_MOTION}
            onClick={() => onDrawModeToggle(false)}
            className={cn(
              "relative flex items-center justify-center h-9 rounded-full overflow-hidden cursor-pointer transition-colors",
              !isDrawMode
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
            title="Pan (V)"
          >
            <div className="flex items-center px-2.5">
              <Hand className="h-4 w-4 flex-shrink-0" />
              <motion.span
                variants={LABEL_VARIANTS}
                transition={LABEL_TRANSITION}
                className="text-xs font-medium whitespace-nowrap overflow-hidden"
              >
                Grab
              </motion.span>
            </div>
          </motion.button>

          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = isDrawMode && drawTool === tool.id;

            return (
              <motion.button
                key={tool.id}
                {...TOOL_BUTTON_MOTION}
                onClick={() => {
                  if (isActive) {
                    // Clicking active tool deactivates draw mode
                    onDrawModeToggle(false);
                  } else {
                    onDrawToolChange(tool.id);
                    if (!isDrawMode) onDrawModeToggle(true);
                  }
                }}
                className={cn(
                  "relative flex items-center justify-center h-9 rounded-full overflow-hidden cursor-pointer transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
                title={
                  tool.shortcut
                    ? `${tool.label} (${tool.shortcut})`
                    : tool.label
                }
              >
                <div className="flex items-center px-2.5">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <motion.span
                    variants={LABEL_VARIANTS}
                    transition={LABEL_TRANSITION}
                    className="text-xs font-medium whitespace-nowrap overflow-hidden"
                  >
                    {tool.label}
                  </motion.span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Color Swatches (visible when draw mode active) ──── */}
        <motion.div
          initial={false}
          animate={
            isDrawMode
              ? { width: "auto", opacity: 1 }
              : { width: 0, opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="overflow-hidden flex items-center"
        >
          <div className="w-px h-5 bg-border/60 mx-1.5" />
          <div className="flex items-center gap-2.5 px-1.5">
            {drawingColors.map((color) => (
              <button
                key={color.value}
                onClick={() => onColorChange(color.value)}
                className={cn(
                  "w-5 h-5 rounded-full transition-all flex-shrink-0",
                  selectedColor === color.value
                    ? "ring-[1.5px] ring-foreground/30 ring-offset-[2.5px] ring-offset-background/90 scale-[1.15]"
                    : "hover:scale-105",
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
                aria-label={`Select ${color.label} color`}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Recenter & Keyboard Shortcuts ─────────────────────── */}
        <div className="w-px h-5 bg-border/60 mx-1" />
        <button
          onClick={onRecenter}
          className="flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Recenter map"
          aria-label="Recenter map"
        >
          <LocateFixed className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onShortcutsOpen}
          className="flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </div>
  );
}
