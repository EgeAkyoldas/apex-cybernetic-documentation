"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Archive, Package, ChevronDown } from "lucide-react";
import JSZip from "jszip";
import { generateReadme, getDocFilename } from "@/lib/readme-generator";

interface ExportBarProps {
  documents: Record<string, string>;
  sessionName: string;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportBar({ documents, sessionName }: ExportBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const docTypes = Object.keys(documents);

  const handleExportSingle = (docType: string) => {
    const content = documents[docType];
    const filename = `${slugify(sessionName)}-${getDocFilename(docType)}`;
    downloadFile(content, filename);
    setIsOpen(false);
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(slugify(sessionName));
      if (folder) {
        for (const [docType, content] of Object.entries(documents)) {
          folder.file(`${slugify(docType)}.md`, content);
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(sessionName)}-docs.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportKit = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const root = zip.folder(slugify(sessionName))!;

      // Vibe Prompt at root level
      if (documents["Vibe Prompt"]) {
        root.file("VIBE_PROMPT.md", documents["Vibe Prompt"]);
      }

      // README at root
      const readme = generateReadme(documents, sessionName);
      root.file("README.md", readme);

      // All docs in docs/ folder with normalized names
      const docsFolder = root.folder("docs")!;
      for (const [docType, content] of Object.entries(documents)) {
        docsFolder.file(getDocFilename(docType), content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(sessionName)}-ai-kit.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  if (docTypes.length === 0) return null;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
      >
        <Download className="w-3 h-3" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 top-full mt-1 z-20 glass rounded-xl border border-border shadow-xl min-w-56 overflow-hidden"
          >
            {/* AI-Ready Kit */}
            {docTypes.length > 1 && (
              <>
                <button
                  onClick={handleExportKit}
                  disabled={isExporting}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-lime-400 hover:bg-lime-500/10 transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  {isExporting ? "Bundling..." : "📦 AI-Ready Kit (.zip)"}
                </button>
                <div className="border-t border-border" />
              </>
            )}

            {/* Export all (basic) */}
            {docTypes.length > 1 && (
              <>
                <button
                  onClick={handleExportAll}
                  disabled={isExporting}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {isExporting ? "Bundling..." : "Export All (.zip)"}
                </button>
                <div className="border-t border-border" />
              </>
            )}

            {/* Individual docs */}
            {docTypes.map((docType) => (
              <button
                key={docType}
                onClick={() => handleExportSingle(docType)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {docType} (.md)
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
