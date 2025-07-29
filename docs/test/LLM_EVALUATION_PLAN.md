# Hello AI - LLM Evaluation Plan for Meeting Analysis v2

## Table of Contents
1. [Evaluation Overview](#evaluation-overview)
2. [Core Evaluation Metrics](#core-evaluation-metrics)
3. [Test Dataset Design](#test-dataset-design)
4. [Evaluation Scenarios](#evaluation-scenarios)
5. [Automated Testing Framework](#automated-testing-framework)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Quality Assurance Criteria](#quality-assurance-criteria)
8. [Continuous Evaluation Pipeline](#continuous-evaluation-pipeline)

---

## Evaluation Overview

### Purpose
The meeting-analysis-v2 system is the core intelligence engine that:
- Analyzes conversation transcripts against learning objectives
- Tracks participant progress through multi-session journeys
- Generates personalized AI coach prompts for subsequent sessions
- Maintains participant context and adaptation

### Critical Success Factors
1. **Accuracy**: Correctly identifies completion of learning criteria
2. **Consistency**: Maintains coherent progress tracking across sessions
3. **Personalization**: Adapts to individual participant styles and needs
4. **Prompt Quality**: Generates effective, contextual AI instructions
5. **Reliability**: Handles edge cases and incomplete data gracefully

### Evaluation Approach
```
Test Transcripts → LLM Analysis → Output Validation → Metrics Collection
                                         ↓
                                  Quality Scoring → Continuous Improvement
```

---

## Core Evaluation Metrics

### 1. Criteria Detection Accuracy

```typescript
interface CriteriaEvaluation {
  transcriptId: string;
  criteria: string;
  expectedStatus: "completed" | "partial" | "not_met";
  actualStatus: "completed" | "partial" | "not_met";
  evidenceQuality: 1-5; // How well evidence supports the determination
}

// Metrics:
// - Precision: Correctly identified completions / Total identified completions
// - Recall: Correctly identified completions / Total actual completions
// - F1 Score: Harmonic mean of precision and recall
```

### 2. Progress Tracking Coherence

```typescript
interface ProgressCoherence {
  sessionSequence: SessionProgress[];
  coherenceChecks: {
    statusProgression: boolean;      // pending → in_progress → completed
    criteriaConsistency: boolean;    // No criteria "uncompleted"
    notesContinuity: boolean;        // Notes build on previous
    dateSequencing: boolean;         // Chronologically sensible
  };
}
```

### 3. Personalization Effectiveness

```typescript
interface PersonalizationMetrics {
  participantId: string;
  identifiedTraits: {
    communicationStyle: string;
    motivations: string[];
    strengths: string[];
    concerns: string[];
  };
  adaptationEvidence: {
    promptPersonalization: boolean;
    exampleRelevance: 1-5;
    toneMatching: 1-5;
    contextBridging: 1-5;
  };
}
```

### 4. Prompt Generation Quality

```typescript
interface PromptQuality {
  promptId: string;
  structureCompliance: {
    hasPersonality: boolean;
    hasGuidelines: boolean;
    hasStates: boolean;
    stateStructureValid: boolean;
  };
  contentQuality: {
    objectiveClarity: 1-5;
    instructionSpecificity: 1-5;
    exampleRelevance: 1-5;
    transitionLogic: 1-5;
  };
}
```

---

## Test Dataset Design

### 1. Transcript Scenarios

```typescript
const testScenarios = [
  {
    id: "complete_success",
    description: "Participant meets all criteria clearly",
    transcript: loadTranscript("complete_success.json"),
    expectedCriteriaMet: 5,
    expectedCriteriaPending: 0,
    expectedPromptType: "advancement"
  },
  {
    id: "partial_completion",
    description: "Some criteria met, others pending",
    transcript: loadTranscript("partial_completion.json"),
    expectedCriteriaMet: 3,
    expectedCriteriaPending: 2,
    expectedPromptType: "continuation"
  },
  {
    id: "off_topic_discussion",
    description: "Participant diverges from objectives",
    transcript: loadTranscript("off_topic.json"),
    expectedCriteriaMet: 1,
    expectedCriteriaPending: 4,
    expectedPromptType: "adaptive"
  },
  {
    id: "emotional_breakthrough",
    description: "Deep personal insights emerge",
    transcript: loadTranscript("emotional_breakthrough.json"),
    expectedPersonalNotes: true,
    expectedAdaptations: ["supportive_tone", "celebration_references"]
  },
  {
    id: "technical_participant",
    description: "Analytical, detail-oriented discussion",
    transcript: loadTranscript("technical_style.json"),
    expectedCommunicationStyle: "analytical",
    expectedPromptAdjustments: ["precise_language", "data_examples"]
  }
];
```

### 2. Blueprint Variations

```typescript
const testBlueprints = [
  {
    name: "Linear Progression",
    sessions: createLinearSessions(10),
    expectedBehavior: "Sequential advancement"
  },
  {
    name: "Prerequisite Based",
    sessions: createPrerequisiteSessions(8),
    expectedBehavior: "Conditional progression"
  },
  {
    name: "Adaptive Path",
    sessions: createAdaptiveSessions(12),
    expectedBehavior: "Dynamic routing based on performance"
  }
];
```

### 3. Edge Cases

```typescript
const edgeCases = [
  {
    name: "Empty Transcript",
    input: { transcript: "", progress: [], sessions: [mockSession] },
    expectedBehavior: "Graceful handling, continuation prompt"
  },
  {
    name: "Corrupted Progress",
    input: { transcript: mockTranscript, progress: null, sessions: [] },
    expectedBehavior: "Recovery with warning"
  },
  {
    name: "All Sessions Complete",
    input: createCompletedJourney(),
    expectedBehavior: "Celebration/wrap-up prompt"
  },
  {
    name: "Multilingual Content",
    input: createMultilingualTranscript(),
    expectedBehavior: "Correct analysis despite language"
  }
];
```

---

## Evaluation Scenarios

### Scenario 1: Criteria Completion Detection

```typescript
describe('Criteria Completion Analysis', () => {
  const testCases = [
    {
      criterion: "Written definite purpose statement created",
      transcript: "User: I've written down my purpose: To create a $500k business in 18 months that helps people manage finances while providing security for my family.",
      expectedStatus: "completed",
      expectedEvidence: "written down my purpose: To create a $500k business"
    },
    {
      criterion: "Daily visualization practice committed",
      transcript: "User: I like the idea of visualization but I'm not sure when I'll have time for it daily.",
      expectedStatus: "partial",
      expectedEvidence: "like the idea... not sure when"
    }
  ];
  
  test.each(testCases)('correctly identifies $expectedStatus for criterion', async (testCase) => {
    const result = await analyzeCompletion(testCase);
    expect(result.status).toBe(testCase.expectedStatus);
    expect(result.evidence).toContain(testCase.expectedEvidence);
  });
});
```

### Scenario 2: Progress Coherence

```typescript
describe('Progress Tracking Coherence', () => {
  test('maintains logical session progression', async () => {
    const journey = createTestJourney(5); // 5 sessions
    const results = [];
    
    for (const session of journey) {
      const analysis = await generateMeetingAnalysis({
        blueprintSessions: journey,
        currentProgress: results,
        transcript: session.mockTranscript
      });
      
      results.push(...analysis.updatedProgress);
      
      // Verify coherence
      expect(isProgressCoherent(results)).toBe(true);
      expect(hasValidStatusTransitions(results)).toBe(true);
    }
  });
});
```

### Scenario 3: Personalization Tracking

```typescript
describe('Participant Personalization', () => {
  test('identifies and maintains participant traits', async () => {
    const transcripts = [
      createAnalyticalTranscript(),
      createEmotionalTranscript(),
      createMotivatedTranscript()
    ];
    
    let progress = [];
    for (const transcript of transcripts) {
      const analysis = await generateMeetingAnalysis({
        blueprintSessions: testSessions,
        currentProgress: progress,
        transcript
      });
      
      progress = analysis.updatedProgress;
      
      // Extract personalization
      const traits = extractParticipantTraits(analysis.progressSummary);
      expect(traits.communicationStyle).toBeDefined();
      expect(traits.motivations.length).toBeGreaterThan(0);
      
      // Verify prompt adaptation
      const promptAdaptations = extractPromptAdaptations(analysis.nextSessionPrompt);
      expect(promptAdaptations).toMatchObject({
        hasPersonalizedExamples: true,
        referencesParticipantContext: true,
        matchesCommunicationStyle: true
      });
    }
  });
});
```

### Scenario 4: Prompt Generation Quality

```typescript
describe('Prompt Generation', () => {
  test('generates valid conversation states', async () => {
    const analysis = await generateMeetingAnalysis(mockInput);
    const prompt = analysis.nextSessionPrompt;
    
    // Extract conversation states
    const statesMatch = prompt.match(/CONVERSATION STATES[\s\S]*?(\[[\s\S]*?\])/);
    const states = JSON.parse(statesMatch[1]);
    
    // Validate structure
    expect(states).toBeInstanceOf(Array);
    expect(states.length).toBeGreaterThanOrEqual(4);
    expect(states.length).toBeLessThanOrEqual(8);
    
    states.forEach(state => {
      expect(state).toMatchObject({
        id: expect.stringMatching(/^\d+_\w+/),
        description: expect.any(String),
        instructions: expect.arrayContaining([expect.any(String)]),
        examples: expect.arrayContaining([expect.any(String)]),
        transitions: expect.arrayContaining([{
          next_step: expect.any(String),
          condition: expect.any(String)
        }])
      });
    });
  });
});
```

---

## Automated Testing Framework

### Test Runner Configuration

```typescript
// llm-evaluation.config.ts
export const evaluationConfig = {
  model: "gpt-4o",
  temperature: 0.7, // Match production
  maxRetries: 2,
  timeout: 30000,
  parallelTests: 5,
  
  datasets: {
    transcripts: "./test-data/transcripts",
    blueprints: "./test-data/blueprints",
    expectedOutputs: "./test-data/expected"
  },
  
  metrics: {
    accuracy: { threshold: 0.85, weight: 0.3 },
    coherence: { threshold: 0.90, weight: 0.2 },
    personalization: { threshold: 0.80, weight: 0.25 },
    promptQuality: { threshold: 0.85, weight: 0.25 }
  }
};
```

### Evaluation Pipeline

```typescript
class LLMEvaluator {
  async runFullEvaluation(): Promise<EvaluationReport> {
    const results = {
      criteriaAccuracy: await this.evaluateCriteriaDetection(),
      progressCoherence: await this.evaluateProgressTracking(),
      personalization: await this.evaluatePersonalization(),
      promptQuality: await this.evaluatePromptGeneration(),
      edgeCases: await this.evaluateEdgeCases(),
      performance: await this.evaluatePerformance()
    };
    
    return this.generateReport(results);
  }
  
  private async evaluateCriteriaDetection() {
    const testCases = loadTestCases('criteria-detection');
    const results = [];
    
    for (const testCase of testCases) {
      const output = await generateMeetingAnalysis(testCase.input);
      const evaluation = this.compareCriteriaResults(
        testCase.expected,
        output.updatedProgress
      );
      results.push(evaluation);
    }
    
    return this.calculateMetrics(results);
  }
}
```

### Continuous Integration

```yaml
# .github/workflows/llm-evaluation.yml
name: LLM Evaluation
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup evaluation environment
        run: |
          npm install
          npm run build:evaluation
      
      - name: Run LLM evaluation suite
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm run evaluate:llm
      
      - name: Generate evaluation report
        run: npm run evaluate:report
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: llm-evaluation-report
          path: ./evaluation-reports/
      
      - name: Check quality gates
        run: npm run evaluate:gates
```

---

## Performance Benchmarks

### Response Time Targets

```typescript
const performanceBenchmarks = {
  averageResponseTime: 3000, // 3 seconds
  p95ResponseTime: 5000,     // 5 seconds
  p99ResponseTime: 8000,     // 8 seconds
  maxResponseTime: 10000,    // 10 seconds
  
  tokenUsage: {
    averageInput: 2000,
    averageOutput: 1500,
    maxTotal: 4000
  }
};
```

### Load Testing

```typescript
describe('Performance Under Load', () => {
  test('handles concurrent analyses', async () => {
    const concurrentRequests = 10;
    const requests = Array(concurrentRequests).fill(null).map(() => 
      generateMeetingAnalysis(createRandomInput())
    );
    
    const startTime = Date.now();
    const results = await Promise.all(requests);
    const endTime = Date.now();
    
    const avgTime = (endTime - startTime) / concurrentRequests;
    expect(avgTime).toBeLessThan(5000);
    
    // Verify quality doesn't degrade
    results.forEach(result => {
      expect(result.progressSummary).toBeTruthy();
      expect(result.updatedProgress).toBeInstanceOf(Array);
      expect(result.nextSessionPrompt).toContain('PERSONALITY AND TONE');
    });
  });
});
```

---

## Quality Assurance Criteria

### Output Validation Rules

```typescript
const qualityRules = {
  progressSummary: {
    minLength: 500,
    maxLength: 3000,
    requiredSections: [
      'Session Analysis',
      'Completion Criteria Assessment',
      'Key Accomplishments',
      'Participant Profile Insights'
    ],
    forbiddenContent: [
      'undefined',
      'null',
      '[object Object]',
      'NaN'
    ]
  },
  
  updatedProgress: {
    requiredFields: [
      'session_id',
      'session_status',
      'criteria_met',
      'criteria_pending'
    ],
    validStatuses: ['pending', 'in_progress', 'completed'],
    dateFormat: /^\d{4}-\d{2}-\d{2}$/
  },
  
  nextSessionPrompt: {
    minLength: 1000,
    requiredSections: [
      'PERSONALITY AND TONE',
      'SESSION GUIDELINES',
      'CONVERSATION STATES'
    ],
    minConversationStates: 4,
    maxConversationStates: 8
  }
};
```

### Error Handling Tests

```typescript
describe('Error Resilience', () => {
  test('handles malformed input gracefully', async () => {
    const malformedInputs = [
      { blueprintSessions: null },
      { currentProgress: "not-an-array" },
      { transcript: undefined },
      { blueprintSessions: [], currentProgress: [], transcript: "" }
    ];
    
    for (const input of malformedInputs) {
      await expect(generateMeetingAnalysis(input as any))
        .rejects
        .toThrow(/Invalid input/);
    }
  });
  
  test('recovers from partial failures', async () => {
    const input = createTestInput();
    input.transcript = "🔥💯 Unicode heavy content מִבְחָן テスト";
    
    const result = await generateMeetingAnalysis(input);
    expect(result).toBeDefined();
    expect(result.progressSummary).not.toContain('�');
  });
});
```

---

## Continuous Evaluation Pipeline

### Monitoring Dashboard

```typescript
interface EvaluationMetrics {
  timestamp: Date;
  overallScore: number;
  componentScores: {
    criteriaAccuracy: number;
    progressCoherence: number;
    personalization: number;
    promptQuality: number;
  };
  failedTests: string[];
  warnings: string[];
  recommendations: string[];
}

// Grafana/Datadog metrics
export const metricsCollector = {
  recordEvaluation: (metrics: EvaluationMetrics) => {
    // Send to monitoring service
    statsd.gauge('llm.evaluation.overall_score', metrics.overallScore);
    statsd.gauge('llm.evaluation.criteria_accuracy', metrics.componentScores.criteriaAccuracy);
    // ... other metrics
  }
};
```

### A/B Testing Framework

```typescript
class PromptVariantTester {
  async testVariants() {
    const variants = [
      { name: 'baseline', systemPrompt: SYSTEM_PROMPT },
      { name: 'concise', systemPrompt: CONCISE_SYSTEM_PROMPT },
      { name: 'detailed', systemPrompt: DETAILED_SYSTEM_PROMPT }
    ];
    
    const results = await Promise.all(
      variants.map(async variant => ({
        name: variant.name,
        scores: await this.evaluateVariant(variant.systemPrompt)
      }))
    );
    
    return this.compareVariants(results);
  }
}
```

### Regression Testing

```typescript
describe('Regression Tests', () => {
  const goldenDataset = loadGoldenDataset();
  
  test.each(goldenDataset)('maintains quality for case: $name', async (testCase) => {
    const result = await generateMeetingAnalysis(testCase.input);
    
    // Compare against golden output
    expect(result.progressSummary).toMatchSnapshot();
    expect(result.updatedProgress).toMatchSnapshot();
    
    // Verify key metrics remain stable
    const metrics = calculateMetrics(result, testCase.expected);
    expect(metrics.accuracy).toBeGreaterThan(0.85);
  });
});
```

---

## Evaluation Execution Schedule

| Evaluation Type | Frequency | Duration | Triggers |
|----------------|-----------|----------|----------|
| Unit Tests | On commit | <2 min | Code changes |
| Integration Tests | On PR | <5 min | Pull requests |
| Full Evaluation | Daily | <30 min | Scheduled |
| Performance Tests | Weekly | <1 hour | Sunday night |
| A/B Tests | Biweekly | <2 hours | Manual |
| Golden Dataset | On deploy | <10 min | Production deploy |

---

*This comprehensive LLM evaluation plan ensures the meeting-analysis-v2 system maintains high quality, accuracy, and reliability in production.*