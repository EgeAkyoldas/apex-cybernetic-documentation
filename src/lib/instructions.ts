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
