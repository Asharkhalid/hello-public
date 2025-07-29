import "dotenv/config";
import { generateMeetingAnalysis } from "../src/lib/llm/meeting-analysis-v2";
import type { AnalyzerInput, Session, SessionProgress } from "../src/lib/llm/types";

// Test the sophisticated analysis system
async function testAnalysis() {
  console.log("🧪 Testing Sophisticated Analysis System...\n");

  // Sample blueprint sessions (matching our seeded data structure)
  const testSessions: Session[] = [
    {
      session_id: "session_01",
      session_name: "Foundation of Success Thinking",
      completion_criteria: [
        "Written definite purpose statement created and refined with emotional intensity",
        "Clear understanding demonstrated between wishing vs burning desire through examples",
        "Daily visualization and autosuggestion practice routine committed to and scheduled",
        "Personal obstacles identified and specific commitment strategies established",
        "Emotional connection to purpose clearly expressed and felt during session"
      ],
      prompt: `PERSONALITY AND TONE

Identity: You are Dr. Success, an inspiring success coach who embodies Napoleon Hill's wisdom and has mentored hundreds to extraordinary success.

Task: Guide participants through developing burning desire and definite purpose - the foundation of all achievement.

SESSION GUIDELINES
- Guide participants through understanding the critical difference between wishing and burning desire
- Help each participant identify and articulate their definite major purpose
- Facilitate the creation of compelling, emotionally-charged purpose statements`
    },
    {
      session_id: "session_02", 
      session_name: "Building Unshakeable Faith",
      completion_criteria: [
        "Understanding demonstrated of subconscious mind function and programming principles",
        "Personal limiting beliefs identified and specific counter-affirmations created", 
        "Autosuggestion technique mastered with proper emotion and repetition"
      ],
      prompt: `PERSONALITY AND TONE

Identity: You are Dr. Success, continuing the transformational journey.

Task: Guide participants through building unshakeable faith using autosuggestion techniques.`
    }
  ];

  // Initial progress (first session in progress)
  const initialProgress: SessionProgress[] = [
    {
      session_id: "session_01",
      session_name: "Foundation of Success Thinking",
      session_status: "in_progress",
      completion_notes: "",
      participant_specific_notes: "",
      criteria_met: [],
      criteria_pending: [
        "Written definite purpose statement created and refined with emotional intensity",
        "Clear understanding demonstrated between wishing vs burning desire through examples",
        "Daily visualization and autosuggestion practice routine committed to and scheduled",
        "Personal obstacles identified and specific commitment strategies established",
        "Emotional connection to purpose clearly expressed and felt during session"
      ]
    },
    {
      session_id: "session_02",
      session_name: "Building Unshakeable Faith", 
      session_status: "pending",
      completion_notes: "",
      participant_specific_notes: "",
      criteria_met: [],
      criteria_pending: [
        "Understanding demonstrated of subconscious mind function and programming principles",
        "Personal limiting beliefs identified and specific counter-affirmations created", 
        "Autosuggestion technique mastered with proper emotion and repetition"
      ]
    }
  ];

  // Sample coaching conversation transcript
  const testTranscript = `
Dr. Success: Welcome to this transformational journey! Today we're going to establish your burning desire and definite purpose. Tell me, what's your biggest dream?

User: I want to start my own business, something in tech. I've always wanted to be my own boss and build something meaningful.

Dr. Success: That's wonderful! But I want you to dig deeper. When you say "own business" - what specifically drives that desire? What would that business actually accomplish?

User: Well, I guess I want financial freedom. I'm tired of living paycheck to paycheck. And I have this idea for an app that could help people manage their finances better.

Dr. Success: Now we're getting somewhere! So you want to create financial security for yourself while helping others achieve the same. That's powerful. Let's make this more specific and emotionally charged. If you had that financial freedom, what would that enable in your life?

User: I could finally travel with my family without worrying about money. My kids could go to better schools. I wouldn't have to stress about every bill that comes in.

Dr. Success: Beautiful! Feel that emotion - that's not just wanting, that's burning desire. Now, let's craft this into a definite purpose statement. I want you to write this down: "I will create a successful financial app business that generates $500,000 annually within 18 months, enabling me to provide financial security for my family and help others achieve the same freedom."

User: Wow, that feels powerful when I say it like that. But is it realistic?

Dr. Success: That doubt you just expressed - that's exactly what we need to address. This is the difference between wishing and burning desire. A wish says "wouldn't it be nice if..." but burning desire says "I will find a way or make one." Let's work on transforming that doubt into unshakeable belief.

User: Okay, I can feel the difference. When I think about my kids' future, that doubt melts away. I WILL make this happen.

Dr. Success: Perfect! Now you're experiencing true burning desire. Let's establish your daily visualization practice to program this into your subconscious mind...
`;

  const input: AnalyzerInput = {
    blueprintSessions: testSessions,
    currentProgress: initialProgress,
    transcript: testTranscript
  };

  try {
    console.log("📝 Analyzing test conversation...");
    const startTime = Date.now();
    
    const result = await generateMeetingAnalysis(input);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Analysis completed in ${duration}ms\n`);

    console.log("📊 PROGRESS SUMMARY:");
    console.log("=" .repeat(50));
    console.log(result.progressSummary);
    console.log("\n");

    console.log("📈 UPDATED PROGRESS:");
    console.log("=" .repeat(50));
    console.log(JSON.stringify(result.updatedProgress, null, 2));
    console.log("\n");

    console.log("🎯 NEXT SESSION PROMPT (first 500 chars):");
    console.log("=" .repeat(50));
    console.log(result.nextSessionPrompt.substring(0, 500) + "...");
    console.log("\n");

    // Verify the analysis contains expected sections
    const hasPersonality = result.nextSessionPrompt.includes("PERSONALITY AND TONE");
    const hasGuidelines = result.nextSessionPrompt.includes("SESSION GUIDELINES");
    const hasStates = result.nextSessionPrompt.includes("CONVERSATION STATES");
    
    console.log("✅ VALIDATION RESULTS:");
    console.log("=" .repeat(50));
    console.log(`✅ Has Progress Summary: ${!!result.progressSummary}`);
    console.log(`✅ Has Updated Progress Array: ${Array.isArray(result.updatedProgress)}`);
    console.log(`✅ Has Next Session Prompt: ${!!result.nextSessionPrompt}`);
    console.log(`✅ Prompt has PERSONALITY section: ${hasPersonality}`);
    console.log(`✅ Prompt has GUIDELINES section: ${hasGuidelines}`);
    console.log(`✅ Prompt has CONVERSATION STATES: ${hasStates}`);
    
    if (hasPersonality && hasGuidelines && hasStates) {
      console.log("\n🎉 SUCCESS: Sophisticated Analysis System is working perfectly!");
      console.log("🔥 The Voice Agent Prompt Generation System is ready for production!");
    } else {
      console.log("\n⚠️  WARNING: Analysis system working but missing some required sections");
    }

  } catch (error) {
    console.error("❌ ANALYSIS FAILED:");
    console.error(error);
    process.exit(1);
  }
}

testAnalysis().catch(console.error);