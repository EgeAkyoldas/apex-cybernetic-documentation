import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Create a clean, professional technical diagram or visualization for: ${prompt}. 
              Style: Dark background (#0a0a14), neon cyan (#00e5ff) and electric green (#00ff88) accent colors, 
              clean lines, minimal text labels, professional software architecture aesthetic.`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    // Extract image data from response
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return NextResponse.json({
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }
    }

    // If no image part found, return text description
    const textPart = candidate.content.parts.find((p) => p.text);
    return NextResponse.json({
      error: "Image generation not available for this prompt",
      fallbackText: textPart?.text ?? "Could not generate visual.",
    }, { status: 422 });

  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
