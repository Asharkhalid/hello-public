"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useTRPC } from "@/trpc/client";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";

interface BlueprintSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BlueprintSelectionDialog = ({
  open,
  onOpenChange,
}: BlueprintSelectionDialogProps) => {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");

  const { data: blueprints } = useSuspenseQuery(
    trpc.agentBlueprints.getMany.queryOptions({ page: 1, pageSize: 50 })
  );

  const createFromBlueprint = useMutation(
    trpc.agents.createFromBlueprint.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(
          trpc.agents.getMany.queryOptions({})
        );
        await queryClient.invalidateQueries(
          trpc.premium.getFreeUsage.queryOptions()
        );
        
        toast.success("Agent created successfully!");
        onOpenChange(false);
        
        // Navigate to the new agent
        router.push(`/agents/${data.agent.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
        
        if (error.data?.code === "FORBIDDEN") {
          router.push("/upgrade");
        }
      },
    })
  );

  const selectedBlueprint = blueprints.items.find(b => b.id === selectedBlueprintId);

  const handleCreate = () => {
    if (!selectedBlueprintId) {
      toast.error("Please select a blueprint");
      return;
    }

    createFromBlueprint.mutate({
      blueprintId: selectedBlueprintId,
      customName: customName.trim() || undefined,
    });
  };

  const handleReset = () => {
    setSelectedBlueprintId(null);
    setCustomName("");
  };

  return (
    <ResponsiveDialog
      title="Create Agent from Blueprint"
      description="Choose a learning program to create your personalized AI agent"
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) handleReset();
      }}
    >
      <div className="flex flex-col h-full max-h-[600px] gap-4">
        {blueprints.items.length === 0 ? (
          <EmptyState
            title="No Blueprints Available"
            description="There are currently no learning programs available."
          />
        ) : (
          <>
            {/* Blueprint Selection */}
            <div className="flex-1 overflow-y-auto space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Available Learning Programs
              </h4>
              
              <div className="grid gap-3">
                {blueprints.items.map((blueprint) => (
                  <Card
                    key={blueprint.id}
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedBlueprintId === blueprint.id
                        ? "ring-2 ring-primary bg-accent/30"
                        : ""
                    }`}
                    onClick={() => setSelectedBlueprintId(blueprint.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{blueprint.name}</CardTitle>
                        {blueprint.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      {blueprint.description && (
                        <CardDescription className="text-sm">
                          {blueprint.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    {!!blueprint.meetingTemplates && (
                      <CardContent className="pt-0">
                        <div className="text-xs text-muted-foreground">
                                                     Multiple conversations included
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Selected Blueprint Details & Customization */}
            {selectedBlueprint && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Customize Your Agent
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customName">
                        Agent Name (optional)
                      </Label>
                      <Input
                        id="customName"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder={`${selectedBlueprint.name} Journey`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use the default name
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createFromBlueprint.isPending}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleCreate}
            disabled={!selectedBlueprintId || createFromBlueprint.isPending}
          >
            {createFromBlueprint.isPending ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

export const BlueprintSelectionDialogLoading = () => {
  return (
    <div className="p-6">
      <LoadingState 
        title="Loading Blueprints" 
        description="Fetching available learning programs..." 
      />
    </div>
  );
}; 