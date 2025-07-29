import { db } from '@/db';
import * as schema from '@/db/schema';
import { auth } from '@/lib/auth';
import { MAX_FREE_AGENTS, MAX_FREE_MEETINGS } from '@/modules/premium/constants';
import { initTRPC, TRPCError } from '@trpc/server';
import { InferSelectModel, count, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { cache } from 'react';

// Define the shape of the user and the session
type User = InferSelectModel<typeof schema.user>;
type Session = { user: User; session: { id: string; expiresAt: Date; /* ... and other session fields */ } };

interface Context {
  db: typeof db;
  auth: Session | null;
}

export const createTRPCContext = cache(async (): Promise<Context> => {
  const sessionData = await auth.api.getSession({
    headers: await headers(),
  });

  // If there's no session or user, return null for auth
  if (!sessionData || !sessionData.user || !sessionData.session) {
    return { db, auth: null };
  }

  return {
    db,
    auth: {
      user: sessionData.user as User,
      session: sessionData.session as Session['session'],
    },
  };
});

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create();

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

export const premiumProcedure = (entity: "meetings" | "agents") =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const [userMeetings] = await db
      .select({
        count: count(schema.meetings.id),
      })
      .from(schema.meetings)
      .where(eq(schema.meetings.userId, ctx.auth.user.id));

    const [userAgents] = await db
      .select({
        count: count(schema.agents.id),
      })
      .from(schema.agents)
      .where(eq(schema.agents.userId, ctx.auth.user.id));

    // Mock customer data for development
    const isPremium = false; // Set to true to test premium features
    const isFreeAgentLimitReached = userAgents.count >= MAX_FREE_AGENTS;
    const isFreeMeetingLimitReached = userMeetings.count >= MAX_FREE_MEETINGS;

    const shouldThrowMeetingError =
      entity === "meetings" && isFreeMeetingLimitReached && !isPremium;
    const shouldThrowAgentError =
      entity === "agents" && isFreeAgentLimitReached && !isPremium;

    if (shouldThrowMeetingError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You have reached the maximum number of free meetings",
      });
    }

    if (shouldThrowAgentError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You have reached the maximum number of free agents",
      });
    }

    return next({ ctx: { ...ctx, customer: { activeSubscriptions: [] } } });
  });
