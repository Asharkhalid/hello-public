import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { AudioVisualizer, AudioData } from '../types';

export class DualZoneAdapter implements AudioVisualizer {
  id = 'dual-zone';
  name = 'Dual Zone (Classic)';
  private container: HTMLElement | null = null;
  private root: Root | null = null;
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    // For React component, we'll mount it as overlay
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'absolute inset-0';
      canvas.parentElement?.appendChild(this.container);
      this.root = createRoot(this.container);
    }
    
    // Hide canvas when using React component
    canvas.style.display = 'none';
    
    
    // Simple placeholder for now - shows audio levels
    this.root?.render(
      <div className="relative w-full h-full bg-gray-900">
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 relative flex items-center justify-center">
            {/* AI Zone (top) */}
            <div className="text-center">
              <div 
                className="w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center transition-all duration-300"
                style={{
                  transform: `scale(${0.8 + audioData.aiVolume * 0.4})`,
                  backgroundColor: `rgba(0, 217, 255, ${0.2 + audioData.aiVolume * 0.5})`
                }}
              >
                <span className="text-blue-400 text-sm">AI</span>
              </div>
              {audioData.isSpeaking.ai && (
                <p className="text-blue-400 text-xs mt-2">Speaking</p>
              )}
            </div>
          </div>
          
          <div className="h-px bg-gray-700" />
          
          <div className="flex-1 relative flex items-center justify-center">
            {/* Human Zone (bottom) */}
            <div className="text-center">
              <div 
                className="w-32 h-32 rounded-full bg-pink-500/20 flex items-center justify-center transition-all duration-300"
                style={{
                  transform: `scale(${0.8 + audioData.userVolume * 0.4})`,
                  backgroundColor: `rgba(255, 0, 110, ${0.2 + audioData.userVolume * 0.5})`
                }}
              >
                <span className="text-pink-400 text-sm">You</span>
              </div>
              {audioData.isSpeaking.user && (
                <p className="text-pink-400 text-xs mt-2">Speaking</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  cleanup() {
    // Show canvas again
    if (this.container?.previousElementSibling instanceof HTMLCanvasElement) {
      this.container.previousElementSibling.style.display = '';
    }
    
    this.root?.unmount();
    this.container?.remove();
    this.container = null;
    this.root = null;
  }
}