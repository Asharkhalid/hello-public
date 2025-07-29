"use client";

import * as React from "react";
import { Copy, MoreHorizontal, ThumbsUp, ThumbsDown } from "lucide-react";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage, ChatBubbleAction, ChatBubbleActionWrapper } from "@/components/ui/chat-bubble";
import { EnhancedChatInput } from "@/components/ui/enhanced-chat-input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  avatar?: string;
  isLoading?: boolean;
}

interface EnhancedChatUIProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function EnhancedChatUI({
  messages,
  onSendMessage,
  isLoading = false,
  className = "",
}: EnhancedChatUIProps) {
  const [inputValue, setInputValue] = React.useState("");

  const handleSend = (message: string) => {
    onSendMessage(message);
    setInputValue("");
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

  const handleLike = () => {
    toast.success("Message liked");
    // Implement like functionality
  };

  const handleDislike = () => {
    toast.success("Feedback recorded");
    // Implement dislike functionality
  };

  return (
    <div className={`flex flex-col h-full w-full bg-card ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <ChatBubbleAvatar fallback="AI" className="h-8 w-8" />
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <ChatBubbleAvatar fallback="AI" className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
            <p className="text-muted-foreground text-sm">
              Ask me anything about your meeting or get help with your tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-4 w-full">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                variant={message.sender === "user" ? "sent" : "received"}
              >
                {message.sender === "ai" && (
                  <ChatBubbleAvatar
                    src={message.avatar}
                    fallback="AI"
                    className="h-8 w-8"
                  />
                )}
                <div className="flex flex-col max-w-[80%]">
                  <ChatBubbleMessage
                    variant={message.sender === "user" ? "sent" : "received"}
                    isLoading={message.isLoading}
                  >
                    {!message.isLoading && message.content}
                  </ChatBubbleMessage>
                  
                  {message.sender === "ai" && !message.isLoading && (
                    <ChatBubbleActionWrapper>
                      <ChatBubbleAction
                        icon={<Copy className="h-3 w-3" />}
                        onClick={() => handleCopy(message.content)}
                      />
                      <ChatBubbleAction
                        icon={<ThumbsUp className="h-3 w-3" />}
                        onClick={() => handleLike()}
                      />
                      <ChatBubbleAction
                        icon={<ThumbsDown className="h-3 w-3" />}
                        onClick={() => handleDislike()}
                      />
                    </ChatBubbleActionWrapper>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                
                {message.sender === "user" && (
                  <ChatBubbleAvatar fallback="You" className="h-8 w-8" />
                )}
              </ChatBubble>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <EnhancedChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isLoading={isLoading}
          placeholder="Type your message..."
          className="border-t-0"
        />
      </div>
    </div>
  );
} 