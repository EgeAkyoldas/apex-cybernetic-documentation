"use client";

import { motion } from "framer-motion";
import { User, Bot, Copy, Check, ImageIcon, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface InlineImage {
  imageData: string;
  mimeType: string;
  prompt: string;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  inlineImages?: InlineImage[];
}

export function MessageBubble({ role, content, isStreaming, inlineImages }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3 group", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold",
          isUser
            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
            : "bg-secondary border border-border text-muted-foreground"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "relative max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "glass border border-cyan-500/20 text-foreground rounded-tr-sm"
            : "bg-secondary border border-border text-foreground rounded-tl-sm"
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="markdown-content text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}

        {/* Inline generated images */}
        {inlineImages && inlineImages.length > 0 && (
          <div className="mt-3 space-y-3">
            {inlineImages.map((img, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-cyan-500/20">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/5 border-b border-cyan-500/10">
                  <ImageIcon className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-400/70 truncate">{img.prompt}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${img.mimeType};base64,${img.imageData}`}
                  alt={img.prompt}
                  className="w-full max-h-80 object-contain bg-[#08080f]"
                />
              </div>
            ))}
          </div>
        )}

        {/* Copy button */}
        {!isStreaming && content && (
          <button
            onClick={handleCopy}
            className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary border border-border rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Image generation loading placeholder
export function ImageGeneratingBubble({ prompt }: { prompt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
        <Bot className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="bg-secondary border border-cyan-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <ImageIcon className="w-3.5 h-3.5 animate-pulse" />
          <span>Generating visual: <span className="text-cyan-400/60 truncate">{prompt.slice(0, 60)}...</span></span>
        </div>
        <div className="mt-2 h-32 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-cyan-400"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Image generation error bubble
export function ImageErrorBubble({ prompt, fallbackText }: { prompt: string; fallbackText?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
        <Bot className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="bg-secondary border border-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Visual generation unavailable for this prompt</span>
        </div>
        {fallbackText && (
          <p className="text-xs text-muted-foreground mt-1">{fallbackText}</p>
        )}
        <p className="text-xs text-muted-foreground/50 mt-1 italic">&ldquo;{prompt.slice(0, 80)}&rdquo;</p>
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
        <Bot className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="bg-secondary border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
      </div>
    </motion.div>
  );
}

// Hook: detect and resolve image markers from streamed text
export function useImageMarkers(text: string) {
  const [generatedImages, setGeneratedImages] = useState<Record<string, InlineImage | "loading" | "error">>({});

  useEffect(() => {
    const imageRegex = /~~~image:([^~]+)~~~/g;
    let match;
    while ((match = imageRegex.exec(text)) !== null) {
      const prompt = match[1].trim();
      if (!generatedImages[prompt]) {
        setGeneratedImages((prev) => ({ ...prev, [prompt]: "loading" }));
        fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.imageData) {
              setGeneratedImages((prev) => ({
                ...prev,
                [prompt]: { imageData: data.imageData, mimeType: data.mimeType, prompt },
              }));
            } else {
              setGeneratedImages((prev) => ({ ...prev, [prompt]: "error" }));
            }
          })
          .catch(() => {
            setGeneratedImages((prev) => ({ ...prev, [prompt]: "error" }));
          });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return generatedImages;
}
