// Shared document type definitions — single source of truth
// Used by ChatPanel (toolbar), SessionSettings (editing), and Verifier (cross-check)

export interface DocDefinition {
  label: string;
  docKey: string;
  defaultInstruction: string;
  color: string;
  guidedTopics?: string[];
}

export const DEFAULT_DOC_DEFINITIONS: DocDefinition[] = [
  {
    label: "PRD",
    docKey: "PRD",
    defaultInstruction:
      "generate a complete Product Requirements Document (PRD) for this project.",
    color: "cyan",
    guidedTopics: [
      "Target users & personas",
      "Core problem statement",
      "Key features & scope",
      "Success metrics / KPIs",
      "Constraints & assumptions",
      "Out of scope items",
      "User stories / use cases",
    ],
  },
  {
    label: "Design Doc",
    docKey: "Design Document",
    defaultInstruction:
      "generate a complete Design Document covering system design, trade-offs, and key architectural decisions.",
    color: "violet",
    guidedTopics: [
      "System boundaries & context",
      "Key trade-offs & decisions",
      "Data flow overview",
      "Technology constraints",
      "Non-functional requirements",
      "Risk assessment",
    ],
  },
  {
    label: "Tech Stack",
    docKey: "Tech Stack",
    defaultInstruction:
      "generate a complete Tech Stack Specification with technology choices and rationale.",
    color: "emerald",
    guidedTopics: [
      "Frontend framework",
      "Backend / runtime",
      "Database type & choice",
      "Authentication method",
      "Hosting & deployment",
      "Key libraries & tools",
      "CI/CD preferences",
      "Existing constraints",
    ],
  },
  {
    label: "Architecture",
    docKey: "Architecture",
    defaultInstruction:
      "generate a complete Architecture Document using the C4 model.",
    color: "amber",
    guidedTopics: [
      "System type (monolith/micro/serverless)",
      "Core components",
      "Data flow & storage",
      "External integrations",
      "Scaling requirements",
      "Security boundaries",
    ],
  },
  {
    label: "Tech Spec",
    docKey: "Tech Spec",
    defaultInstruction:
      "generate a complete Technical Specification as an implementation blueprint.",
    color: "rose",
    guidedTopics: [
      "Core data models",
      "Business logic rules",
      "API style (REST/GraphQL/tRPC)",
      "Error handling strategy",
      "Validation rules",
      "Performance requirements",
      "Security considerations",
    ],
  },
  {
    label: "Roadmap",
    docKey: "Roadmap",
    defaultInstruction:
      "generate a complete Project Roadmap with phases, milestones, and timelines.",
    color: "sky",
    guidedTopics: [
      "Number of phases",
      "Timeline & deadlines",
      "Team size & roles",
      "Priority framework",
      "MVP scope",
      "Launch criteria",
    ],
  },
  {
    label: "API Spec",
    docKey: "API Spec",
    defaultInstruction:
      "generate a complete API Specification covering all endpoints, request/response schemas, and authentication.",
    color: "orange",
    guidedTopics: [
      "API style (REST/GraphQL)",
      "Authentication method",
      "Core resources / endpoints",
      "Versioning strategy",
      "Rate limiting",
      "Error response format",
      "Pagination approach",
    ],
  },
  {
    label: "UI Design",
    docKey: "UI Design",
    defaultInstruction:
      "generate a complete UI/UX Design Specification including design philosophy, color system, typography, component library, and screen layouts.",
    color: "pink",
    guidedTopics: [
      "Design style & mood",
      "Color palette preferences",
      "Typography choices",
      "Responsive strategy",
      "Key screens / pages",
      "Component library approach",
      "Accessibility requirements",
    ],
  },
  {
    label: "Task List",
    docKey: "Task List",
    defaultInstruction:
      "generate a comprehensive nested project task list with all phases, epics, stories, and implementation tasks — covering everything from project setup to launch.",
    color: "green",
    guidedTopics: [
      "Sprint / phase structure",
      "Priority system",
      "Team allocation",
      "Dependency ordering",
      "Testing requirements",
      "Definition of done",
    ],
  },
  {
    label: "Vibe Prompt",
    docKey: "Vibe Prompt",
    defaultInstruction:
      "generate a comprehensive Vibe Ready Prompt — a master AI handoff document that synthesizes ALL existing project documents into a single, actionable instruction file. This prompt will be given to an AI coding assistant to start building the project immediately. Include: project identity, document manifest, tech stack snapshot, architecture brief, core data models, phased implementation roadmap, development rules, expected file structure, bootstrap commands, and meta-instructions for the AI.",
    color: "lime",
    // No guidedTopics — Vibe Prompt is auto-only (synthesizes existing docs)
  },
  // --- New universal doc types ---
  {
    label: "Security Spec",
    docKey: "Security Spec",
    defaultInstruction:
      "generate a complete Security Specification covering threat model, authentication & authorization flows, data classification, encryption strategy, OWASP Top 10 mitigations, compliance requirements, and incident response procedures.",
    color: "red",
    guidedTopics: [
      "Authentication model (OAuth/JWT/SSO)",
      "Authorization & role hierarchy",
      "Data classification levels",
      "Threat vectors & attack surfaces",
      "Encryption (at rest & in transit)",
      "Compliance requirements (GDPR/SOC2)",
      "Incident response plan",
    ],
  },
  {
    label: "Data Model",
    docKey: "Data Model",
    defaultInstruction:
      "generate a complete Data Model Specification covering all core entities, their relationships, field definitions with types and constraints, indexing strategy, migration plan, and common query patterns. Use ERD-style documentation.",
    color: "teal",
    guidedTopics: [
      "Core entities & fields",
      "Relationships (1:1, 1:N, M:N)",
      "Indexing & query strategy",
      "Data validation rules",
      "Migration & versioning plan",
      "Access control patterns",
    ],
  },
];

// Color class mapping for Tailwind
export const COLOR_MAP: Record<string, string> = {
  cyan: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50",
  violet: "border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/50",
  emerald: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50",
  amber: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50",
  rose: "border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50",
  sky: "border-sky-500/30 text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/50",
  orange: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50",
  pink: "border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50",
  green: "border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50",
  lime: "border-lime-500/30 text-lime-400 hover:bg-lime-500/10 hover:border-lime-500/50",
  red: "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50",
  teal: "border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/50",
};

// Build the generation prompt for a given doc, accounting for custom instruction overrides
export function buildDocPrompt(
  label: string,
  docKey: string,
  instruction: string,
  existingDocs: Record<string, string>
): string {
  const parts: string[] = [];
  parts.push(
    `Based on our conversation, ${instruction}\n\nFormat the document with clear markdown headers, bullet points, and structure.`
  );
  const otherDocs = Object.entries(existingDocs).filter(
    ([k]) => k !== docKey
  );
  if (otherDocs.length > 0) {
    parts.push(
      `\n\n---\nFor context and cross-referencing, here are previously generated documents:\n`
    );
    for (const [type, content] of otherDocs) {
      parts.push(`### Existing: ${type}\n${content}\n`);
    }
    parts.push(
      `\nUse the above documents for cross-referencing. Maintain consistency with established decisions. Do NOT repeat content — reference it where relevant.`
    );
  }
  return parts.join("");
}

// Resolve the effective instruction for a doc (custom override or default)
export function getEffectiveInstruction(
  def: DocDefinition,
  customInstructions?: Record<string, string>
): string {
  return customInstructions?.[def.docKey] ?? def.defaultInstruction;
}
