import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatInputProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Auto-resize functionality
    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
      }
    }, [props.value]);

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    return (
      <Textarea
        autoComplete="off"
        ref={textareaRef}
        name="message"
        className={cn(
          "min-h-[44px] max-h-[120px] px-4 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-lg resize-none border-input",
          "transition-all duration-200 ease-in-out",
          "hover:border-ring/50",
          className,
        )}
        rows={1}
        {...props}
      />
    );
  },
);
ChatInput.displayName = "ChatInput";

export { ChatInput }; 