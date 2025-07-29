"use client";

import { useState } from "react";
import { PlusIcon, XCircleIcon, BookOpenIcon } from "lucide-react";

import { DEFAULT_PAGE } from "@/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { NewAgentDialog } from "./new-agent-dialog";
import { BlueprintSelectionDialog } from "./blueprint-selection-dialog";
import { AgentsSearchFilter } from "./agents-search-filter";
import { useAgentsFilters } from "../../hooks/use-agents-filters";

export const AgentsListHeader = () => {
  const [filters, setFilters] = useAgentsFilters();
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [isBlueprintDialogOpen, setIsBlueprintDialogOpen] = useState(false);

  const isAnyFilterModified = !!filters.search;

  const onClearFilters = () => {
    setFilters({
      search: "",
      page: DEFAULT_PAGE,
    });
  }

  return (
    <>
      <NewAgentDialog 
        open={isCustomDialogOpen} 
        onOpenChange={setIsCustomDialogOpen} 
      />
      <BlueprintSelectionDialog 
        open={isBlueprintDialogOpen} 
        onOpenChange={setIsBlueprintDialogOpen} 
      />
      
      <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Agents</h5>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
            <PlusIcon />
            New Agent
          </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsBlueprintDialogOpen(true)}>
                <BookOpenIcon className="mr-2 h-4 w-4" />
                From Learning Program
                <span className="ml-auto text-xs text-muted-foreground">
                  Recommended
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCustomDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Custom Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <ScrollArea>
          <div className="flex items-center gap-x-2 p-1">
            <AgentsSearchFilter />
            {isAnyFilterModified && (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                <XCircleIcon />
                Clear
              </Button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
};
