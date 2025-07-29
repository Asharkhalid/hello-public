"use client"

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EnhancedChatInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  className?: string;
}

export function EnhancedChatInput({
  value = "",
  onChange,
  onSend,
  placeholder = "Type your message...",
  disabled = false,
  isLoading = false,
  maxLength = 2000,
  className,
}: EnhancedChatInputProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
      onChange?.(newValue);
    }
  };

  const handleSend = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled && !isLoading) {
      onSend?.(trimmedValue);
      setInputValue("");
      onChange?.("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  return (
    <div className={cn("flex items-end gap-2 p-4 bg-card border-t", className)}>
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={cn(
            "min-h-[44px] max-h-[120px] resize-none pr-12 py-3 px-4",
            "bg-background border-input",
            "focus-visible:ring-1 focus-visible:ring-ring",
            "placeholder:text-muted-foreground"
          )}
          rows={1}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {inputValue.length}/{maxLength}
        </div>
      </div>
      <Button
        onClick={handleSend}
        disabled={!inputValue.trim() || disabled || isLoading}
        size="icon"
        className="h-11 w-11 rounded-lg"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
} 