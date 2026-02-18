import { NextRequest, NextResponse } from "next/server";
import { streamChat, ChatMessage } from "@/lib/gemini";
import { loadInstruction } from "@/lib/instructions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documents, mode = "verify", report = "" } = body;

    if (!documents || typeof documents !== "object" || Object.keys(documents).length === 0) {
      return NextResponse.json(
        { error: "At least one document is required for verification" },
        { status: 400 }
      );
    }

    const config = loadInstruction("cybernetic-verifier.yaml");

    // All possible document types in the suite
    const ALL_DOC_TYPES = [
      "PRD", "Design Document", "Tech Stack", "Architecture",
      "Tech Spec", "Roadmap", "API Spec", "UI Design", "Task List", "Vibe Prompt"
    ];

    // Build the document context
    const docEntries = Object.entries(documents as Record<string, string>);
    const existingDocTypes = docEntries.map(([type]) => type);
    const missingDocTypes = ALL_DOC_TYPES.filter(t => !existingDocTypes.includes(t));
    const docList = docEntries.map(([type]) => `- ${type}`).join("\n");
    const missingList = missingDocTypes.length > 0
      ? missingDocTypes.map(t => `- ${t}`).join("\n")
      : "None — all documents exist";
    const docsContext = docEntries
      .map(([type, content]) => `### ${type}\n\n${content}`)
      .join("\n\n---\n\n");

    // Build the user message based on mode
    let userMessage: string;

    if (mode === "harmonize") {
      userMessage = `# HARMONIZE MODE — Restore Homeostasis

## Telemetry Report to Address:

${report}

## Current Documents (${docEntries.length}):

${docList}

## Full Document Contents:

${docsContext}

Please fix ONLY the documents that have issues identified in the telemetry report. Use ~~~doc:Type~~~ markers for each corrected document. Make minimal changes to restore consistency.`;
    } else {
      userMessage = `# VERIFY MODE — Run Cybernetic Telemetry Analysis

## Documents Present (${docEntries.length} of ${ALL_DOC_TYPES.length}):

${docList}

## Documents NOT Yet Created:

${missingList}

## Full Document Contents:

${docsContext}

Analyze all documents as a coupled system and produce the full TELEMETRY REPORT in the exact format specified. Check all 6 dimensions: Cross-Reference Matrix, Contradiction Log, Terminology Drift, Complexity Audit, Coverage Gaps, and Consistency Checks.

Since only ${docEntries.length} of ${ALL_DOC_TYPES.length} documents exist, also produce the ~~~guidance~~~ block with important notes for each missing document based on what's already established.`;
    }

    // Use empty history — verifier is stateless
    const geminiHistory: ChatMessage[] = [];

    const stream = await streamChat({
      model: config.model,
      systemInstruction: config.systemInstruction,
      history: geminiHistory,
      message: userMessage,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    });

    // Stream response as SSE
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
    console.error("Verify API error:", error);
    return NextResponse.json(
      { error: "Failed to process verification request" },
      { status: 500 }
    );
  }
}
