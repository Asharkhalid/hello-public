"use client";

import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";

export const UpgradeView = () => {
  // Premium features temporarily disabled
  // const trpc = useTRPC();
  // const { data: products } = useSuspenseQuery(
  //   trpc.premium.getProducts.queryOptions()
  // );
  // const { data: currentSubscription } = useSuspenseQuery(
  //   trpc.premium.getCurrentSubscription.queryOptions()
  // );

  return (
    <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-10">
      <div className="mt-4 flex-1 flex flex-col gap-y-10 items-center">
        <h5 className="font-medium text-2xl md:text-3xl">
          You are on the{" "}
          <span className="font-semibold text-primary">
            Free
          </span>{" "}
          plan
        </h5>
        <div className="text-center text-muted-foreground">
          <p>Premium features are temporarily unavailable.</p>
          <p>All features are currently free to use.</p>
        </div>
      </div>
    </div>
  );
};

export const UpgradeViewLoading = () => {
  return (
    <LoadingState title="Loading" description="This may take a few seconds" />
  );
};

export const UpgradeViewError = () => {
  return <ErrorState title="Error" description="Please try again later" />;
};
