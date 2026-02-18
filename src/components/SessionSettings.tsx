"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Check, Pencil } from "lucide-react";
import {
  DEFAULT_DOC_DEFINITIONS,
  COLOR_MAP,
  type DocDefinition,
} from "@/lib/doc-definitions";
import { cn } from "@/lib/utils";

interface SessionSettingsProps {
  open: boolean;
  customInstructions: Record<string, string>;
  onClose: () => void;
  onUpdate: (customInstructions: Record<string, string>) => void;
}

export function SessionSettings({
  open,
  customInstructions,
  onClose,
  onUpdate,
}: SessionSettingsProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (def: DocDefinition) => {
    setEditingKey(def.docKey);
    setEditValue(customInstructions[def.docKey] ?? def.defaultInstruction);
  };

  const saveEdit = () => {
    if (!editingKey) return;
    const def = DEFAULT_DOC_DEFINITIONS.find((d) => d.docKey === editingKey);
    if (!def) return;

    const next = { ...customInstructions };
    // If the value matches default, remove override
    if (editValue.trim() === def.defaultInstruction.trim()) {
      delete next[editingKey];
    } else {
      next[editingKey] = editValue.trim();
    }
    onUpdate(next);
    setEditingKey(null);
  };

  const resetOne = (docKey: string) => {
    const next = { ...customInstructions };
    delete next[docKey];
    onUpdate(next);
    if (editingKey === docKey) setEditingKey(null);
  };

  const resetAll = () => {
    onUpdate({});
    setEditingKey(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0d1117] border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-mono font-bold text-foreground">
                  Session Settings
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize document generation instructions
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {DEFAULT_DOC_DEFINITIONS.map((def) => {
                const isCustom = def.docKey in customInstructions;
                const isEditing = editingKey === def.docKey;
                const currentInstruction =
                  customInstructions[def.docKey] ?? def.defaultInstruction;

                return (
                  <div
                    key={def.docKey}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      isCustom
                        ? "border-cyan-500/30 bg-cyan-500/5"
                        : "border-border bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            `bg-${def.color}-500`
                          )}
                        />
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {def.label}
                        </span>
                        {isCustom && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isCustom && !isEditing && (
                          <button
                            onClick={() => resetOne(def.docKey)}
                            title="Reset to default"
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isEditing ? (
                          <button
                            onClick={saveEdit}
                            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(def)}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        rows={4}
                        className="w-full bg-[#161b22] border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono resize-y outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground font-mono leading-relaxed line-clamp-2">
                        {currentInstruction}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border">
              <button
                onClick={resetAll}
                disabled={Object.keys(customInstructions).length === 0}
                className="w-full py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-2" />
                Reset All to Defaults
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
