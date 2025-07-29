import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, getTableColumns, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { agentBlueprints, agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { createTRPCRouter, premiumProcedure, protectedProcedure, baseProcedure } from "@/trpc/init";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "@/constants";

import { agentsInsertSchema, agentsUpdateSchema } from "../schemas";

export const agentBlueprintsRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [blueprint] = await db
        .select()
        .from(agentBlueprints)
        .where(eq(agentBlueprints.id, input.id));

      if (!blueprint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent blueprint not found",
        });
      }

      return blueprint;
    }),
  getMany: baseProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish()
      })
    )
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;

      const data = await db
        .select()
        .from(agentBlueprints)
        .where(
          and(
            eq(agentBlueprints.isActive, true),
            search ? ilike(agentBlueprints.name, `%${search}%`) : undefined
          )
        )
        .orderBy(desc(agentBlueprints.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [total] = await db
        .select({ count: count() })
        .from(agentBlueprints)
        .where(
          and(
            eq(agentBlueprints.isActive, true),
            search ? ilike(agentBlueprints.name, `%${search}%`) : undefined
          )
        );
      
      const totalPages = Math.ceil(total.count / pageSize);

      return {
        items: data,
        total: total.count,
        totalPages,
      };
    }),
});

export const agentsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(agentsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedAgent] = await db
        .update(agents)
        .set(input)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.auth.user.id),
          )
        )
        .returning();

      if (!updatedAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return updatedAgent;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [removedAgent] = await db
        .delete(agents)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.auth.user.id),
          ),
        )
        .returning();

      if (!removedAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return removedAgent;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
    const [existingAgent] = await db
      .select({
        ...getTableColumns(agents),
        meetingCount: db.$count(meetings, eq(agents.id, meetings.agentId)),
      })
      .from(agents)
      .where(
        and(
          eq(agents.id, input.id),
          eq(agents.userId, ctx.auth.user.id),
        )
      );

    if (!existingAgent) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
    }

    return existingAgent;
  }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish()
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize } = input;

      const data = await db
        .select({
          ...getTableColumns(agents),
          meetingCount: db.$count(meetings, eq(agents.id, meetings.agentId)),
        })
        .from(agents)
        .where(
          and(
            eq(agents.userId, ctx.auth.user.id),
            search ? ilike(agents.name, `%${search}%`) : undefined,
          )
        )
        .orderBy(desc(agents.createdAt), desc(agents.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

      const [total] = await db
        .select({ count: count() })
        .from(agents)
        .where(
          and(
            eq(agents.userId, ctx.auth.user.id),
            search ? ilike(agents.name, `%${search}%`) : undefined,
          )
        );

      const totalPages = Math.ceil(total.count / pageSize);

      return {
        items: data,
        total: total.count,
        totalPages,
      };
    }),
  create: premiumProcedure("agents")
    .input(agentsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [createdAgent] = await db
        .insert(agents)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        .returning();

      return createdAgent;
    }),
  
  // NEW: Create agent from blueprint with automatic first meeting
  createFromBlueprint: premiumProcedure("agents")
    .input(z.object({
      blueprintId: z.string(),
      customName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Fetch blueprint
      const [blueprint] = await db
        .select()
        .from(agentBlueprints)
        .where(and(
          eq(agentBlueprints.id, input.blueprintId),
          eq(agentBlueprints.isActive, true)
        ));

      if (!blueprint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Blueprint not found or inactive",
        });
      }

      const meetingTemplates = blueprint.meetingTemplates as { sessions: Array<{ id: string; name: string; instructions: string }> };
      if (!meetingTemplates?.sessions?.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Blueprint has no conversations defined",
        });
      }

      const firstConversation = meetingTemplates.sessions[0];

      // 2. Create agent with blueprint snapshot
      const agentName = input.customName || `${blueprint.name} Journey`;

      const [createdAgent] = await db
        .insert(agents)
        .values({
          name: agentName,
          userId: ctx.auth.user.id,
          blueprintId: blueprint.id,
          blueprintSnapshot: {
            id: blueprint.id,
            name: blueprint.name,
            description: blueprint.description,
            marketingCollateral: blueprint.marketingCollateral,
            conversations: meetingTemplates.sessions,
          },
        })
        .returning();

      // 3. Create first meeting automatically with current conversation tracking
      const meetingData = {
        currentConversationId: firstConversation.id,
        completedSessions: [],
        journeyStarted: new Date().toISOString(),
      };

      const [firstMeeting] = await db
        .insert(meetings)
        .values({
          id: nanoid(),
          name: firstConversation.name,
          userId: ctx.auth.user.id,
          agentId: createdAgent.id,
          prompt: firstConversation.instructions,
          meetingData: meetingData,
          status: "upcoming",
        })
        .returning();

      // Create the Stream.io video call
      const call = streamVideo.video.call("default", firstMeeting.id);
      await call.create({
        data: {
          created_by_id: ctx.auth.user.id,
          custom: {
            meetingId: firstMeeting.id,
            meetingName: firstMeeting.name,
          },
          settings_override: {
            transcription: { mode: "auto-on" },
          },
        },
      });

      return {
        agent: createdAgent,
        firstMeeting: firstMeeting,
      };
    }),
});
