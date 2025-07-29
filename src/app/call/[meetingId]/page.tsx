import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { auth } from "@/lib/auth";
import { getQueryClient, trpc } from "@/trpc/server";

import { CallView } from "@/modules/call/ui/views/call-view";

interface Props {
  params: Promise<{
    meetingId: string;
  }>;
  searchParams: Promise<{ autoJoin?: string }>;
};

const Page = async ({ params, searchParams }: Props) => {
  const { meetingId } = await params;
  const { autoJoin } = await searchParams;

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
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CallView meetingId={meetingId} autoJoin={autoJoin === "true"} />
    </HydrationBoundary>
  );
};

export default Page;
