import React from 'react';

type VisualizationMode = "aura" | "glow" | "pulse" | "wave";

interface VisualizerModeSelectorProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  className?: string;
}

const modes: { key: VisualizationMode; label: string; icon: string; description: string }[] = [
  {
    key: "aura",
    label: "Aura",
    icon: "🌟",
    description: "Classic aura effect with pulsing orbs"
  },
  {
    key: "glow",
    label: "Glow",
    icon: "✨",
    description: "Soft glowing radial effect"
  },
  {
    key: "pulse",
    label: "Pulse",
    icon: "💫",
    description: "Expanding ring pulses"
  },
  {
    key: "wave",
    label: "Wave",
    icon: "🌊",
    description: "Frequency-based wave visualization"
  }
];

export const VisualizerModeSelector: React.FC<VisualizerModeSelectorProps> = ({
  currentMode,
  onModeChange,
  className = ""
}) => {
  return (
    <div className={`visualizer-mode-selector ${className}`}>
      <div className="mode-selector-header">
        <span className="mode-selector-title">Visualizer</span>
      </div>
      <div className="mode-selector-grid">
        {modes.map((mode) => (
          <button
            key={mode.key}
            className={`mode-button ${currentMode === mode.key ? 'mode-button--active' : ''}`}
            onClick={() => onModeChange(mode.key)}
            title={mode.description}
          >
            <span className="mode-icon">{mode.icon}</span>
            <span className="mode-label">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// CSS styles (can be moved to a separate CSS file)
const styles = `
.visualizer-mode-selector {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 50;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 200px;
}

.mode-selector-header {
  margin-bottom: 12px;
  text-align: center;
}

.mode-selector-title {
  color: white;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
}

.mode-selector-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.mode-button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.mode-button--active {
  background: rgba(0, 245, 255, 0.2);
  border-color: rgba(0, 245, 255, 0.5);
  box-shadow: 0 0 15px rgba(0, 245, 255, 0.3);
}

.mode-button--active:hover {
  background: rgba(0, 245, 255, 0.25);
}

.mode-icon {
  font-size: 18px;
  line-height: 1;
}

.mode-label {
  font-weight: 500;
  opacity: 0.9;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .visualizer-mode-selector {
    top: 10px;
    right: 10px;
    padding: 12px;
    min-width: 160px;
  }
  
  .mode-selector-grid {
    gap: 6px;
  }
  
  .mode-button {
    padding: 8px 6px;
    font-size: 11px;
  }
  
  .mode-icon {
    font-size: 16px;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 