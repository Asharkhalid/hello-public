"use client";

import { toast } from "sonner";
import { useState } from "react";
import { VideoIcon, BookOpenIcon, CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";


import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/hooks/use-confirm";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { GeneratedAvatar } from "@/components/generated-avatar";

import { UpdateAgentDialog } from "../components/update-agent-dialog";
import { AgentIdViewHeader } from "../components/agent-id-view-header";

interface Props {
  agentId: string;
};

export const AgentIdView = ({ agentId }: Props) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [updateAgentDialogOpen, setUpdateAgentDialogOpen] = useState(false);
  
  const { data } = useSuspenseQuery(trpc.agents.getOne.queryOptions({ id: agentId }));
  
  // Fetch meetings for this agent
  const { data: meetings } = useSuspenseQuery(
    trpc.meetings.getMany.queryOptions({ 
      page: 1, 
      pageSize: 10, 
      agentId: agentId 
    })
  );

  const removeAgent = useMutation(
    trpc.agents.remove.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions({}));
        await queryClient.invalidateQueries(
          trpc.premium.getFreeUsage.queryOptions(),
        );
        router.push("/agents");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const [RemoveConfirmation, confirmRemove] = useConfirm(
    "Are you sure?",
    `The following action will remove ${data.meetingCount} associated meetings`,
  );

  const handleRemoveAgent = async () => {
    const ok = await confirmRemove();

    if (!ok) return;

    await removeAgent.mutateAsync({ id: agentId });
  };

  // Check if this is a blueprint-based agent
  const agentData = data as typeof data & { 
    blueprintSnapshot?: { name?: string; description?: string } | null;
    progressTracker?: string | null;
  };
  const isBlueprint = agentData.blueprintSnapshot && agentData.progressTracker;
  const blueprintSnapshot = agentData.blueprintSnapshot;

  return (
    <>
      <RemoveConfirmation />
      <UpdateAgentDialog
        open={updateAgentDialogOpen}
        onOpenChange={setUpdateAgentDialogOpen}
        initialValues={data}
      />
      <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <AgentIdViewHeader
          agentId={agentId}
          agentName={data.name}
          onEdit={() => setUpdateAgentDialogOpen(true)}
          onRemove={handleRemoveAgent}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Agent Info */}
          <div className={`${isBlueprint ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-lg border`}>
            <div className="px-4 py-5 gap-y-5 flex flex-col">
            <div className="flex items-center gap-x-3">
              <GeneratedAvatar
                variant="botttsNeutral"
                seed={data.name}
                className="size-10"
              />
                <div className="flex flex-col">
              <h2 className="text-2xl font-medium">{data.name}</h2>
                  {isBlueprint && blueprintSnapshot && (
                    <div className="flex items-center gap-x-2 mt-1">
                      <BookOpenIcon className="size-4 text-blue-600" />
                      <span className="text-sm text-muted-foreground">
                        {blueprintSnapshot.name} Learning Journey
                      </span>
                    </div>
                  )}
                </div>
            </div>
              
            <Badge
              variant="outline"
                className="flex items-center gap-x-2 [&>svg]:size-4 w-fit"
            >
              <VideoIcon className="text-blue-700" />
              {data.meetingCount} {data.meetingCount === 1 ? "meeting" : "meetings"}
            </Badge>
              
            <div className="flex flex-col gap-y-4">
                <p className="text-lg font-medium">
                  {isBlueprint ? "Agent Overview" : "Instructions"}
                </p>
                <p className="text-neutral-800">
                  {isBlueprint && blueprintSnapshot?.description 
                    ? blueprintSnapshot.description 
                    : "No description available"
                  }
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Meetings Section */}
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-x-2">
                <CalendarIcon className="size-5 text-blue-600" />
                Recent Meetings ({meetings.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meetings.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No meetings yet</p>
              ) : (
                <div className="space-y-3">
                  {meetings.items.slice(0, 5).map((meeting) => (
                    <div 
                      key={meeting.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50"
                      onClick={() => router.push(`/meetings/${meeting.id}`)}
                    >
                      <div>
                        <p className="font-medium">{meeting.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(meeting.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {meeting.status}
                      </Badge>
                    </div>
                  ))}
                  {meetings.total > 5 && (
                    <div 
                      className="text-center py-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                      onClick={() => router.push(`/meetings?agentId=${agentId}`)}
                    >
                      View all {meetings.total} meetings →
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export const AgentIdViewLoading = () => {
  return (
    <LoadingState
      title="Loading Agent"
      description="This may take a fews econds"
    />
  );
};

export const AgentIdViewError = () => {
  return (
    <ErrorState
      title="Error Loading Agent"
      description="Something went wrong"
    />
  )
}