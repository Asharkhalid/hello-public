import React, { useState } from 'react';
import { useCallStateHooks } from '@stream-io/video-react-sdk';
import { AudioVisualizer } from './audio-visualizer-enhanced';
import { VisualizerModeSelector } from './visualizer-mode-selector';
import './audio-visualizer-styles.css';

type VisualizationMode = "aura" | "glow" | "pulse" | "wave";

interface EnhancedCallActiveProps {
  onLeave?: () => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  className?: string;
}

export const EnhancedCallActive: React.FC<EnhancedCallActiveProps> = ({
  onLeave,
  onToggleMute,
  onToggleVideo,
  className = ""
}) => {
  const { useMicrophoneState, useCameraState, useParticipants } = useCallStateHooks();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();
  const participants = useParticipants();
  
  const [visualizerMode, setVisualizerMode] = useState<VisualizationMode>("aura");
  const [showControls, setShowControls] = useState(true);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const handleLeave = () => {
    onLeave?.();
  };

  const handleToggleMute = async () => {
    try {
      if (onToggleMute) {
        onToggleMute();
      } else {
        await microphone.toggle();
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const handleToggleVideo = async () => {
    try {
      if (onToggleVideo) {
        onToggleVideo();
      } else {
        await camera.toggle();
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  return (
    <div className={`enhanced-call-active ${className}`}>
      {/* Full-screen Audio Visualizer Background */}
      <div className="visualizer-background">
        <AudioVisualizer
          mode={visualizerMode}
          showParticipantInfo={true}
          enableAdvancedEffects={true}
          agentUserId="lucy"
        />
      </div>

      {/* Mode Selector */}
      {showModeSelector && (
        <VisualizerModeSelector
          currentMode={visualizerMode}
          onModeChange={setVisualizerMode}
        />
      )}

      {/* Floating Controls */}
      {showControls && (
        <div className="floating-controls">
          <div className="controls-panel">
            {/* Microphone Control */}
            <button
              className={`control-button ${!isMicMuted ? 'control-button--active' : 'control-button--muted'}`}
              onClick={handleToggleMute}
              title={!isMicMuted ? 'Mute microphone' : 'Unmute microphone'}
            >
              <span className="control-icon">
                {!isMicMuted ? '🎤' : '🔇'}
              </span>
              <span className="control-label">
                {!isMicMuted ? 'Mute' : 'Unmute'}
              </span>
            </button>

            {/* Camera Control */}
            <button
              className={`control-button ${!isCamMuted ? 'control-button--active' : 'control-button--disabled'}`}
              onClick={handleToggleVideo}
              title={!isCamMuted ? 'Turn off camera' : 'Turn on camera'}
            >
              <span className="control-icon">
                {!isCamMuted ? '📹' : '📷'}
              </span>
              <span className="control-label">
                {!isCamMuted ? 'Video' : 'No Video'}
              </span>
            </button>

            {/* Visualizer Mode Toggle */}
            <button
              className={`control-button ${showModeSelector ? 'control-button--active' : ''}`}
              onClick={() => setShowModeSelector(!showModeSelector)}
              title="Change visualizer mode"
            >
              <span className="control-icon">✨</span>
              <span className="control-label">Mode</span>
            </button>

            {/* Leave Call */}
            <button
              className="control-button control-button--danger"
              onClick={handleLeave}
              title="Leave call"
            >
              <span className="control-icon">📞</span>
              <span className="control-label">Leave</span>
            </button>
          </div>

          {/* Controls Toggle */}
          <button
            className="controls-toggle"
            onClick={() => setShowControls(!showControls)}
            title={showControls ? 'Hide controls' : 'Show controls'}
          >
            <span className="toggle-icon">
              {showControls ? '⬇️' : '⬆️'}
            </span>
          </button>
        </div>
      )}

      {/* Show controls toggle when hidden */}
      {!showControls && (
        <button
          className="controls-toggle controls-toggle--hidden"
          onClick={() => setShowControls(true)}
          title="Show controls"
        >
          <span className="toggle-icon">⬆️</span>
        </button>
      )}

      {/* Call Stats (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="call-stats">
          <div className="stats-item">
            Participants: {participants.length}
          </div>
          <div className="stats-item">
            Mode: {visualizerMode}
          </div>
          <div className="stats-item">
            Mic: {!isMicMuted ? 'ON' : 'OFF'}
          </div>
          <div className="stats-item">
            Camera: {!isCamMuted ? 'ON' : 'OFF'}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Call Active Styles
const enhancedStyles = `
.enhanced-call-active {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

.visualizer-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.floating-controls {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.controls-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 50px;
  padding: 16px 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.control-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
  font-size: 12px;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.control-button--active {
  background: rgba(0, 245, 255, 0.3);
  border-color: rgba(0, 245, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
}

.control-button--muted {
  background: rgba(255, 149, 0, 0.3);
  border-color: rgba(255, 149, 0, 0.5);
  box-shadow: 0 0 20px rgba(255, 149, 0, 0.3);
}

.control-button--disabled {
  background: rgba(128, 128, 128, 0.3);
  border-color: rgba(128, 128, 128, 0.5);
  opacity: 0.7;
}

.control-button--danger {
  background: rgba(255, 59, 48, 0.3);
  border-color: rgba(255, 59, 48, 0.5);
}

.control-button--danger:hover {
  background: rgba(255, 59, 48, 0.4);
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
}

.control-icon {
  font-size: 20px;
  line-height: 1;
}

.control-label {
  font-weight: 500;
  opacity: 0.9;
}

.controls-toggle {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.controls-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.controls-toggle--hidden {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.toggle-icon {
  font-size: 16px;
}

.call-stats {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 50;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 12px;
  font-family: monospace;
}

.stats-item {
  margin-bottom: 4px;
  opacity: 0.8;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .floating-controls {
    bottom: 20px;
  }
  
  .controls-panel {
    gap: 12px;
    padding: 12px 16px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .control-button {
    min-width: 60px;
    padding: 10px 12px;
    font-size: 11px;
  }
  
  .control-icon {
    font-size: 18px;
  }
  
  .call-stats {
    top: 10px;
    left: 10px;
    font-size: 11px;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .control-button,
  .controls-toggle {
    transition: none !important;
  }
  
  .control-button:hover {
    transform: none !important;
  }
}
`;

// Inject enhanced styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('enhanced-call-active-styles');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'enhanced-call-active-styles';
    styleSheet.textContent = enhancedStyles;
    document.head.appendChild(styleSheet);
  }
} 