"use client";

import React from 'react';

export type AnimationType = 'spiral' | 'dotted' | 'metamorphic' | 'stars' | 'lamps' | 'canvas' | 'voice';

interface AnimationSelectorProps {
  selectedAnimation: AnimationType;
  onAnimationChange: (animation: AnimationType) => void;
}

const ANIMATION_OPTIONS: { value: AnimationType; label: string }[] = [
  { value: 'spiral', label: 'Spiral' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'metamorphic', label: 'Metamorphic' },
  { value: 'stars', label: 'Glowing Stars' },
  { value: 'lamps', label: 'Lamps' },
  { value: 'canvas', label: 'Canvas Effect' },
  { value: 'voice', label: 'Voice Bars' },
];

export const AnimationSelector: React.FC<AnimationSelectorProps> = ({
  selectedAnimation,
  onAnimationChange,
}) => {
  return (
    <select
      value={selectedAnimation}
      onChange={(e) => onAnimationChange(e.target.value as AnimationType)}
      className="
        px-3 py-2 text-sm rounded-lg
        bg-black/40 backdrop-blur-md 
        border border-white/10 
        text-white/90
        hover:bg-black/60 hover:border-white/20
        focus:outline-none focus:ring-2 focus:ring-cyan-500/50
        transition-all duration-200
        cursor-pointer
      "
    >
      {ANIMATION_OPTIONS.map((option) => (
        <option 
          key={option.value} 
          value={option.value}
          className="bg-gray-900 text-white"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}; 