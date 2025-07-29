import type { AudioVisualizer, AudioData } from '../types';

export class WavesVisualizer implements AudioVisualizer {
  id = 'waves';
  name = 'Sound Waves';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid line for visual separation
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // User wave (bottom half)
    this.drawWave(
      ctx, 
      audioData.userFrequencies, 
      '#ff006e', 
      canvas.height * 0.75, 
      audioData.userVolume,
      audioData.timestamp
    );
    
    // AI wave (top half)
    this.drawWave(
      ctx, 
      audioData.aiFrequencies, 
      '#00d9ff', 
      canvas.height * 0.25, 
      audioData.aiVolume,
      audioData.timestamp
    );
  }
  
  private drawWave(
    ctx: CanvasRenderingContext2D, 
    frequencies: Uint8Array, 
    color: string, 
    yBase: number, 
    volume: number,
    timestamp: number
  ) {
    // Draw multiple wave layers for depth
    for (let layer = 0; layer < 3; layer++) {
      ctx.strokeStyle = color;
      ctx.lineWidth = (3 - layer) + volume * (4 - layer);
      ctx.globalAlpha = (0.1 + volume * 0.3) * (1 - layer * 0.3);
      ctx.beginPath();
      
      const step = ctx.canvas.width / frequencies.length;
      const phaseShift = layer * 0.5;
      const amplitudeMultiplier = 1 - layer * 0.2;
      
      for (let i = 0; i < frequencies.length; i++) {
        const x = i * step;
        const freq = frequencies[i] / 255;
        const amplitude = freq * 50 * (0.5 + volume) * amplitudeMultiplier;
        const wave1 = Math.sin(i * 0.1 + timestamp * 0.002 + phaseShift) * amplitude;
        const wave2 = Math.sin(i * 0.05 + timestamp * 0.001) * amplitude * 0.5;
        const y = yBase + wave1 + wave2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Use quadratic curves for smoother lines
          const prevX = (i - 1) * step;
          const midX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, y, midX, y);
        }
      }
      
      ctx.stroke();
    }
    
    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 * volume;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8 + volume * 0.2;
    ctx.beginPath();
    
    const step = ctx.canvas.width / frequencies.length;
    for (let i = 0; i < frequencies.length; i += 2) {
      const x = i * step;
      const amplitude = (frequencies[i] / 255) * 30 * (0.5 + volume);
      const y = yBase + Math.sin(i * 0.1 + timestamp * 0.002) * amplitude;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}