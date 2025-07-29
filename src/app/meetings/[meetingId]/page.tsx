import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { auth } from "@/lib/auth";
import { getQueryClient, trpc } from "@/trpc/server";
import { Navbar } from "@/components/navbar";
import Aurora from "@/components/aurora";

import { 
  MeetingIdView, 
  MeetingIdViewError, 
  MeetingIdViewLoading
} from "@/modules/meetings/ui/views/meeting-id-view";

interface Props {
  params: Promise<{
    meetingId: string;
  }>;
}

const Page = async ({ params }: Props) => {
  const { meetingId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.meetings.getOne.queryOptions({ id: meetingId }),
  );

  return (
    <div className="min-h-screen bg-background relative">
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0">
        <Aurora
          colorStops={["#c96442", "#e9e6dc", "#faf9f5"]}
          blend={0.4}
          amplitude={0.6}
          speed={0.4}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={<MeetingIdViewLoading />}>
            <ErrorBoundary fallback={<MeetingIdViewError />}>
              <MeetingIdView meetingId={meetingId} />
            </ErrorBoundary>
          </Suspense>
        </HydrationBoundary>
      </div>
    </div>
  );
}
 
export default Page;