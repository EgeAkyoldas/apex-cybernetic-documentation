"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuidedSession {
  docType: string;
  totalTopics: number;
  answeredCount: number;
}

interface GuidedProgressProps {
  session: GuidedSession;
  onGenerateNow: () => void;
  onCancel: () => void;
}

export function GuidedProgress({ session, onGenerateNow, onCancel }: GuidedProgressProps) {
  const { docType, totalTopics, answeredCount } = session;
  const pct = totalTopics > 0 ? Math.round((answeredCount / totalTopics) * 100) : 0;
  const canGenerate = pct >= 60;

  const barColor =
    pct >= 80 ? "bg-green-400" : pct >= 60 ? "bg-cyan-400" : "bg-amber-400";
  const textColor =
    pct >= 80 ? "text-green-400" : pct >= 60 ? "text-cyan-400" : "text-amber-400";
  const borderColor =
    pct >= 80
      ? "border-green-400/30"
      : pct >= 60
        ? "border-cyan-400/30"
        : "border-amber-400/30";

  const statusText =
    pct >= 80
      ? "Ready — full coverage"
      : pct >= 60
        ? "Enough to generate, more is better"
        : `Need ≥${Math.ceil(totalTopics * 0.6)} answers to generate`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex-shrink-0 px-4 py-2.5 border-b",
          borderColor,
          "bg-secondary/30"
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <MessageSquare className={cn("w-3.5 h-3.5", textColor)} />
            <span className="text-xs font-mono font-semibold text-foreground">
              Guided: {docType}
            </span>
            <span className={cn("text-xs font-mono", textColor)}>
              {answeredCount}/{totalTopics} answered
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {canGenerate && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={onGenerateNow}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-semibold hover:bg-cyan-500/20 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Generate Now
              </motion.button>
            )}
            <button
              onClick={onCancel}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Cancel guided session"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn("h-full rounded-full", barColor)}
          />
        </div>

        {/* Status text */}
        <p className="text-[10px] font-mono text-muted-foreground mt-1">
          {statusText}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
