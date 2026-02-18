import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface InstructionConfig {
  name: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemInstruction: string;
  documentType: string;
  triggerPhrases?: string[];
}

// Re-export client-safe constants
export { INSTRUCTION_FILES, DOCUMENT_LABELS } from "./constants";

const instructionsDir = path.join(process.cwd(), "instructions");

export function loadInstruction(filename: string): InstructionConfig {
  const filePath = path.join(instructionsDir, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.load(raw) as InstructionConfig;
}

export function listInstructions(): string[] {
  return fs
    .readdirSync(instructionsDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
}

/**
 * Loads all instruction YAMLs and extracts the expected structure/section
 * headings from each. Returns a map of documentType → spec outline.
 * Used by the verifier for instruction cross-checking.
 */
export function loadInstructionSpecs(): Record<string, { name: string; structure: string }> {
  const result: Record<string, { name: string; structure: string }> = {};

  for (const filename of listInstructions()) {
    try {
      const config = loadInstruction(filename);
      // Skip non-document producers (verifier, master-architect)
      if (!config.documentType || config.documentType === "Verifier") continue;

      // Extract the structure section from the system instruction
      const si = config.systemInstruction;
      // Look for structure sections (common patterns in our YAMLs)
      const structureMatch = si.match(
        /# (?:.*STRUCTURE|DOCUMENT GENERATION[\s\S]*?STRUCTURE)([\s\S]*?)(?:\n(?:documentType|$))/i
      );

      // If we can't find a labelled structure block, just extract all bold headings
      let structure: string;
      if (structureMatch) {
        structure = structureMatch[0].trim();
      } else {
        const headings = si.match(/\*\*[^*]+\*\*/g);
        structure = headings ? headings.join("\n") : "";
      }

      result[config.documentType] = { name: config.name, structure };
    } catch {
      // Skip malformed files silently
    }
  }
  return result;
}
