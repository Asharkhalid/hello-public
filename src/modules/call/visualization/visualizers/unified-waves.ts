import type { AudioVisualizer, AudioData } from '../types';
import { ColorTransition } from '../utils/color-utils';

export class UnifiedWavesVisualizer implements AudioVisualizer {
  id = 'unified-waves';
  name = 'Unified Waves';
  private colorTransition = new ColorTransition();
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear with subtle fade
    ctx.fillStyle = 'rgba(17, 24, 39, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Determine active speaker
    const speaker = this.getActiveSpeaker(audioData);
    this.colorTransition.update(speaker);
    const currentColor = this.colorTransition.getCurrentColor();
    
    // Combine audio data from both sources
    const combinedVolume = Math.max(audioData.userVolume, audioData.aiVolume);
    const combinedFrequencies = this.combineFrequencies(
      audioData.userFrequencies, 
      audioData.aiFrequencies,
      audioData.userVolume,
      audioData.aiVolume
    );
    
    // Draw multiple wave layers
    for (let layer = 0; layer < 4; layer++) {
      this.drawWaveLayer(
        ctx, 
        combinedFrequencies, 
        currentColor, 
        canvas.height / 2,
        combinedVolume,
        audioData.timestamp,
        layer
      );
    }
    
    // Draw center energy line
    this.drawEnergyLine(ctx, canvas, combinedVolume, currentColor);
  }
  
  private getActiveSpeaker(audioData: AudioData): 'user' | 'ai' | 'both' | 'none' {
    if (audioData.isSpeaking.user && audioData.isSpeaking.ai) return 'both';
    if (audioData.isSpeaking.user) return 'user';
    if (audioData.isSpeaking.ai) return 'ai';
    return 'none';
  }
  
  private combineFrequencies(
    userFreq: Uint8Array, 
    aiFreq: Uint8Array,
    userVolume: number,
    aiVolume: number
  ): Uint8Array {
    const combined = new Uint8Array(userFreq.length);
    const totalVolume = userVolume + aiVolume || 1;
    
    for (let i = 0; i < combined.length; i++) {
      combined[i] = Math.floor(
        (userFreq[i] * userVolume + aiFreq[i] * aiVolume) / totalVolume
      );
    }
    
    return combined;
  }
  
  private drawWaveLayer(
    ctx: CanvasRenderingContext2D,
    frequencies: Uint8Array,
    color: string,
    yBase: number,
    volume: number,
    timestamp: number,
    layer: number
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = (4 - layer) * (0.5 + volume * 0.5);
    ctx.globalAlpha = (0.2 + volume * 0.3) * (1 - layer * 0.2);
    
    // Add glow for first layer
    if (layer === 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 + volume * 30;
    }
    
    ctx.beginPath();
    
    const points = frequencies.length;
    const step = ctx.canvas.width / points;
    const phaseShift = layer * 0.3 + timestamp * 0.0005;
    
    for (let i = 0; i < points; i++) {
      const x = i * step;
      const frequency = frequencies[i] / 255;
      
      // Create complex wave pattern
      const wave1 = Math.sin(i * 0.05 + phaseShift) * frequency * 100;
      const wave2 = Math.cos(i * 0.03 + phaseShift * 1.5) * frequency * 50;
      const wave3 = Math.sin(i * 0.1 + phaseShift * 2) * frequency * 25;
      
      const y = yBase + (wave1 + wave2 + wave3) * (0.5 + volume);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const controlX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, y, controlX, y);
      }
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  private drawEnergyLine(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    volume: number,
    color: string
  ) {
    const centerY = canvas.height / 2;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 + volume * 3;
    ctx.globalAlpha = 0.3 + volume * 0.4;
    
    // Create gradient for energy line
    const gradient = ctx.createLinearGradient(0, centerY, canvas.width, centerY);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(0.8, color);
    gradient.addColorStop(1, 'transparent');
    
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
  }
}