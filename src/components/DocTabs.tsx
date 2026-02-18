"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Layers,
  Package,
  Network,
  Code2,
  Map,
  Plug,
  Palette,
  CheckSquare,
  Zap,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocTabsProps {
  documents: Record<string, string>;
  activeDoc: string | null;
  onSelect: (docType: string) => void;
}

const DOC_CONFIG: Record<
  string,
  {
    text: string;
    bg: string;
    border: string;
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Icon: React.ComponentType<any>;
  }
> = {
  PRD: {
    text: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/30",
    label: "PRD",
    Icon: ClipboardList,
  },
  "Design Document": {
    text: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
    label: "Design",
    Icon: Layers,
  },
  "Tech Stack": {
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    label: "Tech Stack",
    Icon: Package,
  },
  Architecture: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    label: "Architecture",
    Icon: Network,
  },
  "Tech Spec": {
    text: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/30",
    label: "Tech Spec",
    Icon: Code2,
  },
  Roadmap: {
    text: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    label: "Roadmap",
    Icon: Map,
  },
  "API Spec": {
    text: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/30",
    label: "API Spec",
    Icon: Plug,
  },
  "UI Design": {
    text: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/30",
    label: "UI Design",
    Icon: Palette,
  },
  "Task List": {
    text: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    label: "Tasks",
    Icon: CheckSquare,
  },
  "Vibe Prompt": {
    text: "text-lime-400",
    bg: "bg-lime-400/10",
    border: "border-lime-400/30",
    label: "Vibe",
    Icon: Zap,
  },
};

const DEFAULT_CONFIG = {
  text: "text-cyan-400",
  bg: "bg-cyan-400/10",
  border: "border-cyan-400/30",
  label: "",
  Icon: FileText,
};

export function DocTabs({ documents, activeDoc, onSelect }: DocTabsProps) {
  const docTypes = Object.keys(documents);

  if (docTypes.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {docTypes.map((docType) => {
        const config = DOC_CONFIG[docType] ?? {
          ...DEFAULT_CONFIG,
          label: docType,
        };
        const isActive = activeDoc === docType;
        const { Icon } = config;

        return (
          <motion.button
            key={docType}
            onClick={() => onSelect(docType)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all duration-200 border",
              isActive
                ? `${config.text} ${config.bg} ${config.border}`
                : "text-muted-foreground bg-secondary/50 border-border hover:text-foreground hover:bg-secondary"
            )}
          >
            <Icon className="w-3 h-3" />
            {config.label}
            {isActive && (
              <motion.span
                layoutId="active-tab-indicator"
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  config.text.replace("text-", "bg-")
                )}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export function EmptyDocState() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full text-center p-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
          <ClipboardList className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-mono font-semibold text-foreground mb-2">
          No Documents Yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Chat with the AI to generate your first document. It will appear here
          as a live preview.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-xs text-muted-foreground">
          <p className="font-mono">Try saying:</p>
          <div className="glass rounded-lg px-3 py-2 text-cyan-400/70 font-mono">
            &quot;Create a PRD for my project&quot;
          </div>
          <div className="glass rounded-lg px-3 py-2 text-cyan-400/70 font-mono">
            &quot;Generate a UI Design document&quot;
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
