import { useState } from "react";
import Link from "next/link";
import { LogInIcon, BookOpenIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  DefaultVideoPlaceholder,
  StreamVideoParticipant,
  ToggleAudioPreviewButton,
  ToggleVideoPreviewButton,
  useCallStateHooks,
  VideoPreview,
} from "@stream-io/video-react-sdk";
import { useSuspenseQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateAvatarUri } from "@/lib/avatar";

import "@stream-io/video-react-sdk/dist/css/styles.css";

interface Props {
  onJoin: () => void;
  meetingId: string;
};

const DisabledVideoPreview = () => {
  const { data } = authClient.useSession();

  return (
    <DefaultVideoPlaceholder
      participant={
        {
          name: data?.user.name ?? "",
          image: 
            data?.user.image ??
            generateAvatarUri({
              seed: data?.user.name ?? "",
              variant: "initials",
            }),
        } as StreamVideoParticipant
      }
    />
  )
}

const AllowBrowserPermissions = () => {
  return (
    <p className="text-sm">
      Please grant your browser a permission to access your camera and
      microphone.
    </p>
  );
};

export const CallLobby = ({ onJoin, meetingId }: Props) => {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.meetings.getOne.queryOptions({ id: meetingId }));

  const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
  const { hasBrowserPermission: hasCameraPermission } = useCameraState();

  const hasBrowserMediaPermission = hasCameraPermission && hasMicPermission;

  // Truncate prompt for preview
  const promptPreview = data.prompt?.slice(0, 200) + (data.prompt && data.prompt.length > 200 ? "..." : "");

  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
      <div className="py-4 px-8 flex flex-1 items-center justify-center max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-6 w-full">
          {/* Meeting Overview */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">What You&apos;ll Learn</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Call Setup */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Join Your Session</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set up your camera and microphone before joining
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Preview */}
              <div className="relative">
                <VideoPreview
                  DisabledVideoPreview={
                    hasBrowserMediaPermission
                      ? DisabledVideoPreview
                      : AllowBrowserPermissions 
                  }
                />
              </div>

              {/* Audio/Video Controls */}
              <div className="flex gap-2 justify-center">
                <ToggleAudioPreviewButton />
                <ToggleVideoPreviewButton />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/meetings">
                    Cancel
                  </Link>
                </Button>
                <Button
                  onClick={onJoin}
                  className="flex-1"
                  disabled={!hasBrowserMediaPermission}
                >
                  <LogInIcon className="w-4 h-4 mr-2" />
                  Join Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}