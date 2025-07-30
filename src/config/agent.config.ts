import path from "path";

export const agentConfig = {
  // OpenAI Model Configurations
  llmModel: "gpt-4o",
  ttsModel: "tts-1",
  ttsVoice: "alloy",
  // Note: The transcription model is specified in the API call itself.
  
  // Voice Activity Detection (VAD) Parameters
  // How long (in ms) of silence to detect before considering the user's turn over.
  vadSilenceTimeoutMs: 800,
  // A minimum duration for a user's speech to be processed.
  vadMinSpeechDurationMs: 250,

  // Path to the pre-recorded audio file for error handling
  errorAudioPath: path.join(process.cwd(), 'public', 'audio', 'error_generic.wav'),

  // Load API Key from environment variables for security
  openaiApiKey: process.env.OPENAI_API_KEY,
};

export type AgentConfig = typeof agentConfig;