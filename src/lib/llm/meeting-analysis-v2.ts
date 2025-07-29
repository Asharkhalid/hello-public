import OpenAI from "openai";
import type { 
  AnalyzerInput, 
  AnalyzerOutput, 
  SessionProgress, 
  Session,
  PromptGenerationContext
} from "./types";

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Complete system prompt from docs/analyzer/prompt.md
 */
const SYSTEM_PROMPT = `You are an expert at analyzing conversation blueprints, progress tracking, and conversation transcripts to generate contextual prompts for voice agents in a coaching program. You will analyze three inputs and generate three outputs: a comprehensive progress summary, updated progress tracking, and the next session prompt.

### Understanding Key Concepts

**Conversation**: A real-time dialogue between an AI coach and a participant, working through structured learning content to achieve specific outcomes.

**Blueprint**: A detailed plan for each coaching session that includes:
- Learning objectives (completion criteria that must be met)
- Expected outcomes (completion notes describing end state)
- The full AI prompt with personality, guidelines, and conversation flow
- Think of it as the complete "lesson plan" for the AI coach

**Progress**: A running record tracking:
- Session status (pending → in_progress → completed)
- Which specific criteria were met or remain pending
- Personal insights and context about the participant
- The participant's unique journey through the program

**Transcript**: The actual dialogue from a conversation, showing:
- Exact words spoken by coach and participant
- Topics covered and depth of engagement
- Where conversation aligned with or diverged from plan
- Evidence of criteria completion

### Input Schemas

#### 1. Conversation Blueprint Schema
\`\`\`json
{
  "session_id": "unique_identifier",
  "session_name": "Human readable session title",
  "completion_criteria": [
    "Specific measurable criterion 1",
    "Specific measurable criterion 2"
  ],
  "prompt": "Full prompt including: PERSONALITY AND TONE section, SESSION GUIDELINES section, and CONVERSATION STATES array"
}
\`\`\`

#### 2. Progress Schema
\`\`\`json
[{
  "session_id": "unique_identifier",
  "session_name": "Human readable session title", 
  "session_status": "pending|in_progress|completed",
  "completion_notes": "What was actually accomplished",
  "participant_specific_notes": "Personal context and insights",
  "criteria_met": ["criterion 1", "criterion 2"],
  "criteria_pending": ["criterion 3"],
  "date_completed": "YYYY-MM-DD"
}]
\`\`\`

### Analysis Process

1. **Parse all inputs** understanding current session context and history
2. **Extract transcript evidence** for each completion criterion
3. **Assess completion status** determining if session should continue or advance
4. **Capture participant insights** including style, motivations, and challenges
5. **Generate personalized outputs** maintaining continuity and adaptation

### Prompt Generation Decision Tree

\`\`\`
IF current session has pending criteria → Generate CONTINUATION prompt
  - Start with reconnection to interrupted point
  - Focus only on incomplete criteria
  - Maintain original session objectives

ELSE IF current session just completed → Generate NEXT SESSION prompt
  - Use next session's blueprint prompt as base
  - Add bridges referencing previous achievements
  - Personalize examples with participant's context

ELSE IF participant went off-track → Generate ADAPTIVE prompt
  - Address participant's immediate needs
  - Gently guide back to session objectives
  - Modify approach while preserving goals
\`\`\`

### Prompt Modification Rules

When using existing blueprint prompts:
1. **Preserve Structure**: Keep all sections (Personality, Guidelines, States)
2. **Personalize Content**: 
   - Replace generic examples with participant-specific ones
   - Add references to their stated goals and values
   - Include their preferred terminology
3. **Add Context Bridges**:
   - Opening state should reference previous work
   - Examples should build on their journey
   - Transitions should feel natural from their progress

When generating new conversation states (if not provided):
1. **Map to Criteria**: Each criterion needs at least one state
2. **Follow Learning Arc**: Introduction → Teaching → Practice → Application → Commitment  
3. **Include Transitions**: Clear conditions for moving between states
4. **Use Proper Structure**: Each state must include:
   - id: descriptive identifier (e.g., "1_welcome_introduction")
   - description: purpose and goal of the state
   - instructions: array of specific actions for the coach to take
   - examples: array of sample utterances that demonstrate the coaching style
   - transitions: array with next_step and condition for state progression

**Conversation States JSON Schema:**
Each state must include: id (string), description (string), instructions (array), examples (array), transitions (array with next_step and condition).

### Filler Words Specification
- **None**: For formal, professional participants
- **Occasionally** (1-2 per response): Standard coaching warmth
- **Often** (3-5 per response): For casual, friendly rapport`;

/**
 * Generates sophisticated meeting analysis using the complete system from docs/analyzer/prompt.md
 */
export async function generateMeetingAnalysis(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const userPrompt = `
Analyze the following conversation context and generate outputs as specified.

### Conversation Blueprint:
\`\`\`json
${JSON.stringify(input.blueprintSessions, null, 2)}
\`\`\`

### Current Progress:
\`\`\`json
${JSON.stringify(input.currentProgress, null, 2)}
\`\`\`

### Conversation Transcript:
\`\`\`
${input.transcript}
\`\`\`

Return your analysis as a JSON object with exactly these three fields:

1. **progressSummary**: A comprehensive analysis including:
   - Session analysis with name, status, and completion percentage
   - Criteria assessment table with status and evidence from transcript
   - Key accomplishments with supporting quotes
   - Participant profile insights (communication style, motivations, strengths, concerns, personal context)
   - Areas requiring attention and reinforcement needs
   - Session effectiveness assessment

2. **updatedProgress**: Array of session progress objects with exact structure:
   - session_id, session_name, session_status (pending/in_progress/completed)
   - completion_notes, participant_specific_notes
   - criteria_met and criteria_pending arrays with exact criterion text
   - date_completed (YYYY-MM-DD format only if completed)

3. **nextSessionPrompt**: Complete AI coach prompt with these exact sections:

   **Prompt Type Determination:** [Mark ONE: ✓ Continuation/Advancement/Adaptive with reason]
   
   **# PERSONALITY AND TONE**
   - Identity: [Who the AI is, with relationship context from previous sessions]
   - Task: [Specific objective based on session type]
   - Demeanor: [Supportive/Challenging/Encouraging based on participant response pattern]
   - Tone: [Warm/Professional/Enthusiastic/Calm adapted to participant preference]
   - Level of Enthusiasm: [High/Moderate/Controlled matched to participant energy]
   - Level of Formality: [Casual/Balanced/Professional based on established rapport]
   - Level of Emotion: [Highly expressive/Moderately expressive/Reserved per participant comfort]
   - Filler Words: [None/Occasionally/Often with exact frequency]
   - Pacing: [Rapid/Moderate/Deliberate matched to processing style]
   
   **# SESSION GUIDELINES**
   - Primary Objective: [Specific goal for this conversation]
   - Building On: Reference [previous achievement/breakthrough]
   - Key Focus Areas: [2-3 main topics]
   - Participant-Specific Adaptations: [Customize approach based on their style]
   - Must Reference: [Their specific quote or commitment]
   - Approach Note: [Any special handling based on transcript]
   
   **# CONVERSATION STATES**
   Generate 4-8 conversation states as a JSON array with the exact structure below.
   Each state should map to specific completion criteria and follow a logical learning progression.
   
   Required JSON structure for each state:
   Each state object must contain: id (string), description (string), instructions (string array), examples (string array), transitions (array with next_step and condition properties).
   
   Essential states to include:
   1. Opening/Connection state (builds rapport, sets context from previous sessions)
   2. Core Teaching/Exploration states (address main completion criteria)
   3. Practice/Application state (hands-on work with participant)
   4. Integration/Commitment state (solidifies learning and next steps)
   
   Ensure each state:
   - Maps to specific completion criteria from the session
   - Includes personalized examples referencing participant's previous work
   - Has clear transition conditions to next state
   - Maintains the established personality, tone, and coaching style
   - Uses the participant's name and context when appropriate`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    let rawResult;
    try {
      rawResult = JSON.parse(content);
    } catch {
      console.error("Failed to parse LLM response as JSON:", content);
      throw new Error("LLM returned invalid JSON response");
    }
    
    console.log("LLM Response Keys:", Object.keys(rawResult));
    console.log("LLM Response Types:", {
      progressSummary: typeof rawResult.progressSummary,
      updatedProgress: typeof rawResult.updatedProgress,
      nextSessionPrompt: typeof rawResult.nextSessionPrompt
    });
    
    // Parse and validate the sophisticated response structure
    const result: AnalyzerOutput = {
      progressSummary: rawResult.progressSummary || "",
      updatedProgress: rawResult.updatedProgress || [],
      nextSessionPrompt: typeof rawResult.nextSessionPrompt === 'string' 
        ? rawResult.nextSessionPrompt 
        : JSON.stringify(rawResult.nextSessionPrompt) || ""
    };
    
    // Validate the response structure
    if (!result.progressSummary || !result.updatedProgress || !result.nextSessionPrompt) {
      console.error("Missing fields in LLM response:", {
        hasProgressSummary: !!result.progressSummary,
        hasUpdatedProgress: !!result.updatedProgress,
        hasNextSessionPrompt: !!result.nextSessionPrompt,
        actualKeys: Object.keys(rawResult)
      });
      throw new Error("Invalid response format from LLM - missing required fields");
    }

    // Validate updatedProgress is an array with proper structure
    if (!Array.isArray(result.updatedProgress)) {
      throw new Error("updatedProgress must be an array");
    }

    // Validate each progress item has required fields
    for (const progress of result.updatedProgress) {
      if (!progress.session_id || !progress.session_name || !progress.session_status) {
        throw new Error("Invalid progress item structure");
      }
      if (!["pending", "in_progress", "completed"].includes(progress.session_status)) {
        throw new Error(`Invalid session status: ${progress.session_status}`);
      }
    }

    // Validate next session prompt has required sections (with logging)
    const promptText = typeof result.nextSessionPrompt === 'string' ? result.nextSessionPrompt : '';
    const hasPersonality = promptText.includes("PERSONALITY AND TONE");
    const hasGuidelines = promptText.includes("SESSION GUIDELINES");
    const hasStates = promptText.includes("CONVERSATION STATES");
    
    console.log("Prompt validation:", {
      hasPersonality,
      hasGuidelines, 
      hasStates,
      promptLength: promptText.length,
      promptType: typeof result.nextSessionPrompt
    });
    
    if (!hasPersonality || !hasGuidelines || !hasStates) {
      console.warn("Next session prompt missing some required sections, but proceeding...");
      // Don't throw error for now, just log warning
    }

    return result;
  } catch (error) {
    console.error("Error in generateMeetingAnalysis:", error);
    throw new Error(`Failed to analyze meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Determines the type of prompt needed based on current progress
 */
export function determinePromptType(
  currentProgress: SessionProgress[], 
  blueprintSessions: Session[]
): PromptGenerationContext {
  // Find the current session being worked on
  const currentSession = currentProgress.find(p => p.session_status === "in_progress");
  
  if (!currentSession) {
    // No session in progress, start with first pending session
    const nextSession = currentProgress.find(p => p.session_status === "pending");
    if (nextSession) {
      return {
        promptType: "advancement",
        nextSession: blueprintSessions.find(s => s.session_id === nextSession.session_id),
        participantContext: extractParticipantContext(currentProgress)
      };
    }
    
    // All sessions completed
    return {
      promptType: "adaptive",
      reason: "All sessions completed - journey wrap-up",
      participantContext: extractParticipantContext(currentProgress)
    };
  }

  // Check if current session has pending criteria
  if (currentSession.criteria_pending.length > 0) {
    return {
      promptType: "continuation",
      previousSession: currentSession,
      participantContext: extractParticipantContext(currentProgress)
    };
  }

  // Current session is complete, advance to next
  const nextSessionProgress = currentProgress.find(p => p.session_status === "pending");
  if (nextSessionProgress) {
    return {
      promptType: "advancement",
      previousSession: currentSession,
      nextSession: blueprintSessions.find(s => s.session_id === nextSessionProgress.session_id),
      participantContext: extractParticipantContext(currentProgress)
    };
  }

  // All sessions completed
  return {
    promptType: "adaptive",
    reason: "All sessions completed - journey wrap-up",
    previousSession: currentSession,
    participantContext: extractParticipantContext(currentProgress)
  };
}

/**
 * Extracts participant insights from progress history
 */
function extractParticipantContext(progress: SessionProgress[]) {
  const allNotes = progress
    .map(p => p.participant_specific_notes)
    .filter(Boolean)
    .join(" ");

  return {
    communicationStyle: "Adaptive", // Default - will be determined by LLM
    coreMotivations: "Personal growth and achievement", // Default
    strengthsDemonstrated: "Engagement and reflection", // Default
    areasOfConcern: "", // Will be populated by LLM
    personalContext: allNotes
  };
}

/**
 * Finds the next session that should be worked on
 */
export function findNextSession(
  progress: SessionProgress[], 
  sessions: Session[]
): Session | null {
  // Find first session that's not completed
  const nextProgressItem = progress.find(p => p.session_status !== "completed");
  if (!nextProgressItem) return null;
  
  return sessions.find(s => s.session_id === nextProgressItem.session_id) || null;
}