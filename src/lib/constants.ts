// Client-safe constants — no Node.js imports
export const INSTRUCTION_FILES: Record<string, string> = {
  prd: "prd-architect.yaml",
  design: "design-doc.yaml",
  techstack: "tech-stack.yaml",
  architecture: "architecture.yaml",
  techspec: "tech-spec.yaml",
  roadmap: "roadmap.yaml",
  apispec: "api-spec.yaml",
  uidesign: "ui-design.yaml",
  tasklist: "task-list.yaml",
  securityspec: "security-spec.yaml",
  datamodel: "data-model.yaml",
  vibeprompt: "vibe-prompt.yaml",
};

export const DOCUMENT_LABELS: Record<string, string> = {
  prd: "PRD",
  design: "Design Document",
  techstack: "Tech Stack Specification",
  architecture: "Architecture Document",
  techspec: "Technical Specification",
  roadmap: "Project Roadmap",
  apispec: "API Specification",
  uidesign: "UI Design",
  tasklist: "Task List",
  securityspec: "Security Specification",
  datamodel: "Data Model",
  vibeprompt: "Vibe Prompt",
};
