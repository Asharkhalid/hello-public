import { z } from "zod";
import JSONL from "jsonl-parse-stringify";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, getTableColumns, ilike, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { agents, meetings, user } from "@/db/schema";
import { generateAvatarUri } from "@/lib/avatar";
import { streamVideo } from "@/lib/stream-video";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "@/constants";
import { streamChat } from "@/lib/stream-chat";

import { MeetingStatus, StreamTranscriptItem } from "../types";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
export const meetingsRouter = createTRPCRouter({
  getTranscript: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await db
        .select()
        .from(meetings)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id))
        );

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      if (!existingMeeting.transcriptUrl) {
        return [];
      }

      const transcript = await fetch(existingMeeting.transcriptUrl)
        .then((res) => res.text())
        .then((text) => JSONL.parse<StreamTranscriptItem>(text))
        .catch(() => {
          return [];
        });

      const speakerIds = [
        ...new Set(transcript.map((item) => item.speaker_id)),
      ];

      const userSpeakers = await db
        .select()
        .from(user)
        .where(inArray(user.id, speakerIds))
        .then((users) =>
          users.map((user) => ({
            ...user,
            image:
              user.image ??
              generateAvatarUri({ seed: user.name, variant: "initials" }),
          }))
        );

      const agentSpeakers = await db
        .select()
        .from(agents)
        .where(inArray(agents.id, speakerIds))
        .then((agents) =>
          agents.map((agent) => ({
            ...agent,
            image: generateAvatarUri({
              seed: agent.name,
              variant: "botttsNeutral",
            }),
          }))
        );

      const speakers = [...userSpeakers, ...agentSpeakers];

      const transcriptWithSpeakers = transcript.map((item) => {
        const speaker = speakers.find(
          (speaker) => speaker.id === item.speaker_id
        );

        if (!speaker) {
          return {
            ...item,
            user: {
              name: "Unknown",
              image: generateAvatarUri({
                seed: "Unknown",
                variant: "initials",
              }),
            },
          };
        }

        return {
          ...item,
          user: {
            name: speaker.name,
            image: speaker.image,
          },
        };
      })

      return transcriptWithSpeakers;
    }),
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamVideo.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name,
        role: "admin",
        image: 
          ctx.auth.user.image ??
          generateAvatarUri({ seed: ctx.auth.user.name, variant: "initials" }),
      },
    ]);

    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const issuedAt = Math.floor(Date.now() / 1000) - 60;

    const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issuedAt,
    });

    return token;
  }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [removedMeeting] = await db
        .delete(meetings)
        .where(
          and(
            eq(meetings.id, input.id),
            eq(meetings.userId, ctx.auth.user.id),
          )
        )
        .returning();

      if (!removedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return removedMeeting;
    }),
  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedMeeting] = await db
        .update(meetings)
        .set(input)
        .where(
          and(
            eq(meetings.id, input.id),
            eq(meetings.userId, ctx.auth.user.id),
          )
        )
        .returning();

      if (!updatedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return updatedMeeting;
    }),
  create: premiumProcedure("meetings")
    .input(meetingsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const { agentId } = input;
      const { user } = ctx.auth;

      // 1. Fetch agent (with potential blueprint data)
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
        with: { blueprint: true }
      });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      // 2. Check for an in-progress meeting (race condition)
      const latestMeeting = await db.query.meetings.findFirst({
        where: and(eq(meetings.userId, user.id), eq(meetings.agentId, agentId)),
        orderBy: [desc(meetings.createdAt)],
      });

      if (latestMeeting?.status === "processing") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Your previous session is still being analyzed. Please wait a moment.",
        });
      }

      // 3. Determine if this is a sophisticated blueprint-based agent
      const isBlueprint = agent.blueprintSnapshot && 
        (agent.blueprintSnapshot as { sessions?: unknown[] }).sessions;
      
      if (isBlueprint) {
        // NEW SOPHISTICATED BLUEPRINT LOGIC
        const blueprintSnapshot = agent.blueprintSnapshot as { 
          sessions: Array<{
            session_id: string;
            session_name: string;
            completion_criteria: string[];
            prompt: string;
          }>;
        };

        // Get the latest meeting to check progress
        const latestMeetingWithProgress = await db.query.meetings.findFirst({
          where: and(eq(meetings.userId, user.id), eq(meetings.agentId, agentId)),
          orderBy: [desc(meetings.createdAt)],
        });

        // Determine which session to start next
        let sessionToStart = blueprintSnapshot.sessions[0]; // Default to first session
        
        if (latestMeetingWithProgress?.progress) {
          const progress = latestMeetingWithProgress.progress as Array<{
            session_id: string;
            session_status: string;
          }>;
          
          // Find first session that's not completed
          const nextSession = progress.find(p => p.session_status !== "completed");
          if (nextSession) {
            sessionToStart = blueprintSnapshot.sessions.find(s => s.session_id === nextSession.session_id) || sessionToStart;
          }
        }

        // Create the meeting with current session prompt
        const [createdMeeting] = await db
          .insert(meetings)
          .values({
            name: input.name,
            agentId: input.agentId,
            userId: user.id,
            prompt: sessionToStart.prompt,
            progress: latestMeetingWithProgress?.progress || [],
          })
          .returning();

        // Create the Stream.io video call
        const call = streamVideo.video.call("default", createdMeeting.id);
        await call.create({
          data: {
            created_by_id: user.id,
            custom: {
              meetingId: createdMeeting.id,
              meetingName: createdMeeting.name,
            },
            settings_override: {
              transcription: { mode: "auto-on" },
            },
          },
        });

        return createdMeeting;
      } else {
        // All agents should now use the sophisticated blueprint system
        throw new TRPCError({
          code: "BAD_REQUEST", 
          message: "This agent needs to be updated to use the new blueprint system. Please recreate the agent."
        });
      }
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
    const [existingMeeting] = await db
      .select({
        ...getTableColumns(meetings),
        agent: agents,
        duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
      })
      .from(meetings)
      .innerJoin(agents, eq(meetings.agentId, agents.id))
      .where(
        and(
          eq(meetings.id, input.id),
          eq(meetings.userId, ctx.auth.user.id),
        )
      );

    if (!existingMeeting) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
    }

    return existingMeeting;
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
        search: z.string().nullish(),
        agentId: z.string().nullish(),
        status: z
          .enum([
            MeetingStatus.Upcoming,
            MeetingStatus.Active,
            MeetingStatus.Completed,
            MeetingStatus.Processing,
            MeetingStatus.Cancelled,
          ])
          .nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize, status, agentId } = input;

      const data = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined,
          )
        )
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

      const [total] = await db
        .select({ count: count() })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined,
          )
        );

      const totalPages = Math.ceil(total.count / pageSize);

      return {
        items: data,
        total: total.count,
        totalPages,
      };
    }),
  generateChatToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = streamChat.createToken(ctx.auth.user.id);
    await streamChat.upsertUser({
      id: ctx.auth.user.id,
      role: "admin",
    });

    return token;
  }),
});