"use client";

import { motion } from "framer-motion";
import { FileText, Clock, Trash2, ChevronRight } from "lucide-react";
import { Session } from "@/lib/storage";
import { formatDate, truncate } from "@/lib/utils";
import { DOCUMENT_LABELS } from "@/lib/constants";


interface SessionCardProps {
  session: Session;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const DOC_TYPE_COLORS: Record<string, string> = {
  prd: "text-cyan-400 bg-cyan-400/10",
  design: "text-purple-400 bg-purple-400/10",
  techstack: "text-green-400 bg-green-400/10",
  architecture: "text-orange-400 bg-orange-400/10",
  techspec: "text-blue-400 bg-blue-400/10",
  roadmap: "text-yellow-400 bg-yellow-400/10",
  apispec: "text-pink-400 bg-pink-400/10",
};

export function SessionCard({ session, onOpen, onDelete }: SessionCardProps) {
  const docCount = Object.keys(session.documents).length;
  const msgCount = session.messages.length;
  const label = DOCUMENT_LABELS[session.instructionKey] ?? session.instructionKey;
  const colorClass = DOC_TYPE_COLORS[session.instructionKey] ?? "text-cyan-400 bg-cyan-400/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="group relative glass rounded-xl p-5 cursor-pointer transition-all duration-200 hover:border-glow"
      onClick={() => onOpen(session.id)}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/20 hover:text-destructive text-muted-foreground"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-2.5 rounded-lg ${colorClass} flex-shrink-0`}>
          <FileText className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
              {label}
            </span>
          </div>
          <h3 className="font-semibold text-foreground truncate pr-8">
            {session.name}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(session.updatedAt)}
            </span>
            <span>{msgCount} messages</span>
            {docCount > 0 && (
              <span className="text-cyan-500">{docCount} doc{docCount > 1 ? "s" : ""} generated</span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}
