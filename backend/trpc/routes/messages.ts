import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { db } from "../storage";

export const messagesRouter = createTRPCRouter({
  send: protectedProcedure
    .input(
      z.object({
        toUserId: z.string(),
        content: z.string().min(1).max(2000),
        mediaUrl: z.string().nullable().default(null),
      })
    )
    .mutation(({ ctx, input }) => {
      const id = db.generateId();
      const message = {
        id,
        fromUserId: ctx.userId,
        toUserId: input.toUserId,
        content: input.content,
        mediaUrl: input.mediaUrl,
        read: false,
        createdAt: new Date(),
      };

      db.messages.set(id, message);
      console.log("[MESSAGES] Sent:", ctx.userId, "->", input.toUserId);
      return { id };
    }),

  getConversation: protectedProcedure
    .input(
      z.object({
        withUserId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(({ ctx, input }) => {
      const conversation = Array.from(db.messages.values())
        .filter(
          (m) =>
            (m.fromUserId === ctx.userId && m.toUserId === input.withUserId) ||
            (m.fromUserId === input.withUserId && m.toUserId === ctx.userId)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      let startIndex = 0;
      if (input.cursor) {
        const cursorIndex = conversation.findIndex((m) => m.id === input.cursor);
        if (cursorIndex !== -1) startIndex = cursorIndex + 1;
      }

      const messages = conversation.slice(startIndex, startIndex + input.limit);

      messages.forEach((m) => {
        if (m.toUserId === ctx.userId && !m.read) {
          m.read = true;
          db.messages.set(m.id, m);
        }
      });

      const nextCursor =
        messages.length === input.limit ? messages[messages.length - 1]?.id : undefined;

      return { messages, nextCursor };
    }),

  getConversations: protectedProcedure.query(({ ctx }) => {
    const allMessages = Array.from(db.messages.values()).filter(
      (m) => m.fromUserId === ctx.userId || m.toUserId === ctx.userId
    );

    const conversationPartners = new Map<string, typeof allMessages[0]>();
    for (const msg of allMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
      const partnerId = msg.fromUserId === ctx.userId ? msg.toUserId : msg.fromUserId;
      if (!conversationPartners.has(partnerId)) {
        conversationPartners.set(partnerId, msg);
      }
    }

    const conversations = Array.from(conversationPartners.entries()).map(([partnerId, lastMsg]) => {
      const partner = db.users.get(partnerId);
      const unreadCount = allMessages.filter(
        (m) => m.fromUserId === partnerId && m.toUserId === ctx.userId && !m.read
      ).length;

      return {
        partnerId,
        partner: partner
          ? {
              id: partner.id,
              username: partner.username,
              displayName: partner.displayName,
              avatarUrl: partner.avatarUrl,
            }
          : null,
        lastMessage: {
          id: lastMsg.id,
          content: lastMsg.content,
          fromMe: lastMsg.fromUserId === ctx.userId,
          createdAt: lastMsg.createdAt,
        },
        unreadCount,
      };
    });

    return conversations;
  }),

  markRead: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(({ ctx, input }) => {
      const msg = db.messages.get(input.messageId);
      if (!msg || msg.toUserId !== ctx.userId) return { success: false };

      msg.read = true;
      db.messages.set(input.messageId, msg);
      return { success: true };
    }),
});
