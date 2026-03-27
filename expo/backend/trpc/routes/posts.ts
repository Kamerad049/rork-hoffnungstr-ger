import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { db } from "../storage";

export const postsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().max(2000),
        mediaUrls: z.array(z.string()).max(10).default([]),
        mediaType: z.enum(["image", "video", "none"]).default("none"),
      })
    )
    .mutation(({ ctx, input }) => {
      const id = db.generateId();
      const post = {
        id,
        userId: ctx.userId,
        content: input.content,
        mediaUrls: input.mediaUrls,
        mediaType: input.mediaType,
        likes: [] as string[],
        createdAt: new Date(),
      };

      db.posts.set(id, post);

      const user = db.users.get(ctx.userId);
      if (user) {
        user.ep += 10;
        user.rank = db.getRankForEp(user.ep);
        db.users.set(ctx.userId, user);
      }

      console.log("[POSTS] Created:", id, "by", ctx.userId);
      return { id, epEarned: 10 };
    }),

  getFeed: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(({ input }) => {
      const allPosts = Array.from(db.posts.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      let startIndex = 0;
      if (input.cursor) {
        const cursorIndex = allPosts.findIndex((p) => p.id === input.cursor);
        if (cursorIndex !== -1) startIndex = cursorIndex + 1;
      }

      const posts = allPosts.slice(startIndex, startIndex + input.limit);

      const enriched = posts.map((post) => {
        const author = db.users.get(post.userId);
        const commentCount = Array.from(db.comments.values()).filter(
          (c) => c.postId === post.id
        ).length;

        return {
          ...post,
          author: author
            ? {
                id: author.id,
                username: author.username,
                displayName: author.displayName,
                avatarUrl: author.avatarUrl,
                rank: author.rank,
              }
            : null,
          likeCount: post.likes.length,
          commentCount,
        };
      });

      const nextCursor = posts.length === input.limit ? posts[posts.length - 1]?.id : undefined;

      return {
        posts: enriched,
        nextCursor,
      };
    }),

  getUserPosts: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(({ input }) => {
      const userPosts = Array.from(db.posts.values())
        .filter((p) => p.userId === input.userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      let startIndex = 0;
      if (input.cursor) {
        const cursorIndex = userPosts.findIndex((p) => p.id === input.cursor);
        if (cursorIndex !== -1) startIndex = cursorIndex + 1;
      }

      const posts = userPosts.slice(startIndex, startIndex + input.limit);

      const enriched = posts.map((post) => {
        const author = db.users.get(post.userId);
        const commentCount = Array.from(db.comments.values()).filter(
          (c) => c.postId === post.id
        ).length;

        return {
          ...post,
          author: author
            ? {
                id: author.id,
                username: author.username,
                displayName: author.displayName,
                avatarUrl: author.avatarUrl,
                rank: author.rank,
              }
            : null,
          likeCount: post.likes.length,
          commentCount,
        };
      });

      const nextCursor = posts.length === input.limit ? posts[posts.length - 1]?.id : undefined;

      return { posts: enriched, nextCursor };
    }),

  like: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(({ ctx, input }) => {
      const post = db.posts.get(input.postId);
      if (!post) throw new Error("Post nicht gefunden");

      const index = post.likes.indexOf(ctx.userId);
      if (index === -1) {
        post.likes.push(ctx.userId);
      } else {
        post.likes.splice(index, 1);
      }

      db.posts.set(input.postId, post);
      console.log("[POSTS] Like toggled:", input.postId, "by", ctx.userId);
      return { liked: index === -1, likeCount: post.likes.length };
    }),

  delete: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(({ ctx, input }) => {
      const post = db.posts.get(input.postId);
      if (!post) throw new Error("Post nicht gefunden");
      if (post.userId !== ctx.userId) throw new Error("Nicht berechtigt");

      db.posts.delete(input.postId);

      Array.from(db.comments.entries()).forEach(([id, comment]) => {
        if (comment.postId === input.postId) db.comments.delete(id);
      });

      console.log("[POSTS] Deleted:", input.postId);
      return { success: true };
    }),

  getComments: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(({ input }) => {
      const postComments = Array.from(db.comments.values())
        .filter((c) => c.postId === input.postId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return postComments.map((comment) => {
        const author = db.users.get(comment.userId);
        return {
          ...comment,
          author: author
            ? {
                id: author.id,
                username: author.username,
                displayName: author.displayName,
                avatarUrl: author.avatarUrl,
              }
            : null,
          likeCount: comment.likes.length,
        };
      });
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1).max(1000),
      })
    )
    .mutation(({ ctx, input }) => {
      const post = db.posts.get(input.postId);
      if (!post) throw new Error("Post nicht gefunden");

      const id = db.generateId();
      const comment = {
        id,
        postId: input.postId,
        userId: ctx.userId,
        content: input.content,
        likes: [] as string[],
        createdAt: new Date(),
      };

      db.comments.set(id, comment);

      const user = db.users.get(ctx.userId);
      if (user) {
        user.ep += 2;
        user.rank = db.getRankForEp(user.ep);
        db.users.set(ctx.userId, user);
      }

      console.log("[POSTS] Comment added:", id, "on", input.postId);
      return { id, epEarned: 2 };
    }),
});
