import { eq, count } from "drizzle-orm";

import { db } from "@/db";
// import { polarClient } from "@/lib/polar";
import { agents, meetings } from "@/db/schema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";

export const premiumRouter = createTRPCRouter({
  getCurrentSubscription: protectedProcedure.query(async () => {
    // Temporarily disabled Polar integration
      return null;
    
    // const customer = await polarClient.customers.getStateExternal({
    //   externalId: ctx.auth.user.id,
    // });

    // const subscription = customer.activeSubscriptions[0];

    // if (!subscription) {
    //   return null;
    // }

    // const product = await polarClient.products.get({
    //   id: subscription.productId,
    // });

    // return product;
  }),
  getProducts: protectedProcedure.query(async () => {
    // Temporarily disabled Polar integration
    return [];
    
    // const products = await polarClient.products.list({
    //   isArchived: false,
    //   isRecurring: true,
    //   sorting: ["price_amount"],
    // });

    // return products.result.items;
  }),
  getFreeUsage: protectedProcedure.query(async ({ ctx }) => {
    // Skip Polar customer check for now and just return usage counts
    const userId = (ctx.auth.user as { id: string }).id;

    const [userMeetings] = await db
      .select({
        count: count(meetings.id),
      })
      .from(meetings)
      .where(eq(meetings.userId, userId));

    const [userAgents] = await db
      .select({
        count: count(agents.id),
      })
      .from(agents)
      .where(eq(agents.userId, userId));

    return {
      meetingCount: userMeetings.count,
      agentCount: userAgents.count,
    };
  })
});