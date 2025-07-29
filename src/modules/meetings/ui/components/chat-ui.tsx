import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Channel as StreamChannel, MessageResponse, Event } from "stream-chat";
import {
  useCreateChatClient,
  Chat,
  Channel,
} from "stream-chat-react";

import { useTRPC } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";
import { EnhancedChatUI } from "./enhanced-chat-ui";

import "stream-chat-react/dist/css/v2/index.css";

interface ChatUIProps {
  meetingId: string;
  meetingName: string;
  userId: string;
  userName: string;
  userImage: string | undefined;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  avatar?: string;
  isLoading?: boolean;
}

export const ChatUI = ({
  meetingId,
  meetingName,
  userId,
  userName,
  userImage,
}: ChatUIProps) => {
  const trpc = useTRPC();
  const { mutateAsync: generateChatToken } = useMutation(
    trpc.meetings.generateChatToken.mutationOptions(),
  );

  const [channel, setChannel] = useState<StreamChannel>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const client = useCreateChatClient({
    apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
    tokenOrProvider: generateChatToken,
    userData: {
      id: userId,
      name: userName,
      image: userImage,
    },
  });

  useEffect(() => {
    if (!client) return;

    const channel = client.channel("messaging", meetingId, {
      members: [userId],
    });

    setChannel(channel);

    // Load existing messages and convert to our format
    const loadMessages = async () => {
      try {
        const state = await channel.watch();
        const streamMessages = Object.values(state.messages || {});
        
        const convertedMessages: Message[] = streamMessages.map((msg: MessageResponse) => ({
          id: msg.id,
          content: msg.text || "",
          sender: msg.user?.id === userId ? "user" : "ai",
          timestamp: new Date(msg.created_at || Date.now()),
          avatar: msg.user?.image,
        }));

        // If no messages exist, add a welcome message to Stream Chat
        if (convertedMessages.length === 0) {
          await channel.sendMessage({
            text: `Hello! I'm your AI assistant for "${meetingName}". I can help you analyze your meeting content, answer questions about transcripts, and provide insights. How can I assist you today?`,
            user_id: "ai-assistant", // Use a special AI user ID
          });
        } else {
          setMessages(convertedMessages);
        }
      } catch (error) {
        console.error("ChatUI: Error loading messages:", error);
      }
    };

    loadMessages();

    // Listen for new messages
    const handleNewMessage = (event: Event) => {
      if (event.message) {
        const msg = event.message;
        const newMessage: Message = {
          id: msg.id,
          content: msg.text || "",
          sender: msg.user?.id === userId ? "user" : "ai",
          timestamp: new Date(msg.created_at || Date.now()),
          avatar: msg.user?.image,
        };
        
        setMessages(prev => {
          // Don't add duplicates
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    };

    channel.on("message.new", handleNewMessage);

    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [client, meetingId, userId]);

  const handleSendMessage = async (content: string) => {
    if (!channel) return;

    setIsLoading(true);
    try {
      await channel.sendMessage({
        text: content,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!client) {
    return (
      <LoadingState
        title="Loading Chat"
        description="This may take a few seconds"
      />
    );
  }

  return (
    <div className="w-full h-full">
      <Chat client={client}>
        <Channel channel={channel}>
          <div className="bg-card rounded-lg border overflow-hidden h-[600px] w-full flex flex-col">
            <EnhancedChatUI
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </Channel>
      </Chat>
    </div>
  );
};