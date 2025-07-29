"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { DataPagination } from "@/components/data-pagination";
import { Button } from "@/components/ui/button";

import { MeetingCover } from "../components/meeting-cover";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";

import "../components/meeting-cover.css";

export const MeetingsView = () => {
  const trpc = useTRPC();
  const [filters, setFilters] = useMeetingsFilters();

  const { data } = useSuspenseQuery(trpc.meetings.getMany.queryOptions({
    ...filters,
  }));
  
  return (
    <div className="flex-1 pb-4 flex flex-col gap-y-4">
      {data.items.length === 0 ? (
        <EmptyState
          title="No meetings found"
          description="You haven't started any conversations yet. Browse learning programs to begin your journey."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
            {data.items.map((meeting) => (
              <div
                key={meeting.id}
                className="flex flex-col items-center text-center"
              >
                <Link href={`/meetings/${meeting.id}`} className="mb-2">
                  <div className="w-[130px] h-[195px]">
                    <MeetingCover
                      meetingName={meeting.name}
                      agentName={meeting.agent.name}
                      status={meeting.status}
                      startedAt={meeting.startedAt ? new Date(meeting.startedAt) : null}
                    />
                  </div>
                </Link>
                <Link href={`/meetings/${meeting.id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-accent-foreground hover:bg-primary hover:text-primary-foreground font-medium text-[10px] sm:text-xs px-3 py-1 h-auto"
                  >
                    {meeting.status === "upcoming" ? "Start" : 
                     meeting.status === "completed" ? "Review" : 
                     meeting.status === "active" ? "Join" : "View"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <DataPagination
            page={filters.page}
            totalPages={data.totalPages}
            onPageChange={(page) => setFilters({ page })}
          />
        </>
      )}
    </div>
  );
};

export const MeetingsViewLoading = () => {
  return (
    <LoadingState
      title="Loading Meetings"
      description="This may take a fews econds"
    />
  );
};

export const MeetingsViewError = () => {
  return (
    <ErrorState
      title="Error Loading Meetings"
      description="Something went wrong"
    />
  )
}