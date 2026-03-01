import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { db } from "../storage";

export const usersRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20),
        email: z.string().email(),
        password: z.string().min(6),
        displayName: z.string().min(1).max(50),
      })
    )
    .mutation(({ input }) => {
      const existing = Array.from(db.users.values()).find(
        (u) => u.email === input.email || u.username === input.username
      );
      if (existing) {
        throw new Error("Benutzername oder E-Mail bereits vergeben");
      }

      const id = db.generateId();
      const user = {
        id,
        username: input.username,
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        bio: "",
        avatarUrl: null,
        coverUrl: null,
        isSingle: false,
        rank: "Sucher",
        xp: 0,
        isPremium: false,
        createdAt: new Date(),
      };

      db.users.set(id, user);
      console.log("[USERS] Registered user:", id, input.username);

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        token: user.id,
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(({ input }) => {
      const user = Array.from(db.users.values()).find(
        (u) => u.email === input.email && u.password === input.password
      );
      if (!user) {
        throw new Error("Ungültige Anmeldedaten");
      }

      console.log("[USERS] Login:", user.id, user.username);
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        token: user.id,
      };
    }),

  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const user = db.users.get(input.userId);
      if (!user) throw new Error("Benutzer nicht gefunden");

      const friendCount = Array.from(db.friendRequests.values()).filter(
        (fr) =>
          fr.status === "accepted" &&
          (fr.fromUserId === input.userId || fr.toUserId === input.userId)
      ).length;

      const postCount = Array.from(db.posts.values()).filter(
        (p) => p.userId === input.userId
      ).length;

      const stampCount = Array.from(db.stamps.values()).filter(
        (s) => s.userId === input.userId
      ).length;

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        isSingle: user.isSingle,
        rank: user.rank,
        xp: user.xp,
        isPremium: user.isPremium,
        friendCount,
        postCount,
        stampCount,
        createdAt: user.createdAt,
      };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().nullable().optional(),
        coverUrl: z.string().nullable().optional(),
        isSingle: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const user = db.users.get(ctx.userId);
      if (!user) throw new Error("Benutzer nicht gefunden");

      if (input.displayName !== undefined) user.displayName = input.displayName;
      if (input.bio !== undefined) user.bio = input.bio;
      if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
      if (input.coverUrl !== undefined) user.coverUrl = input.coverUrl;
      if (input.isSingle !== undefined) user.isSingle = input.isSingle;

      db.users.set(ctx.userId, user);
      console.log("[USERS] Profile updated:", ctx.userId);

      return { success: true };
    }),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(({ input }) => {
      const q = input.query.toLowerCase();
      const results = Array.from(db.users.values())
        .filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            u.displayName.toLowerCase().includes(q)
        )
        .slice(0, 20)
        .map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          rank: u.rank,
          xp: u.xp,
        }));

      return results;
    }),

  sendFriendRequest: protectedProcedure
    .input(z.object({ toUserId: z.string() }))
    .mutation(({ ctx, input }) => {
      if (ctx.userId === input.toUserId) {
        throw new Error("Du kannst dir nicht selbst eine Anfrage senden");
      }

      const existing = Array.from(db.friendRequests.values()).find(
        (fr) =>
          (fr.fromUserId === ctx.userId && fr.toUserId === input.toUserId) ||
          (fr.fromUserId === input.toUserId && fr.toUserId === ctx.userId)
      );

      if (existing) {
        throw new Error("Freundschaftsanfrage existiert bereits");
      }

      const id = db.generateId();
      db.friendRequests.set(id, {
        id,
        fromUserId: ctx.userId,
        toUserId: input.toUserId,
        status: "pending",
        createdAt: new Date(),
      });

      console.log("[FRIENDS] Request sent:", ctx.userId, "->", input.toUserId);
      return { success: true, requestId: id };
    }),

  respondFriendRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
        accept: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const request = db.friendRequests.get(input.requestId);
      if (!request || request.toUserId !== ctx.userId) {
        throw new Error("Anfrage nicht gefunden");
      }

      request.status = input.accept ? "accepted" : "rejected";
      db.friendRequests.set(input.requestId, request);

      console.log("[FRIENDS] Request", input.accept ? "accepted" : "rejected", input.requestId);
      return { success: true };
    }),

  getFriendRequests: protectedProcedure.query(({ ctx }) => {
    const pending = Array.from(db.friendRequests.values())
      .filter((fr) => fr.toUserId === ctx.userId && fr.status === "pending")
      .map((fr) => {
        const fromUser = db.users.get(fr.fromUserId);
        return {
          id: fr.id,
          fromUser: fromUser
            ? {
                id: fromUser.id,
                username: fromUser.username,
                displayName: fromUser.displayName,
                avatarUrl: fromUser.avatarUrl,
              }
            : null,
          createdAt: fr.createdAt,
        };
      });

    return pending;
  }),

  getFriends: protectedProcedure.query(({ ctx }) => {
    const accepted = Array.from(db.friendRequests.values()).filter(
      (fr) =>
        fr.status === "accepted" &&
        (fr.fromUserId === ctx.userId || fr.toUserId === ctx.userId)
    );

    const friendIds = accepted.map((fr) =>
      fr.fromUserId === ctx.userId ? fr.toUserId : fr.fromUserId
    );

    return friendIds
      .map((id) => {
        const u = db.users.get(id);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          rank: u.rank,
          xp: u.xp,
          isSingle: u.isSingle,
        };
      })
      .filter(Boolean);
  }),
});
