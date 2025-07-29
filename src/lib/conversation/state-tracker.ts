import { EventEmitter } from 'events';

export type AgentState = 'idle' | 'listening' | 'processing' | 'thinking' | 'speaking' | 'waiting';

export interface ConversationState {
  agentState: AgentState;
  currentSpeaker: 'user' | 'ai' | null;
  isResponding: boolean;
  lastEventTime: number;
  turnCount: number;
}

export class ConversationStateTracker extends EventEmitter {
  private state: ConversationState = {
    agentState: 'idle',
    currentSpeaker: null,
    isResponding: false,
    lastEventTime: Date.now(),
    turnCount: 0
  };

  handleEvent(eventType: string) {
    const previousState = this.state.agentState;
    
    switch (eventType) {
      case 'input_audio_buffer.speech_started':
        this.state.agentState = 'listening';
        this.state.currentSpeaker = 'user';
        break;
        
      case 'input_audio_buffer.speech_stopped':
        this.state.agentState = 'processing';
        break;
        
      case 'response.created':
        this.state.agentState = 'thinking';
        this.state.isResponding = true;
        break;
        
      case 'response.audio.delta':
        this.state.agentState = 'speaking';
        this.state.currentSpeaker = 'ai';
        break;
        
      case 'response.done':
        this.state.agentState = 'waiting';
        this.state.isResponding = false;
        this.state.turnCount++;
        break;
    }
    
    this.state.lastEventTime = Date.now();
    
    if (previousState !== this.state.agentState) {
      this.emit('stateChange', this.state);
    }
  }
  
  getState(): ConversationState {
    return { ...this.state };
  }
}

// Global registry for active conversations
export const conversationStates = new Map<string, ConversationStateTracker>();