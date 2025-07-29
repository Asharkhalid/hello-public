import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { ErrorBoundary } from "react-error-boundary";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { auth } from "@/lib/auth";
import { getQueryClient, trpc } from "@/trpc/server";
import { Navbar } from "@/components/navbar";
import Aurora from "@/components/aurora";

import { loadSearchParams } from "@/modules/meetings/params";
import { MeetingsListHeader } from "@/modules/meetings/ui/components/meetings-list-header";
import { 
  MeetingsView, 
  MeetingsViewError, 
  MeetingsViewLoading
} from "@/modules/meetings/ui/views/meetings-view";

interface Props {
  searchParams: Promise<SearchParams>;
}

const Page = async ({ searchParams }: Props) => {
  const filters = await loadSearchParams(searchParams);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.meetings.getMany.queryOptions({
      ...filters,
    })
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
        <div className="flex justify-center items-center px-4 md:px-6 lg:px-8">
          <div className="w-full max-w-4xl bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden">
            <div className="p-6">
              <MeetingsListHeader />
              <HydrationBoundary state={dehydrate(queryClient)}>
                <Suspense fallback={<MeetingsViewLoading />}>
                  <ErrorBoundary fallback={<MeetingsViewError />}>
                    <MeetingsView />
                  </ErrorBoundary>
                </Suspense>
              </HydrationBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default Page;