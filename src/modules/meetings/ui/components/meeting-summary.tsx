"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

interface MeetingSummaryProps {
  summary: string;
}

interface SummarySection {
  title: string;
  content: string;
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) {
        // For objects in arrays, format them nicely
        return Object.entries(item)
          .map(([k, v]) => `${k}: ${formatValue(v)}`)
          .join(', ');
      }
      return String(item);
    }).join('\n');
  }
  
  if (typeof value === 'object' && value !== null) {
    // For nested objects, create a formatted string
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join('\n');
  }
  
  return String(value);
};

const parseSummary = (summary: string): SummarySection[] => {
  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(summary);
    
    // If it's an object, convert to sections
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([key, value]) => ({
        title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        content: formatValue(value)
      }));
    }
  } catch {
    // If not JSON, try to parse as markdown-style sections
    const sections = summary.split(/\n(?=#{1,3}\s)/);
    return sections.map(section => {
      const lines = section.trim().split('\n');
      const title = lines[0].replace(/^#{1,3}\s*/, '') || 'Summary';
      const content = lines.slice(1).join('\n').trim();
      return { title, content };
    }).filter(section => section.content);
  }
  
  // Fallback: treat as single section
  return [{ title: 'Summary', content: summary }];
};

export const MeetingSummary = ({ summary }: MeetingSummaryProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const sections = parseSummary(summary);

  const toggleSection = (index: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (sections.length === 1) {
    // Single section - display as simple content
    return (
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap leading-relaxed text-card-foreground">
            {sections[0].content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const isExpanded = expandedSections.has(index);
        
        return (
          <div
            key={index}
            className="border border-border rounded-lg overflow-hidden bg-card"
          >
            <button
              onClick={() => toggleSection(index)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <h3 className="font-semibold text-card-foreground">
                {section.title}
              </h3>
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border">
                <div className="pt-3">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};