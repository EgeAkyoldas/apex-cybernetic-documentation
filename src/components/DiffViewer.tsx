"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, Bot, Pencil, Wrench, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocVersion } from "@/lib/storage";

// ── Diff Algorithm ──
// Simple LCS-based line diff — sufficient for markdown documents

interface DiffLine {
  type: "add" | "remove" | "same";
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({
        type: "same",
        content: oldLines[i - 1],
        oldLineNo: i,
        newLineNo: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "add", content: newLines[j - 1], newLineNo: j });
      j--;
    } else {
      result.push({
        type: "remove",
        content: oldLines[i - 1],
        oldLineNo: i,
      });
      i--;
    }
  }

  return result.reverse();
}

// ── Source Badge ──
function SourceBadge({ source }: { source: DocVersion["source"] }) {
  const config = {
    generated: { icon: Bot, label: "Generated", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
    edited: { icon: Pencil, label: "Edited", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
    harmonized: { icon: Wrench, label: "Harmonized", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  }[source];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border", config.color)}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

// ── Version Selector ──
function VersionSelector({
  versions,
  selected,
  onSelect,
}: {
  versions: DocVersion[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const current = versions[selected];
  const time = new Date(current.timestamp);
  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-cyan-500/30 transition-all"
      >
        <Clock className="w-3 h-3 text-cyan-400" />
        <span>{dateStr} · {timeStr}</span>
        <SourceBadge source={current.source} />
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 z-50 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-2 max-h-48 overflow-y-auto scrollbar-thin">
              {versions.map((v, idx) => {
                const t = new Date(v.timestamp);
                const tStr = t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
                const dStr = t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <button
                    key={`${v.timestamp}-${idx}`}
                    onClick={() => { onSelect(idx); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-colors",
                      selected === idx
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground w-16">{dStr}</span>
                    <span className="text-[10px] w-10">{tStr}</span>
                    <SourceBadge source={v.source} />
                    {selected === idx && (
                      <span className="ml-auto text-[9px] text-cyan-400">● active</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main DiffViewer ──
interface DiffViewerProps {
  currentContent: string;
  versions: DocVersion[];
  docType: string;
}

export function DiffViewer({ currentContent, versions, docType }: DiffViewerProps) {
  // Sort versions newest first for dropdown, but we diff oldest→current
  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.timestamp - a.timestamp),
    [versions]
  );

  const [selectedIdx, setSelectedIdx] = useState(0); // most recent version by default

  const selectedVersion = sortedVersions[selectedIdx];

  const diff = useMemo(
    () => computeDiff(selectedVersion.content, currentContent),
    [selectedVersion.content, currentContent]
  );

  const stats = useMemo(() => {
    const added = diff.filter((l) => l.type === "add").length;
    const removed = diff.filter((l) => l.type === "remove").length;
    return { added, removed };
  }, [diff]);

  const isIdentical = stats.added === 0 && stats.removed === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Comparing
          </span>

          <VersionSelector
            versions={sortedVersions}
            selected={selectedIdx}
            onSelect={setSelectedIdx}
          />

          <ArrowRight className="w-3 h-3 text-muted-foreground" />

          <span className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono">
            Current
          </span>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-2">
            {stats.added > 0 && (
              <span className="text-[10px] font-mono text-emerald-400">+{stats.added}</span>
            )}
            {stats.removed > 0 && (
              <span className="text-[10px] font-mono text-red-400">-{stats.removed}</span>
            )}
            {isIdentical && (
              <span className="text-[10px] font-mono text-muted-foreground">No changes</span>
            )}
          </div>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto">
        {isIdentical ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-mono">
            Content is identical to selected version
          </div>
        ) : (
          <div className="font-mono text-xs leading-relaxed">
            {diff.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex border-b border-border/30 min-h-[1.5rem]",
                  line.type === "add" && "bg-emerald-500/8",
                  line.type === "remove" && "bg-red-500/8"
                )}
              >
                {/* Line numbers */}
                <div className="flex-shrink-0 w-10 text-right pr-2 select-none border-r border-border/20 text-muted-foreground/40 leading-relaxed">
                  {line.oldLineNo ?? ""}
                </div>
                <div className="flex-shrink-0 w-10 text-right pr-2 select-none border-r border-border/20 text-muted-foreground/40 leading-relaxed">
                  {line.newLineNo ?? ""}
                </div>

                {/* Marker */}
                <div
                  className={cn(
                    "flex-shrink-0 w-5 text-center select-none font-bold leading-relaxed",
                    line.type === "add" && "text-emerald-400",
                    line.type === "remove" && "text-red-400",
                    line.type === "same" && "text-transparent"
                  )}
                >
                  {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 px-2 whitespace-pre-wrap break-all leading-relaxed",
                    line.type === "add" && "text-emerald-300",
                    line.type === "remove" && "text-red-300 line-through opacity-70",
                    line.type === "same" && "text-foreground/60"
                  )}
                >
                  {line.content || "\u00A0"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
