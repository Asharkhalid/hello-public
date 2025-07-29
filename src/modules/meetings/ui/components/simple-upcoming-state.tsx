"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon, VideoIcon } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";

interface Props {
  meetingId: string;
}

export const SimpleUpcomingState = ({ meetingId }: Props) => {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.meetings.getOne.queryOptions({ id: meetingId }));

  const promptPreview = data.prompt?.slice(0, 200) + (data.prompt && data.prompt.length > 200 ? "..." : "");

  const handleJoin = () => {
    router.push(`/call/${meetingId}?autoJoin=true`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
      <div className="py-4 px-8 flex flex-1 items-center justify-center max-w-4xl mx-auto">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{data.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agent Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {data.agent.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">{data.agent.name}</p>
                <p className="text-xs text-muted-foreground">Your Learning Coach</p>
              </div>
            </div>

            {/* Meeting Prompt/Content */}
            {data.prompt && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Session Focus</h4>
                <div className="bg-background border rounded-lg p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {showFullPrompt ? data.prompt : promptPreview}
                  </p>
                  {data.prompt.length > 200 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullPrompt(!showFullPrompt)}
                      className="mt-2 p-0 h-auto text-xs text-primary hover:text-primary/80"
                    >
                      {showFullPrompt ? (
                        <>
                          <ChevronUpIcon className="w-3 h-3 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="w-3 h-3 mr-1" />
                          Read More
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Meeting Status */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                Ready to Start
              </Badge>
            </div>

            {/* Join Button */}
            <div className="pt-2">
              <Button onClick={handleJoin} className="w-full" size="lg">
                <VideoIcon className="w-4 h-4 mr-2" />
                Join Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};