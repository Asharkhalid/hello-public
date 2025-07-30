// lib/agent/AgentOrchestrator.ts

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import OpenAI from 'openai';
import { AgentConfig } from '@/config/agent.config';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { transcriptCollector } from '@/lib/transcript/collector';
import fs from 'fs';

export class AgentOrchestrator {
  private ws: WebSocket;
  private config: AgentConfig;
  private meetingId: string;
  private prompt: string = '';
  private openai: OpenAI;
  private isProcessing: boolean = false;

  constructor(meetingId: string, ws: WebSocket, config: AgentConfig) {
    this.meetingId = meetingId;
    this.ws = ws;
    this.config = config;
    if (!config.openaiApiKey) throw new Error("OpenAI API key is not configured.");
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.init();
  }


  private async init() {
    console.log(`[Orchestrator] Initializing for meeting ${this.meetingId}`);
    try {
      const meeting = await db.query.meetings.findFirst({
        where: eq(meetings.id, this.meetingId),
      });

      if (!meeting || !meeting.prompt) {
        throw new Error(`Meeting or prompt not found for ID: ${this.meetingId}`);
      }
      this.prompt = meeting.prompt;
      console.log(`[Orchestrator] Ready and listening for meeting ${this.meetingId}`);
    } catch (error) {
      console.error(`[Orchestrator] Initialization failed:`, error);
      this.ws.close(1011, 'Failed to initialize session.');
    }
  }

  public async handleClientAudio(audioBuffer: Buffer) {
    if (this.isProcessing) return; // Prevent concurrent processing
    this.isProcessing = true;

    try {
      const transcription = await this.openai.audio.transcriptions.create({
          model: "gpt-4o-transcribe",
          response_format: "text",
        file: new File([audioBuffer], "input.webm"),
      });

      console.log(`[Orchestrator] User said: "${transcription}"`);
     //  await transcriptCollector.storeChunk(this.meetingId, 'user', transcription);

      await this._generateAIResponse(transcription);
    } catch (error) {
      this._handlePipelineError(error as Error, 'stt_or_llm');
    } finally {
      this.isProcessing = false;
    }
  }

  private async _generateAIResponse(userText: string) {
    try {
      const gptStream = await this.openai.chat.completions.create({
        model: this.config.llmModel,
        messages: [{ role: 'system', content: this.prompt }, { role: 'user', content: userText }],
        stream: true,
      });

      let fullResponse = "";
      let sentenceBuffer = "";

      for await (const chunk of gptStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          sentenceBuffer += content;
          if (/[.!?]/.test(sentenceBuffer)) {
            const sentences = sentenceBuffer.split(/(?<=[.!?])\s*/);
            const completeSentences = sentences.slice(0, -1);
            sentenceBuffer = sentences.slice(-1)[0] || "";
            for (const sentence of completeSentences) {
              if (sentence.trim()) await this._streamSentenceToClient(sentence);
            }
          }
        }
      }
      
      if (sentenceBuffer.trim()) await this._streamSentenceToClient(sentenceBuffer);
      console.log(`[Orchestrator] AI response generated: "${fullResponse}"`);
     //  await transcriptCollector.storeChunk(this.meetingId, 'agent', fullResponse);
    } catch (error) {
      throw error;
    }
  }

  private async _streamSentenceToClient(sentence: string) {
    try {
      const response = await this.openai.audio.speech.create({
        model: this.config.ttsModel,
        voice: this.config.ttsVoice,
        input: sentence,
        response_format: "mp3",
      });

      // Get the complete audio buffer for the sentence
      const audioBuffer = await response.arrayBuffer();

      // Send the complete audio file to the client
      this.ws.send(JSON.stringify({ type: 'audio_chunk', data: Buffer.from(audioBuffer).toString('base64') }));
    } catch (error) {
      console.error(`[Orchestrator] TTS failed for sentence: "${sentence}"`, error);
      throw error;
    }
  }


  private _handlePipelineError(error: Error, stage: string) {
    console.error(`[Orchestrator] Error during pipeline stage '${stage}':`, error);
    
    try {
      const apologyAudio = fs.readFileSync(this.config.errorAudioPath);
      this.ws.send(JSON.stringify({ type: 'audio_chunk', data: apologyAudio.toString('base64') }));
    } catch (readError) {
      console.error(`[Orchestrator] CRITICAL: Could not read error audio file.`, readError);
    }

    // The 'finally' block in handleClientAudio will reset the isProcessing flag.
  }
  
  public cleanup() {
    console.log(`[Orchestrator] Cleaning up resources for meeting ${this.meetingId}.`);
    // No timers to clear in this architecture.
  }

}