import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { db } from "../storage";

export const storiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        mediaUrl: z.string(),
        mediaType: z.enum(["image", "video"]).default("image"),
        caption: z.string().max(500).default(""),
      })
    )
    .mutation(({ ctx, input }) => {
      const id = db.generateId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const story = {
        id,
        userId: ctx.userId,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        caption: input.caption,
        viewers: [] as string[],
        createdAt: now,
        expiresAt,
      };

      db.stories.set(id, story);

      const user = db.users.get(ctx.userId);
      if (user) {
        user.xp += 5;
        user.rank = db.getRankForXp(user.xp);
        db.users.set(ctx.userId, user);
      }

      console.log("[STORIES] Created:", id, "by", ctx.userId);
      return { id, xpEarned: 5 };
    }),

  getFeed: publicProcedure.query(() => {
    const now = new Date();

    const activeStories = Array.from(db.stories.values()).filter(
      (s) => s.expiresAt > now
    );

    const groupedByUser = new Map<string, typeof activeStories>();
    for (const story of activeStories) {
      const existing = groupedByUser.get(story.userId) ?? [];
      existing.push(story);
      groupedByUser.set(story.userId, existing);
    }

    const storyFeed = Array.from(groupedByUser.entries()).map(([userId, userStories]) => {
      const user = db.users.get(userId);
      return {
        user: user
          ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            }
          : null,
        stories: userStories
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((s) => ({
            id: s.id,
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType,
            caption: s.caption,
            viewerCount: s.viewers.length,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
          })),
      };
    });

    return storyFeed;
  }),

  view: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(({ ctx, input }) => {
      const story = db.stories.get(input.storyId);
      if (!story) throw new Error("Story nicht gefunden");

      if (!story.viewers.includes(ctx.userId)) {
        story.viewers.push(ctx.userId);
        db.stories.set(input.storyId, story);
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(({ ctx, input }) => {
      const story = db.stories.get(input.storyId);
      if (!story) throw new Error("Story nicht gefunden");
      if (story.userId !== ctx.userId) throw new Error("Nicht berechtigt");

      db.stories.delete(input.storyId);
      console.log("[STORIES] Deleted:", input.storyId);
      return { success: true };
    }),
});
