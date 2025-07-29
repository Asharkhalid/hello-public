import type { AudioVisualizer, AudioData } from '../types';
import { ColorTransition } from '../utils/color-utils';

interface Cell {
  brightness: number;
  targetBrightness: number;
  rippleStrength: number;
}

export class ReactiveMatrixVisualizer implements AudioVisualizer {
  id = 'reactive-matrix';
  name = 'Reactive Matrix';
  private colorTransition = new ColorTransition();
  private grid: Cell[][] = [];
  private gridSize = 20;
  private ripples: Array<{ x: number; y: number; strength: number; age: number }> = [];
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(17, 24, 39, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update color based on speaker
    const speaker = this.getActiveSpeaker(audioData);
    this.colorTransition.update(speaker);
    const currentColor = this.colorTransition.getCurrentColor();
    
    // Combine audio data
    const combinedVolume = Math.max(audioData.userVolume, audioData.aiVolume);
    const combinedFrequencies = this.combineFrequencies(
      audioData.userFrequencies,
      audioData.aiFrequencies,
      audioData.userVolume,
      audioData.aiVolume
    );
    
    // Initialize grid if needed
    if (this.grid.length === 0) {
      this.initializeGrid();
    }
    
    // Add ripples based on audio
    this.addRipples(combinedVolume, combinedFrequencies);
    
    // Update and draw grid
    this.updateGrid(combinedFrequencies);
    this.drawGrid(ctx, canvas, currentColor);
    
    // Update ripples
    this.updateRipples();
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
  
  private initializeGrid() {
    this.grid = [];
    for (let i = 0; i < this.gridSize; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        this.grid[i][j] = {
          brightness: 0,
          targetBrightness: 0,
          rippleStrength: 0
        };
      }
    }
  }
  
  private addRipples(volume: number, frequencies: Uint8Array) {
    if (volume > 0.3 && Math.random() < volume) {
      // Find frequency peak
      let maxFreq = 0;
      let maxIndex = 0;
      for (let i = 0; i < frequencies.length; i++) {
        if (frequencies[i] > maxFreq) {
          maxFreq = frequencies[i];
          maxIndex = i;
        }
      }
      
      const x = Math.floor((maxIndex / frequencies.length) * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      
      this.ripples.push({
        x,
        y,
        strength: volume,
        age: 0
      });
      
      // Limit ripples
      if (this.ripples.length > 10) {
        this.ripples.shift();
      }
    }
  }
  
  private updateGrid(frequencies: Uint8Array) {
    // Update ripple effects
    for (const ripple of this.ripples) {
      const radius = ripple.age * 0.5;
      
      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          const distance = Math.sqrt(
            Math.pow(i - ripple.x, 2) + Math.pow(j - ripple.y, 2)
          );
          
          if (distance < radius && distance > radius - 1) {
            const strength = ripple.strength * (1 - ripple.age / 20);
            this.grid[i][j].rippleStrength = Math.max(
              this.grid[i][j].rippleStrength,
              strength
            );
          }
        }
      }
    }
    
    // Update cell brightness based on frequencies and ripples
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const freqIndex = Math.floor((i / this.gridSize) * frequencies.length);
        const frequency = frequencies[freqIndex] / 255;
        
        // Base brightness from frequency
        const baseBrightness = frequency * 0.3;
        
        // Add ripple effect
        const rippleBrightness = this.grid[i][j].rippleStrength;
        
        // Set target brightness
        this.grid[i][j].targetBrightness = Math.min(1, baseBrightness + rippleBrightness);
        
        // Smooth transition
        this.grid[i][j].brightness += 
          (this.grid[i][j].targetBrightness - this.grid[i][j].brightness) * 0.2;
        
        // Decay ripple strength
        this.grid[i][j].rippleStrength *= 0.95;
      }
    }
  }
  
  private updateRipples() {
    this.ripples = this.ripples.filter(ripple => {
      ripple.age += 0.5;
      return ripple.age < 20;
    });
  }
  
  private drawGrid(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    color: string
  ) {
    const cellWidth = canvas.width / this.gridSize;
    const cellHeight = canvas.height / this.gridSize;
    const padding = 2;
    
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const cell = this.grid[i][j];
        const x = i * cellWidth;
        const y = j * cellHeight;
        
        // Cell color with brightness
        ctx.fillStyle = color;
        ctx.globalAlpha = cell.brightness;
        
        // Draw cell
        ctx.fillRect(
          x + padding,
          y + padding,
          cellWidth - padding * 2,
          cellHeight - padding * 2
        );
        
        // Add glow for bright cells
        if (cell.brightness > 0.5) {
          ctx.shadowColor = color;
          ctx.shadowBlur = cell.brightness * 20;
          ctx.fillRect(
            x + padding,
            y + padding,
            cellWidth - padding * 2,
            cellHeight - padding * 2
          );
          ctx.shadowBlur = 0;
        }
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  cleanup() {
    this.grid = [];
    this.ripples = [];
  }
}