import { NextRequest, NextResponse } from "next/server";
import { streamChat, ChatMessage } from "@/lib/gemini";
import { loadInstruction } from "@/lib/instructions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], existingDocs = {}, verifyReport } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Always use the master architect — it knows all document types
    const config = loadInstruction("master-architect.yaml");

    // Build a context block from existing documents (their latest edited state)
    let systemInstruction = config.systemInstruction;
    const docEntries = Object.entries(existingDocs as Record<string, string>);
    if (docEntries.length > 0) {
      const docList = docEntries.map(([type]) => `- ${type}`).join("\n");
      const docsContext = docEntries
        .map(([type, content]) => `### ${type}\n\n${content}`)
        .join("\n\n---\n\n");

      systemInstruction += `\n\n# ⚠️ CRITICAL: EXISTING DOCUMENTS — FINAL VERSIONS\n\nThe following ${docEntries.length} document(s) have already been created and may have been edited by the user. These represent the FINAL, AUTHORITATIVE state of the project:\n\n${docList}\n\nRULES:\n1. **NEVER restart from scratch** — always build upon these documents\n2. **Preserve all decisions** — names, features, tech choices, architecture decisions already made must carry through unchanged unless the user explicitly asks to change them\n3. **Reference them explicitly** — when generating a new document, cite the existing ones: "As established in the PRD...", "Per the Architecture Document..."\n4. **Fill gaps, don't contradict** — new documents should add detail and depth, not conflict with what's already defined\n5. **The user may have manually edited these** — treat the content below as ground truth\n\n## FULL DOCUMENT CONTENTS:\n\n${docsContext}`;
    }

    // Inject verify report context if available
    if (verifyReport && typeof verifyReport === "string") {
      systemInstruction += `\n\n# 🔍 CYBERNETIC VERIFIER REPORT — LATEST ANALYSIS\n\nThe Cybernetic Verifier has analyzed the existing documents. Be aware of these findings when generating or modifying documents. Address any issues marked as critical or warning. If the report includes guidance for missing documents, incorporate that guidance when generating those documents.\n\n${verifyReport}`;
    }

    // Convert history to Gemini format
    const geminiHistory: ChatMessage[] = history.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    );

    const stream = await streamChat({
      model: config.model,
      systemInstruction,
      history: geminiHistory,
      message,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    });

    // Stream the response as SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
