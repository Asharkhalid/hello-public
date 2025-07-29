"use client";

import { LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";

import { useTRPC } from "@/trpc/client";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { CallUI } from "./call-ui";

interface Props {
  meetingId: string;
  meetingName: string;
  userId: string;
  userName: string;
  userImage: string;
  autoJoin?: boolean;
};

export const CallConnect = ({
  meetingId,
  meetingName,
  userId,
  userName,
  userImage,
  autoJoin = false,
}: Props) => {
  const trpc = useTRPC();
  const { mutateAsync: generateToken } = useMutation(
    trpc.meetings.generateToken.mutationOptions(),
  );

  const [client, setClient] = useState<StreamVideoClient>();
  useEffect(() => {
    const _client = new StreamVideoClient({
      apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
      user: {
        id: userId,
        name: userName,
        image: userImage,
      },
      tokenProvider: generateToken,
    });

    setClient(_client);

    return () => {
      _client.disconnectUser();
      setClient(undefined);
    };
  }, [userId, userName, userImage, generateToken]);

  const [call, setCall] = useState<Call>();
  useEffect(() => {
      if (!client) return;

      const _call = client.call("default", meetingId);
      
      // Disable camera and microphone asynchronously
      Promise.all([
        _call.camera.disable(),
        _call.microphone.disable()
      ]).catch((error) => {
        console.error('Error disabling camera/mic:', error);
      });
      
      setCall(_call);

      return () => {
        if (_call.state.callingState !== CallingState.LEFT) {
          _call.leave().catch(console.error);
          setCall(undefined);
        }
      };
  }, [client, meetingId]);

  if (!client || !call) {
    return (
      <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
        <LoaderIcon className="size-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallUI meetingName={meetingName} meetingId={meetingId} autoJoin={autoJoin} />
      </StreamCall>
    </StreamVideo>
  );
};
