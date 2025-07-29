/**
 * TypeScript interfaces for the Voice Agent Prompt Generation System
 * Based on design specifications in docs/analyzer/design_and_implementation_plan_v2.md
 */

export interface Session {
  session_id: string;           // e.g., "session_01", "session_02"
  session_name: string;         // e.g., "Building Unshakeable Faith"
  completion_criteria: string[]; // Array of specific measurable criteria
  prompt: string;               // Complete prompt with all sections (PERSONALITY, GUIDELINES, STATES)
}

export interface SessionProgress {
  session_id: string;                    // Matches blueprint session_id
  session_name: string;                  // Matches blueprint session_name
  session_status: "pending" | "in_progress" | "completed";
  completion_notes?: string;             // "Accomplished: [specific]. Remaining: [if any]"
  participant_specific_notes?: string;   // "Key insights: [personality, goals, challenges]"
  criteria_met: string[];               // Exact criterion text that was completed
  criteria_pending: string[];           // Exact criterion text still pending
  date_completed?: string;              // "YYYY-MM-DD" only if completed
  [key: string]: unknown;               // Allow LLM to add additional tracking fields
}

export interface ConversationState {
  id: string;                // "1_understanding_subconscious"
  description: string;       // What this state accomplishes
  instructions: string[];    // Specific actions to take
  examples: string[];        // Example phrases/responses
  transitions: Transition[]; // When to move to next state
}

export interface Transition {
  next_step: string;         // Next state ID or "session_complete"
  condition: string;         // When to transition
}

export interface AnalyzerInput {
  blueprintSessions: Session[];
  currentProgress: SessionProgress[];
  transcript: string;
}

export interface AnalyzerOutput {
  progressSummary: string;      // Comprehensive progress analysis
  updatedProgress: SessionProgress[]; // Complete updated progress array
  nextSessionPrompt: string;    // Full prompt with PERSONALITY, GUIDELINES, STATES
}

export interface CriteriaAssessment {
  criterion: string;
  status: "✓ Completed" | "⚠️ Partial" | "✗ Not Met";
  evidence: string;
}

export interface ParticipantInsights {
  communicationStyle: string;   // Direct/Analytical/Emotional/etc.
  coreMotivations: string;      // Primary driver and secondary drivers
  strengthsDemonstrated: string; // Specific capabilities shown
  areasOfConcern: string;       // Challenges expressed
  personalContext: string;      // Relevant life details that impact approach
}

export interface ProgressSummaryStructure {
  sessionAnalysis: string;
  completionPercentage: string;
  criteriaAssessment: CriteriaAssessment[];
  keyAccomplishments: string[];
  participantInsights: ParticipantInsights;
  areasRequiringAttention: string[];
  sessionEffectiveness: string;
}


export type PromptType = "continuation" | "advancement" | "adaptive";

export interface PromptGenerationContext {
  promptType: PromptType;
  reason?: string; // For adaptive prompts
  previousSession?: SessionProgress;
  nextSession?: Session;
  participantContext: ParticipantInsights;
}