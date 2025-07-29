import { Eval } from "braintrust";
import { z } from "zod";
import { LLMClassifierFromTemplate, Score } from "autoevals";
import { generateMeetingAnalysis } from "../src/lib/llm/meeting-analysis-v2";
import type { AnalyzerInput, AnalyzerOutput } from "../src/lib/llm/types";

// Define a type for the 'expected' object to use with the Eval generic.
// This informs TypeScript about the shape of the expected data for each test case.
type ExpectedOutput = {
  promptType: string;
  updatedStatus: "in_progress" | "completed" | "pending";
  criteriaMetCount: number;
  criteriaPendingCount: number;
};

// Define Zod schemas for robust output validation, inspired by the reference structure.
const sessionProgressSchema = z.object({
  session_id: z.string().min(1),
  session_name: z.string().min(1),
  session_status: z.enum(["pending", "in_progress", "completed"]),
  criteria_met: z.array(z.string()),
  criteria_pending: z.array(z.string()),
  completion_notes: z.string().nullable(),
  participant_specific_notes: z.string().nullable(),
  date_completed: z.string().nullable().optional(),
});

const analyzerOutputSchema = z.object({
  progressSummary: z.string().min(1, "progressSummary cannot be empty"),
  updatedProgress: z.array(sessionProgressSchema).min(1, "updatedProgress must have at least one session"),
  nextSessionPrompt: z.string().min(1, "nextSessionPrompt cannot be empty"),
});

// A custom scorer to validate the output against our Zod schema.
// This is more robust and provides better error details than manual checks.
const ZodScorer = (output: unknown): Score => {
  const result = analyzerOutputSchema.safeParse(output);
  return {
    name: "Valid Output Schema",
    score: result.success ? 1 : 0,
    metadata: { errors: result.success ? undefined : result.error.flatten() },
  };
};

/**
 * Braintrust evaluation for the multi-output meeting analysis agent.
 * This eval tests the three key outputs:
 * 1. `progressSummary` (qualitative analysis)
 * 2. `updatedProgress` (structured data integrity)
 * 3. `nextSessionPrompt` (AI tool generation)
 */
Eval<AnalyzerInput, AnalyzerOutput, ExpectedOutput>("Meeting Analysis Agent", {
  // The dataset is defined directly here to avoid `as const` issues,
  // ensuring the types are mutable and match the `AnalyzerInput` interface.
  data: () => [
    {
      metadata: { name: "Scenario 1: Mid-Session Continuation" },
      input: {
        blueprintSessions: [
          { session_id: "s1", session_name: "Introduction to Goals", completion_criteria: ["Define a primary goal", "Set a timeline"], prompt: "..." },
        ],
        currentProgress: [
          { session_id: "s1", session_name: "Introduction to Goals", session_status: "in_progress", criteria_met: [], criteria_pending: ["Define a primary goal", "Set a timeline"], completion_notes: "", participant_specific_notes: "Participant seems hesitant.", date_completed: undefined },
        ],
        transcript: "Coach: Let's talk about your goals. Participant: I want to be more confident in meetings. That's my main goal.",
      },
      expected: {
        promptType: "Continuation",
        updatedStatus: "in_progress",
        criteriaMetCount: 1, // "Define a primary goal" should be met
        criteriaPendingCount: 1, // "Set a timeline" should be pending
      },
    },
    {
      metadata: { name: "Scenario 2: Session Completion & Advancement" },
      input: {
        blueprintSessions: [
          { session_id: "s1", session_name: "Intro", completion_criteria: ["Define goal"], prompt: "Prompt for S1" },
          { session_id: "s2", session_name: "Action Plan", completion_criteria: ["List 3 actions"], prompt: "Prompt for S2" },
        ],
        currentProgress: [
          { session_id: "s1", session_name: "Intro", session_status: "in_progress", criteria_met: [], criteria_pending: ["Define goal"], completion_notes: "", participant_specific_notes: "Loves talking about hiking.", date_completed: undefined },
          { session_id: "s2", session_name: "Action Plan", session_status: "pending", criteria_met: [], criteria_pending: ["List 3 actions"], completion_notes: "", participant_specific_notes: "", date_completed: undefined },
        ],
        transcript: "Coach: What is your main goal? Participant: My goal is to get that promotion.",
      },
      expected: {
        promptType: "Advancement",
        updatedStatus: "completed", // s1 should be completed
        criteriaMetCount: 1,
        criteriaPendingCount: 0,
      },
    },
    {
      metadata: { name: "Scenario 3: Starting the First Session" },
      input: {
        blueprintSessions: [
          { session_id: "s1", session_name: "Welcome", completion_criteria: ["Build rapport"], prompt: "Welcome prompt..." },
        ],
        currentProgress: [
          { session_id: "s1", session_name: "Welcome", session_status: "pending", criteria_met: [], criteria_pending: ["Build rapport"], completion_notes: "", participant_specific_notes: "", date_completed: undefined },
        ],
        transcript: "Coach: Welcome to the program! Participant: Thanks, I'm excited to start!",
      },
      expected: {
        promptType: "Advancement", // Starting a new session is considered advancement
        updatedStatus: "in_progress", // s1 should now be in_progress
        criteriaMetCount: 1, // "Build rapport" is met
        criteriaPendingCount: 0,
      },
    },
  ],
  task: generateMeetingAnalysis,
  scores: [
    // 1. Use the robust Zod scorer for comprehensive schema validation.
    ({ output }) => ZodScorer(output),

    // --- SCORERS FOR `updatedProgress` (Data Integrity) ---

    // Checks if the session status was updated as expected for the scenario.
    ({ output, input, expected }) => {
      if (!expected) {
        return { name: "Correct Status Update", score: NaN, error: new Error("Expected values not provided for this test case.") };
      }

      // Robustly find the session that was acted upon using the provided input.
      const relevantSessionInput = input.currentProgress.find(p => p.session_status === "in_progress") || input.currentProgress.find(p => p.session_status === "pending");

      if (!relevantSessionInput) {
        return { name: "Correct Status Update", score: 0, error: new Error("Could not determine relevant session from input.") };
      }

      const updatedSession = output.updatedProgress.find(p => p.session_id === relevantSessionInput.session_id);

      if (!updatedSession) {
        return { name: "Correct Status Update", score: 0, error: new Error(`Session ${relevantSessionInput.session_id} not found in output`) };
      }

      return {
        name: "Correct Status Update",
        score: updatedSession.session_status === expected.updatedStatus ? 1 : 0,
      };
    },

    // Checks if the criteria were moved from pending to met correctly.
    ({ output, input, expected }) => {
      if (!expected) {
        return { name: "Correct Criteria Update", score: NaN, error: new Error("Expected values not provided for this test case.") };
      }

      // Use the same robust logic to find the relevant session.
      const relevantSessionInput = input.currentProgress.find(p => p.session_status === "in_progress") || input.currentProgress.find(p => p.session_status === "pending");

      if (!relevantSessionInput) {
        return { name: "Correct Criteria Update", score: 0, error: new Error("Could not determine relevant session from input.") };
      }

      const updatedSession = output.updatedProgress.find(p => p.session_id === relevantSessionInput.session_id);

      if (!updatedSession) return { name: "Correct Criteria Update", score: 0, error: new Error(`Session ${relevantSessionInput.session_id} not found in output`) };

      const metCorrect = updatedSession.criteria_met.length === expected.criteriaMetCount;
      const pendingCorrect = updatedSession.criteria_pending.length === expected.criteriaPendingCount;

      return {
        name: "Correct Criteria Update",
        score: metCorrect && pendingCorrect ? 1 : 0,
      };
    },

    // --- SCORERS FOR `nextSessionPrompt` (Tool Generation Quality) ---

    // Checks if the generated prompt string contains the required structural headers.
    ({ output }) => {
      const prompt = output.nextSessionPrompt;
      const hasPersonality = prompt.includes("PERSONALITY AND TONE");
      const hasGuidelines = prompt.includes("SESSION GUIDELINES");
      const hasStates = prompt.includes("CONVERSATION STATES");
      return {
        name: "Valid Prompt Structure",
        score: hasPersonality && hasGuidelines && hasStates ? 1 : 0,
      };
    },

    // Checks if the agent correctly identified the prompt type for the situation.
    ({ output, expected }) => {
      if (!expected) {
        return { name: "Correct Prompt Type", score: NaN, error: new Error("Expected values not provided for this test case.") };
      }

      const prompt = output.nextSessionPrompt;
      // Simple check for the keyword in the "Prompt Type Determination" section
      const typeMatch = prompt.toLowerCase().includes(expected.promptType.toLowerCase());
      return {
        name: "Correct Prompt Type",
        score: typeMatch ? 1 : 0,
      };
    },

    // AI-powered scorer to check if the prompt is personalized, using a classifier.
    async (args) => {
      // Pre-format the template to avoid passing complex objects to the scorer function,
      // which resolves TypeScript type conflicts.
      const promptTemplate = `You are an expert coaching supervisor. Analyze the generated AI output based on the provided transcript and user history.

          **History & Transcript:**
          - Progress Notes: ${JSON.stringify(args.input.currentProgress, null, 2)}
          - Transcript: "${args.input.transcript}"
          
          **Generated Output (JSON String):**
          ---
          {{output}}
          ---
          
          **Task:**
          First, parse the "Generated Output" JSON string and find the 'nextSessionPrompt' field.
          Does the "Generated Prompt" effectively personalize the next conversation?
          Check for these two things:
          1. Does it reference specific details, achievements, or topics from the history or transcript? (e.g., mentioning "confidence in meetings" or "hiking").
          2. Are the examples or guidelines tailored, or are they generic?
          
          Based on this, is the prompt sufficiently personalized? Answer "Yes" or "No".`;

      const scorer = LLMClassifierFromTemplate({
        name: "Prompt Personalization",
        promptTemplate,
        choiceScores: { Yes: 1, No: 0 },
        model: "gpt-4o",
      });
      return scorer({
        output: JSON.stringify(args.output, null, 2),
      });
    },

    // --- SCORER FOR `progressSummary` (Qualitative Analysis) ---

    // AI-powered scorer to check the quality and faithfulness of the summary, using a classifier.
    async (args) => {
      const promptTemplate = `You are an expert editor. Evaluate if the AI-generated summary within the provided JSON output is a faithful and accurate reflection of the transcript.

        **Transcript:**
        ---
        ${args.input.transcript}
        ---
        
        **Generated Output (JSON String):**
        ---
        {{output}}
        ---
        
        **Task:**
        First, parse the "Generated Output" JSON string and find the 'progressSummary' field. Then, evaluate that summary based on the following criteria:
        **Evaluation Criteria:**
        1.  **Accuracy**: Does the summary correctly represent the main topics and outcomes from the transcript?
        2.  **Factuality**: Does it avoid hallucinating or inventing facts not present in the transcript?
        
        Based on these criteria, is the summary faithful to the transcript? Answer "Yes" or "No".`;

      const scorer = LLMClassifierFromTemplate({
        name: "Summary Faithfulness",
        promptTemplate,
        choiceScores: { Yes: 1, No: 0 },
        model: "gpt-4o",
      });
      return scorer({
        output: JSON.stringify(args.output, null, 2),
      });
    },
  ],
  // You can add `metadata` here for project organization
  metadata: {
    "prompt_version": "2.0",
  }
});
