export interface ColorConfig {
  user: {
    primary: string;
    secondary: string;
    glow: string;
  };
  ai: {
    primary: string;
    secondary: string;
    glow: string;
  };
  neutral: {
    primary: string;
    secondary: string;
    glow: string;
  };
}

export const defaultColors: ColorConfig = {
  user: {
    primary: '#ff006e',
    secondary: '#ff4458',
    glow: '#ff006e'
  },
  ai: {
    primary: '#00d9ff',
    secondary: '#0891b2',
    glow: '#00d9ff'
  },
  neutral: {
    primary: '#9333ea',
    secondary: '#7c3aed',
    glow: '#a855f7'
  }
};

export class ColorTransition {
  private currentColor = { r: 147, g: 51, b: 234 }; // Start with neutral purple
  private targetColor = { r: 147, g: 51, b: 234 };
  private transitionSpeed = 0.1;
  
  update(speaker: 'user' | 'ai' | 'both' | 'none') {
    // Set target color based on speaker
    switch (speaker) {
      case 'user':
        this.targetColor = this.hexToRgb('#ff006e');
        break;
      case 'ai':
        this.targetColor = this.hexToRgb('#00d9ff');
        break;
      case 'both':
        this.targetColor = this.hexToRgb('#a855f7'); // Purple when both speaking
        break;
      default:
        this.targetColor = this.hexToRgb('#6366f1'); // Indigo when none
    }
  }
  
  getCurrentColor(): string {
    // Smooth transition to target color
    this.currentColor.r += (this.targetColor.r - this.currentColor.r) * this.transitionSpeed;
    this.currentColor.g += (this.targetColor.g - this.currentColor.g) * this.transitionSpeed;
    this.currentColor.b += (this.targetColor.b - this.currentColor.b) * this.transitionSpeed;
    
    return `rgb(${Math.round(this.currentColor.r)}, ${Math.round(this.currentColor.g)}, ${Math.round(this.currentColor.b)})`;
  }
  
  getCurrentColorHex(): string {
    return this.rgbToHex(
      Math.round(this.currentColor.r),
      Math.round(this.currentColor.g),
      Math.round(this.currentColor.b)
    );
  }
  
  getCurrentColorRgba(alpha: number): string {
    return `rgba(${Math.round(this.currentColor.r)}, ${Math.round(this.currentColor.g)}, ${Math.round(this.currentColor.b)}, ${alpha})`;
  }
  
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  
  setTransitionSpeed(speed: number) {
    this.transitionSpeed = Math.max(0.01, Math.min(1, speed));
  }
}