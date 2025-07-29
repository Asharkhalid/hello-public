import type { AudioVisualizer, AudioData } from './types';

export class VisualizationManager {
  private visualizers = new Map<string, AudioVisualizer>();
  private activeId: string = 'waves';
  private canvas: HTMLCanvasElement | null = null;
  
  register(visualizer: AudioVisualizer) {
    this.visualizers.set(visualizer.id, visualizer);
  }
  
  setActive(id: string) {
    const current = this.visualizers.get(this.activeId);
    current?.cleanup?.();
    
    // Clear the canvas when switching visualizers
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
    
    if (this.visualizers.has(id)) {
      this.activeId = id;
    }
  }
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    // Store canvas reference for clearing
    this.canvas = canvas;
    
    const visualizer = this.visualizers.get(this.activeId);
    visualizer?.render(canvas, audioData);
  }
  
  getAvailable() {
    return Array.from(this.visualizers.values()).map(v => ({
      id: v.id,
      name: v.name
    }));
  }
  
  getActiveId() {
    return this.activeId;
  }
}