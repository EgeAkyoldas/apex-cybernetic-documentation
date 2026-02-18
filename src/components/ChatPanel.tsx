"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, ChevronDown, ChevronUp, Plus, Zap, MessageSquare } from "lucide-react";
import { GuidedProgress, GuidedSession } from "./GuidedProgress";
import {
  MessageBubble,
  TypingIndicator,
  ImageGeneratingBubble,
  ImageErrorBubble,
  InlineImage,
} from "./MessageBubble";
import { ChatMessage } from "@/lib/storage";
import { parseDocumentBlocks, parseImageMarkers } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DOC_DEFINITIONS,
  COLOR_MAP,
  buildDocPrompt,
  getEffectiveInstruction,
  type DocDefinition,
} from "@/lib/doc-definitions";

// Local buildDocPromptLocal wraps the shared buildDocPrompt with update/context logic
function buildDocPromptLocal(
  docLabel: string,
  docKey: string,
  instruction: string,
  existingDocs: Record<string, string>
): string {
  const alreadyExists = docKey in existingDocs;
  const otherDocs = Object.keys(existingDocs).filter((k) => k !== docKey);

  if (alreadyExists) {
    return `The ${docLabel} has already been generated. Please review it carefully along with all other existing documents, then produce an **updated and improved version** that:
- Preserves all decisions, names, and features already defined
- Incorporates any new information from our conversation since it was last generated
- Fills in any gaps or missing detail
- Remains fully consistent with all other documents in this session

${instruction}`;
  }

  return buildDocPrompt(docLabel, docKey, instruction, existingDocs);
}

// Derive GUIDED_TOPICS lookup from shared definitions
const GUIDED_TOPICS: Record<string, string[]> = Object.fromEntries(
  DEFAULT_DOC_DEFINITIONS
    .filter((d) => d.guidedTopics && d.guidedTopics.length > 0)
    .map((d) => [d.docKey, d.guidedTopics!])
);

function buildGuidedPrompt(
  docLabel: string,
  docKey: string,
  existingDocs: Record<string, string>
): string {
  const topics = GUIDED_TOPICS[docKey] ?? [];
  const topicChecklist = topics.map((t) => `- [ ] ${t}`).join("\n");
  const otherDocs = Object.keys(existingDocs).filter((k) => k !== docKey);
  const contextNote =
    otherDocs.length > 0
      ? `\n\nEXISTING DOCUMENTS (use as context):\n${otherDocs.map((k) => `- ${k}`).join("\n")}`
      : "";

  return `You are in GUIDED MODE for generating a ${docLabel}.${contextNote}

Your job: Interview me to gather enough information before generating the document.

TOPIC CHECKLIST (track these):
${topicChecklist}

RULES:
1. Ask ONE question at a time. Wait for my answer.
2. After each answer, check off which topics are now covered.
3. If I give a vague answer, simplify: offer 2-3 concrete options to choose from.
4. If I say "I don't know", suggest the most common industry approach and ask for confirmation.
5. NEVER assume or fabricate answers I haven't given.
6. After each answer, report progress exactly like this: "✅ X/${topics.length} topics covered"
7. When ≥${Math.ceil(topics.length * 0.6)} topics (60%) are covered, ask: "I have enough info to generate. Want to continue answering or should I generate now?"
8. When I say "generate" or after ≥${Math.ceil(topics.length * 0.8)} topics (80%) are covered and I seem ready, generate the full ${docLabel}.
9. For any topic NOT covered, explicitly write "[To be determined — not discussed]" in the document.

Start by asking the first question now.`;
}

// DOC_ACTIONS is just the shared definitions — prompt building uses customInstructions at call site


export interface ChatPanelHandle {
  prefillInput: (text: string) => void;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  instructionKey: string;
  isStreaming: boolean;
  existingDocs: Record<string, string>;
  customInstructions?: Record<string, string>;
  verifyReport?: string | null;
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onDocumentsUpdate: (docs: Record<string, string>) => void;
  onStreamingChange: (streaming: boolean) => void;
}

// Pending image requests during/after streaming
interface PendingImage {
  prompt: string;
  status: "loading" | "done" | "error";
  image?: InlineImage;
  fallbackText?: string;
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(
  function ChatPanel(
    {
      messages,
      instructionKey,
      isStreaming,
      existingDocs,
      customInstructions,
      verifyReport,
      onMessagesUpdate,
      onDocumentsUpdate,
      onStreamingChange,
    },
    ref
  ) {
    const [input, setInput] = useState("");
    const [streamingContent, setStreamingContent] = useState("");
    const [toolbarOpen, setToolbarOpen] = useState(true);
    const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
    const [guidedSession, setGuidedSession] = useState<GuidedSession | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    void instructionKey;

    // Parse coverage from AI messages: "✅ X/Y topics covered"
    useEffect(() => {
      if (!guidedSession) return;
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      if (!lastAssistant) return;
      const match = lastAssistant.content.match(/✅\s*(\d+)\/(\d+)\s*topics? covered/i);
      if (match) {
        const answered = parseInt(match[1], 10);
        setGuidedSession((prev) => prev ? { ...prev, answeredCount: answered } : null);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    useImperativeHandle(ref, () => ({
      prefillInput: (text: string) => {
        setInput(text);
        textareaRef.current?.focus();
        adjustTextareaHeight();
      },
    }));

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent, pendingImages]);

    const adjustTextareaHeight = () => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    };

    const handleStop = () => {
      abortRef.current?.abort();
      onStreamingChange(false);
      if (streamingContent) {
        const { cleanText, documents } = parseDocumentBlocks(streamingContent);
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: cleanText || streamingContent,
          timestamp: Date.now(),
        };
        onMessagesUpdate([...messages, assistantMsg]);
        if (Object.keys(documents).length > 0) onDocumentsUpdate(documents);
        setStreamingContent("");
      }
    };

    const generateImage = useCallback(async (prompt: string): Promise<PendingImage> => {
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (data.imageData) {
          return { prompt, status: "done", image: { imageData: data.imageData, mimeType: data.mimeType, prompt } };
        }
        return { prompt, status: "error", fallbackText: data.fallbackText };
      } catch {
        return { prompt, status: "error" };
      }
    }, []);

    const sendMessage = useCallback(
      async (messageText: string) => {
        const trimmed = messageText.trim();
        if (!trimmed || isStreaming) return;

        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: trimmed,
          timestamp: Date.now(),
        };

        const newMessages = [...messages, userMsg];
        onMessagesUpdate(newMessages);
        setInput("");
        setStreamingContent("");
        setPendingImages([]);
        onStreamingChange(true);

        if (textareaRef.current) textareaRef.current.style.height = "auto";

        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: trimmed,
              history: messages.map((m) => ({ role: m.role, content: m.content })),
              existingDocs,
              verifyReport: verifyReport || undefined,
            }),
            signal: controller.signal,
          });

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullText = "";

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
                      fullText += parsed.text;
                      setStreamingContent(fullText);
                    }
                  } catch { /* ignore */ }
                }
              }
            }
          }

          // Parse documents and image markers from full response
          const { cleanText, documents } = parseDocumentBlocks(fullText);
          const imagePrompts = parseImageMarkers(fullText);

          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: cleanText || fullText,
            timestamp: Date.now(),
          };
          onMessagesUpdate([...newMessages, assistantMsg]);
          if (Object.keys(documents).length > 0) onDocumentsUpdate(documents);

          // Kick off image generation for each marker
          if (imagePrompts.length > 0) {
            const initial = imagePrompts.map((p) => ({ prompt: p, status: "loading" as const }));
            setPendingImages(initial);

            // Generate all images in parallel
            const results = await Promise.all(imagePrompts.map(generateImage));
            setPendingImages(results);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name !== "AbortError") {
            const errorMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "⚠️ Connection error. Please check your API key and try again.",
              timestamp: Date.now(),
            };
            onMessagesUpdate([...newMessages, errorMsg]);
          }
        } finally {
          setStreamingContent("");
          onStreamingChange(false);
          abortRef.current = null;
        }
      },
      [isStreaming, messages, existingDocs, onMessagesUpdate, onDocumentsUpdate, onStreamingChange, generateImage]
    );

    const handleSend = useCallback(() => sendMessage(input), [input, sendMessage]);
    const handleDocAuto = useCallback(
      (action: DocDefinition) => {
        setGuidedSession(null);
        setOpenDropdown(null);
        const instruction = getEffectiveInstruction(action, customInstructions);
        sendMessage(buildDocPromptLocal(action.label, action.docKey, instruction, existingDocs));
      },
      [sendMessage, existingDocs, customInstructions]
    );

    const handleDocGuided = useCallback(
      (action: DocDefinition) => {
        const topics = GUIDED_TOPICS[action.docKey] ?? [];
        setGuidedSession({ docType: action.docKey, totalTopics: topics.length, answeredCount: 0 });
        setOpenDropdown(null);
        sendMessage(buildGuidedPrompt(action.label, action.docKey, existingDocs));
      },
      [sendMessage, existingDocs]
    );

    const handleGuidedGenerate = useCallback(() => {
      if (!guidedSession) return;
      sendMessage(`I'm ready. Please generate the ${guidedSession.docType} document now based on all the information I've provided.`);
      setGuidedSession(null);
    }, [sendMessage, guidedSession]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const docCount = Object.keys(existingDocs).length;

    return (
      <div className="flex flex-col h-full">
        {/* Guided Progress Bar */}
        {guidedSession && (
          <GuidedProgress
            session={guidedSession}
            onGenerateNow={handleGuidedGenerate}
            onCancel={() => setGuidedSession(null)}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.length === 0 && !isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-mono font-semibold text-foreground mb-2">APEX-CYBERNETIC Online</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Describe your project and I&apos;ll guide you through creating a complete documentation suite.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-3 font-mono">
                  PRD → Design → Tech Spec → Architecture → UI Design → Tasks
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}

          {isStreaming && streamingContent && (
            <MessageBubble
              role="assistant"
              content={parseDocumentBlocks(streamingContent).cleanText || streamingContent}
              isStreaming
            />
          )}
          {isStreaming && !streamingContent && <TypingIndicator />}

          {/* Pending image generation results */}
          {pendingImages.map((pi, i) =>
            pi.status === "loading" ? (
              <ImageGeneratingBubble key={i} prompt={pi.prompt} />
            ) : pi.status === "done" && pi.image ? (
              <MessageBubble
                key={i}
                role="assistant"
                content=""
                inlineImages={[pi.image]}
              />
            ) : (
              <ImageErrorBubble key={i} prompt={pi.prompt} fallbackText={pi.fallbackText} />
            )
          )}

          <div ref={bottomRef} />
        </div>

        {/* Document Quick-Action Toolbar */}
        <div className="flex-shrink-0 border-t border-border relative">
          <button
            onClick={() => setToolbarOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.02] transition-colors font-mono"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span className="font-semibold tracking-wide">Generate Document</span>
              {docCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold tabular-nums">
                  {docCount} created
                </span>
              )}
            </span>
            {toolbarOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {toolbarOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {DEFAULT_DOC_DEFINITIONS.map((action) => {
                    const isCreated = action.docKey in existingDocs;
                    const hasGuided = action.docKey in GUIDED_TOPICS;
                    const isDropdownOpen = openDropdown === action.label;
                    return (
                      <div key={action.label} className="relative">
                        <motion.button
                          onClick={() => {
                            if (hasGuided) {
                              setOpenDropdown(isDropdownOpen ? null : action.label);
                            } else {
                              handleDocAuto(action);
                            }
                          }}
                          disabled={isStreaming}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed",
                            COLOR_MAP[action.color],
                            isCreated && "opacity-50"
                          )}
                          title={isCreated ? `${action.label} exists — click to regenerate` : `Generate ${action.label}`}
                        >
                          <Plus className="w-3 h-3" />
                          {action.label}
                          {isCreated && <span className="text-[8px] opacity-70">✓</span>}
                          {hasGuided && <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform duration-200", isDropdownOpen && "rotate-180 opacity-100")} />}
                        </motion.button>

                        {/* Auto / Guided dropdown — opens UPWARD */}
                        {isDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.12 }}
                              className="absolute left-0 bottom-full mb-2 z-40 rounded-xl border border-border shadow-2xl shadow-black/40 min-w-44 overflow-hidden"
                              style={{ background: "rgba(17, 17, 20, 0.95)", backdropFilter: "blur(16px)" }}
                            >
                              <button
                                onClick={() => handleDocAuto(action)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-mono text-foreground hover:bg-white/[0.06] transition-colors group"
                              >
                                <div className="w-6 h-6 rounded-md bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-400/20 transition-colors">
                                  <Zap className="w-3 h-3 text-amber-400" />
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold">Auto</div>
                                  <div className="text-[9px] text-muted-foreground">AI decides everything</div>
                                </div>
                              </button>
                              <div className="border-t border-white/[0.06] mx-2" />
                              <button
                                onClick={() => handleDocGuided(action)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-mono text-foreground hover:bg-white/[0.06] transition-colors group"
                              >
                                <div className="w-6 h-6 rounded-md bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-400/20 transition-colors">
                                  <MessageSquare className="w-3 h-3 text-cyan-400" />
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold">Guided</div>
                                  <div className="text-[9px] text-muted-foreground">You answer, AI writes</div>
                                </div>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 border-t border-border">
          <div
            className={cn(
              "flex items-end gap-2 glass rounded-xl p-2 transition-all duration-200",
              isStreaming ? "border-cyan-500/20" : "border-border hover:border-cyan-500/20"
            )}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustTextareaHeight(); }}
              onKeyDown={handleKeyDown}
              placeholder="Describe your project or ask for a document..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[36px] max-h-40 py-2 px-2 font-sans leading-relaxed disabled:opacity-50"
            />
            {isStreaming ? (
              <motion.button
                onClick={handleStop}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-destructive/20 text-destructive border border-destructive/30 flex items-center justify-center hover:bg-destructive/30 transition-colors"
              >
                <Square className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSend}
                disabled={!input.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
                  input.trim()
                    ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    );
  }
);
