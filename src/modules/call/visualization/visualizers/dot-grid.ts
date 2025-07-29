import type { AudioVisualizer, AudioData } from '../types';

export class DotGridVisualizer implements AudioVisualizer {
  id = 'dot-grid';
  name = 'Dot Grid';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gridSize = 25;
    const time = audioData.timestamp * 0.001;
    
    for (let x = gridSize/2; x < canvas.width; x += gridSize) {
      for (let y = gridSize/2; y < canvas.height; y += gridSize) {
        const isUserZone = y > canvas.height / 2;
        const volume = isUserZone ? audioData.userVolume : audioData.aiVolume;
        const frequencies = isUserZone ? audioData.userFrequencies : audioData.aiFrequencies;
        const color = isUserZone ? '#ff006e' : '#00d9ff';
        
        // Get frequency for this position
        const freqIndex = Math.floor((x / canvas.width) * frequencies.length);
        const freqValue = frequencies[freqIndex] / 255;
        
        // Create ripple effect from center
        const centerX = canvas.width / 2;
        const centerY = isUserZone ? canvas.height * 0.75 : canvas.height * 0.25;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const wave = Math.sin(distance * 0.02 - time * 3 - freqValue * Math.PI) * 0.5 + 0.5;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = (0.1 + volume * 0.4 + freqValue * 0.3) * wave;
        ctx.beginPath();
        ctx.arc(x, y, 1 + volume * 6 + freqValue * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  }
}