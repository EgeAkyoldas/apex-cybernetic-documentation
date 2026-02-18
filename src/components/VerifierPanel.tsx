"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  FileText,
  Zap,
  X,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { parseDocumentBlocks } from "@/lib/utils";

// ── Types ──
export interface VerifierIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  type: string;
  title: string;
  description: string;
  affectedDocs: string[];
  evidence: { doc: string; quote: string }[];
  fix: string;
  targetDoc: string;
}

export type VerifierPhase = "idle" | "verifying" | "ready" | "harmonizing" | "done";

export interface VerifierState {
  phase: VerifierPhase;
  issues: VerifierIssue[];
  summary: string;
  dismissed: string[];
  applied: string[];
  rawReport: string;
}

export const INITIAL_VERIFIER_STATE: VerifierState = {
  phase: "idle",
  issues: [],
  summary: "",
  dismissed: [],
  applied: [],
  rawReport: "",
};

interface VerifierPanelProps {
  documents: Record<string, string>;
  verifierState: VerifierState;
  onVerifierStateChange: (state: VerifierState) => void;
  onDocumentsUpdate: (docs: Record<string, string>) => void;
  onNavigateToDoc: (docType: string) => void;
  onSnapshotVersions: (
    docs: Record<string, string>,
    source: "generated" | "edited" | "harmonized"
  ) => void;
  onReportReady?: (report: string) => void;
}

// ── Helpers ──
function parseSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    case "warning":
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
    default:
      return <Info className="w-3.5 h-3.5 text-blue-400" />;
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "border-red-500/30 bg-red-500/5";
    case "warning":
      return "border-yellow-500/30 bg-yellow-500/5";
    default:
      return "border-blue-500/30 bg-blue-500/5";
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "warning":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  }
}

function parseIssuesFromResponse(text: string): VerifierIssue[] {
  const match = text.match(/~~~issues\s*\n([\s\S]*?)~~~/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

function parseSummaryFromResponse(text: string): string {
  const match = text.match(/~~~summary\s*\n([\s\S]*?)~~~/);
  return match ? match[1].trim() : "";
}

// ── Issue Card ──
function IssueCard({
  issue,
  onNavigateToDoc,
  onApply,
  onDismiss,
  isApplying,
  isDismissed,
  isApplied,
}: {
  issue: VerifierIssue;
  onNavigateToDoc: (doc: string) => void;
  onApply: () => void;
  onDismiss: () => void;
  isApplying: boolean;
  isDismissed: boolean;
  isApplied: boolean;
}) {
  const [expanded, setExpanded] = useState(issue.severity === "critical");

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isApplied ? 0.5 : 1, y: 0 }}
      className={cn(
        "rounded-lg border transition-colors",
        severityColor(issue.severity),
        isApplied && "opacity-50"
      )}
    >
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
        {parseSeverityIcon(issue.severity)}
        <span
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0",
            severityBadge(issue.severity)
          )}
        >
          {issue.id}
        </span>
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {issue.title}
        </span>
        {isApplied && <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
      </button>

      {/* Card Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              {/* Type badge */}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground border border-border">
                {issue.type.replace("_", " ")}
              </span>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {issue.description}
              </p>

              {/* Evidence */}
              {issue.evidence.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Evidence
                  </span>
                  {issue.evidence.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 pl-2 border-l-2 border-border"
                    >
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onNavigateToDoc(e.doc);
                        }}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex-shrink-0 mt-0.5"
                      >
                        {e.doc}
                      </button>
                      <span className="text-[11px] text-muted-foreground italic">
                        &ldquo;{e.quote}&rdquo;
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Affected Documents */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <FileText className="w-3 h-3 text-muted-foreground" />
                {issue.affectedDocs.map((doc) => (
                  <button
                    key={doc}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onNavigateToDoc(doc);
                    }}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                  >
                    {doc}
                  </button>
                ))}
              </div>

              {/* Proposed Fix */}
              <div className="p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                  Proposed Fix → {issue.targetDoc}
                </span>
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  {issue.fix}
                </p>
              </div>

              {/* Actions */}
              {!isApplied && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onApply();
                    }}
                    disabled={isApplying}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    {isApplying ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wrench className="w-3 h-3" />
                    )}
                    Apply Fix
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onDismiss();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/50 border border-border text-muted-foreground text-[11px] font-mono hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Panel ──
export function VerifierPanel({
  documents,
  verifierState,
  onVerifierStateChange,
  onDocumentsUpdate,
  onNavigateToDoc,
  onSnapshotVersions,
  onReportReady,
}: VerifierPanelProps) {
  // Controlled state from parent — survives tab switches
  const { phase, issues, summary } = verifierState;
  const dismissed = new Set(verifierState.dismissed);
  const applied = new Set(verifierState.applied);

  // Ephemeral local state (only needed during active operations)
  const [streamingText, setStreamingText] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const docCount = Object.keys(documents).length;

  // Helper to update parent state
  const updateState = (patch: Partial<VerifierState>) => {
    onVerifierStateChange({ ...verifierState, ...patch });
  };

  // ── VERIFY ──
  const runVerify = useCallback(async () => {
    if (docCount < 2) return;
    updateState({ phase: "verifying", issues: [], summary: "", dismissed: [], applied: [], rawReport: "" });
    setStreamingText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents, mode: "verify" }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  full += parsed.text;
                  setStreamingText(full);
                }
              } catch {
                /* ignore */
              }
            }
          }
        }
      }

      const parsedIssues = parseIssuesFromResponse(full);
      const parsedSummary = parseSummaryFromResponse(full);
      updateState({ phase: "ready", issues: parsedIssues, summary: parsedSummary, rawReport: full });
      onReportReady?.(full);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        updateState({ phase: "idle" });
      } else {
        updateState({ phase: "ready", summary: "⚠️ Verification failed. Please try again." });
      }
    } finally {
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, docCount]);

  // ── APPLY SINGLE FIX ──
  const applySingleFix = useCallback(
    async (issue: VerifierIssue) => {
      setApplyingId(issue.id);
      try {
        // Snapshot before change
        onSnapshotVersions(documents, "harmonized");

        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documents,
            mode: "harmonize",
            report: `Fix the following issue:\n\nID: ${issue.id}\nTitle: ${issue.title}\nTarget Document: ${issue.targetDoc}\nFix: ${issue.fix}\nDescription: ${issue.description}`,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let full = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) full += parsed.text;
                } catch {
                  /* ignore */
                }
              }
            }
          }
        }

        const { documents: correctedDocs } = parseDocumentBlocks(full);
        if (Object.keys(correctedDocs).length > 0) {
          onDocumentsUpdate(correctedDocs);
        }
        updateState({ applied: [...verifierState.applied, issue.id] });
      } catch {
        /* show nothing — user sees button is back */
      } finally {
        setApplyingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documents, onDocumentsUpdate, onSnapshotVersions, verifierState]
  );

  // ── APPLY ALL FIXES ──
  const applyAllFixes = useCallback(async () => {
    const remaining = issues.filter(
      (i) => !dismissed.has(i.id) && !applied.has(i.id) && i.severity !== "info"
    );
    if (remaining.length === 0) return;

    updateState({ phase: "harmonizing" });

    // Snapshot before changes
    onSnapshotVersions(documents, "harmonized");

    try {
      const issuesText = remaining
        .map(
          (i) =>
            `- ${i.id} (${i.severity}): ${i.title}\n  Target: ${i.targetDoc}\n  Fix: ${i.fix}`
        )
        .join("\n\n");

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents,
          mode: "harmonize",
          report: `Fix ALL of the following issues:\n\n${issuesText}`,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) full += parsed.text;
              } catch {
                /* ignore */
              }
            }
          }
        }
      }

      const { documents: correctedDocs } = parseDocumentBlocks(full);
      if (Object.keys(correctedDocs).length > 0) {
        onDocumentsUpdate(correctedDocs);
      }
      updateState({
        phase: "done",
        applied: [...verifierState.applied, ...remaining.map((i) => i.id)],
      });
    } catch {
      updateState({ phase: "ready" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, dismissed, applied, documents, onDocumentsUpdate, onSnapshotVersions, verifierState]);

  // ── Counts ──
  const counts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };

  const entropyScore =
    counts.critical > 0
      ? "CRITICAL"
      : counts.warning > 2
        ? "HIGH"
        : counts.warning > 0
          ? "MEDIUM"
          : "LOW";

  const entropyColor = {
    CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
    HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    LOW: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  }[entropyScore];

  return (
    <div className="h-full flex flex-col">
      {/* IDLE */}
      {phase === "idle" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-cyan-400/60" />
          </div>
          <h3 className="font-mono font-semibold text-foreground text-sm mb-1">
            Cybernetic Verifier
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-5">
            Analyze {docCount} document{docCount !== 1 ? "s" : ""} for
            inconsistencies, contradictions, and complexity drift.
          </p>
          {docCount < 2 ? (
            <p className="text-[11px] text-yellow-400 font-mono">
              ⚠ At least 2 documents needed
            </p>
          ) : (
            <motion.button
              onClick={runVerify}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 text-black font-mono font-semibold text-xs hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              Run Verification
            </motion.button>
          )}
        </div>
      )}

      {/* VERIFYING */}
      {phase === "verifying" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-cyan-400">
              Analyzing document suite...
            </span>
            <button
              onClick={() => {
                abortRef.current?.abort();
                updateState({ phase: "idle" });
              }}
              className="ml-auto text-[10px] font-mono text-muted-foreground hover:text-destructive"
            >
              Cancel
            </button>
          </div>
          <div className="prose prose-invert prose-xs max-w-none text-xs opacity-50">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {streamingText.slice(0, 500) + (streamingText.length > 500 ? "..." : "")}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* READY / DONE */}
      {(phase === "ready" || phase === "done" || phase === "harmonizing") && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Summary Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-semibold text-foreground">
                  Telemetry Report
                </span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                  entropyColor
                )}
              >
                {entropyScore}
              </span>
            </div>

            {/* Severity pills */}
            <div className="flex items-center gap-2">
              {counts.critical > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {counts.critical} critical
                </span>
              )}
              {counts.warning > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  {counts.warning} warning
                </span>
              )}
              {counts.info > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {counts.info} info
                </span>
              )}
              {issues.length === 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Homeostasis
                </span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {docCount} docs analyzed
              </span>
            </div>
          </div>

          {/* Issues List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Cross-Reference Summary */}
            {summary && (
              <details className="group mb-2">
                <summary className="cursor-pointer text-[10px] font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                  Cross-Reference Matrix
                </summary>
                <div className="mt-2 prose prose-invert prose-xs max-w-none text-xs overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summary}
                  </ReactMarkdown>
                </div>
              </details>
            )}

            {/* Issue Cards */}
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onNavigateToDoc={onNavigateToDoc}
                onApply={() => applySingleFix(issue)}
                onDismiss={() =>
                  updateState({ dismissed: [...verifierState.dismissed, issue.id] })
                }
                isApplying={applyingId === issue.id}
                isDismissed={dismissed.has(issue.id)}
                isApplied={applied.has(issue.id)}
              />
            ))}

            {/* Harmonizing indicator */}
            {phase === "harmonizing" && (
              <div className="flex items-center gap-2 py-3 justify-center">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-xs font-mono text-amber-400">
                  Harmonizing documents...
                </span>
              </div>
            )}

            {/* Done message */}
            {phase === "done" && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono text-emerald-400">
                  All fixes applied — documents updated
                </span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 border-t border-border px-3 py-2.5 flex items-center gap-2">
            {(phase === "ready" || phase === "done") && (
              <>
                {phase === "ready" &&
                  issues.some(
                    (i) =>
                      !dismissed.has(i.id) &&
                      !applied.has(i.id) &&
                      i.severity !== "info"
                  ) && (
                    <motion.button
                      onClick={applyAllFixes}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-semibold hover:bg-amber-500/20 transition-colors"
                    >
                      <Wrench className="w-3 h-3" />
                      Apply All Fixes
                    </motion.button>
                  )}
                <motion.button
                  onClick={() => {
                    updateState({ ...INITIAL_VERIFIER_STATE });
                    setStreamingText("");
                    setTimeout(runVerify, 100);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-muted-foreground font-mono text-[11px] hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-Verify
                </motion.button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
