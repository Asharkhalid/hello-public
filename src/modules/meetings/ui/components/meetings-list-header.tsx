"use client";

import { XCircleIcon } from "lucide-react";

import { DEFAULT_PAGE } from "@/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { StatusFilter } from "./status-filter";
import { AgentIdFilter } from "./agent-id-filter";
import { MeetingsSearchFilter } from "./meetings-search-filter";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";

export const MeetingsListHeader = () => {
  const [filters, setFilters] = useMeetingsFilters();

  const isAnyFilterModified =
    !!filters.status || !!filters.search || !!filters.agentId;

  const onClearFilters = () => {
    setFilters({
      status: null,
      agentId: "",
      search: "",
      page: DEFAULT_PAGE,
    });
  };

  return (
    <div className="py-4 flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
          My Meetings
        </h2>
      </div>
      <ScrollArea>
        <div className="flex items-center gap-x-2 p-1">
          <MeetingsSearchFilter />
          <StatusFilter />
          <AgentIdFilter />
          {isAnyFilterModified && (
            <Button variant="outline" onClick={onClearFilters}>
              <XCircleIcon className="size-4" />
              Clear
            </Button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
