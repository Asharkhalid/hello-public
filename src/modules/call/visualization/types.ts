export interface AudioVisualizer {
  id: string;
  name: string;
  render(canvas: HTMLCanvasElement, audioData: AudioData): void;
  cleanup?(): void;
}

export interface AudioData {
  userVolume: number;      // 0-1
  aiVolume: number;        // 0-1
  userFrequencies: Uint8Array;
  aiFrequencies: Uint8Array;
  isSpeaking: {
    user: boolean;
    ai: boolean;
  };
  timestamp: number;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: number;
}