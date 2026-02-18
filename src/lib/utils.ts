import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse document blocks from AI response text.
 * Blocks are wrapped in ~~~doc:DocumentType ... ~~~
 */
export function parseDocumentBlocks(text: string): {
  cleanText: string;
  documents: Record<string, string>;
} {
  const documents: Record<string, string> = {};
  const docRegex = /~~~doc:([^\n]+)\n([\s\S]*?)~~~/g;

  let match;
  while ((match = docRegex.exec(text)) !== null) {
    const docType = match[1].trim();
    const content = match[2].trim();
    documents[docType] = content;
  }

  const cleanText = text.replace(docRegex, "").trim();
  return { cleanText, documents };
}

/**
 * Parse image generation markers from AI response text.
 * Markers look like: ~~~image:description~~~
 */
export function parseImageMarkers(text: string): string[] {
  const prompts: string[] = [];
  const imageRegex = /~~~image:([^~]+)~~~/g;
  let match;
  while ((match = imageRegex.exec(text)) !== null) {
    prompts.push(match[1].trim());
  }
  return prompts;
}


export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}
