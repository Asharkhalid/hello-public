import type { AudioVisualizer, AudioData } from '../types';

export class SpectrumBarsVisualizer implements AudioVisualizer {
  id = 'spectrum-bars';
  name = 'Spectrum Bars';
  private barHeights: number[] = [];
  private targetHeights: number[] = [];
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'rgba(26, 32, 44, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barCount = 64;
    const barWidth = canvas.width / barCount;
    const barSpacing = barWidth * 0.1;
    const barActualWidth = barWidth - barSpacing;
    
    // Initialize arrays if needed
    if (this.barHeights.length !== barCount) {
      this.barHeights = new Array(barCount).fill(0);
      this.targetHeights = new Array(barCount).fill(0);
    }
    
    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Process frequencies
    const userBars = Math.floor(barCount / 2);
    const aiBars = barCount - userBars;
    
    // Update target heights for user
    for (let i = 0; i < userBars; i++) {
      const freqIndex = Math.floor((i / userBars) * audioData.userFrequencies.length);
      const frequency = audioData.userFrequencies[freqIndex] / 255;
      this.targetHeights[i] = frequency * canvas.height * 0.4 * (0.5 + audioData.userVolume);
    }
    
    // Update target heights for AI
    for (let i = 0; i < aiBars; i++) {
      const freqIndex = Math.floor((i / aiBars) * audioData.aiFrequencies.length);
      const frequency = audioData.aiFrequencies[freqIndex] / 255;
      this.targetHeights[userBars + i] = frequency * canvas.height * 0.4 * (0.5 + audioData.aiVolume);
    }
    
    // Smooth interpolation
    for (let i = 0; i < barCount; i++) {
      this.barHeights[i] += (this.targetHeights[i] - this.barHeights[i]) * 0.3;
    }
    
    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth + barSpacing / 2;
      const height = this.barHeights[i];
      const isUser = i < userBars;
      
      if (height > 2) {
        // Create gradient
        const gradient = ctx.createLinearGradient(
          x, isUser ? canvas.height : 0,
          x, isUser ? canvas.height - height : height
        );
        
        if (isUser) {
          gradient.addColorStop(0, 'rgba(255, 0, 110, 0.2)');
          gradient.addColorStop(0.5, '#ff006e');
          gradient.addColorStop(1, '#ff4458');
          
          // Draw from bottom up
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - height, barActualWidth, height);
          
          // Add glow cap
          ctx.fillStyle = '#ff4458';
          ctx.shadowColor = '#ff006e';
          ctx.shadowBlur = 10;
          ctx.fillRect(x, canvas.height - height - 2, barActualWidth, 4);
        } else {
          gradient.addColorStop(0, 'rgba(0, 217, 255, 0.2)');
          gradient.addColorStop(0.5, '#00d9ff');
          gradient.addColorStop(1, '#0891b2');
          
          // Draw from top down
          ctx.fillStyle = gradient;
          ctx.fillRect(x, 0, barActualWidth, height);
          
          // Add glow cap
          ctx.fillStyle = '#0891b2';
          ctx.shadowColor = '#00d9ff';
          ctx.shadowBlur = 10;
          ctx.fillRect(x, height - 2, barActualWidth, 4);
        }
        
        ctx.shadowBlur = 0;
      }
    }
    
    // Add reflection effect
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth + barSpacing / 2;
      const height = this.barHeights[i] * 0.3;
      const isUser = i < userBars;
      
      if (height > 1) {
        if (isUser) {
          const gradient = ctx.createLinearGradient(
            x, canvas.height,
            x, canvas.height + height
          );
          gradient.addColorStop(0, '#ff006e');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height, barActualWidth, height);
        } else {
          const gradient = ctx.createLinearGradient(
            x, 0,
            x, -height
          );
          gradient.addColorStop(0, '#00d9ff');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, -height, barActualWidth, height);
        }
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  cleanup() {
    this.barHeights = [];
    this.targetHeights = [];
  }
}