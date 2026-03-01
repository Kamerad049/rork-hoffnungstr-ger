import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { db } from "../storage";

const mediaStore = new Map<string, { id: string; userId: string; base64: string; mimeType: string; createdAt: Date }>();

export const mediaRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(
      z.object({
        base64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        fileName: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const sizeBytes = Math.ceil((input.base64.length * 3) / 4);
      const maxSize = 10 * 1024 * 1024;

      if (sizeBytes > maxSize) {
        throw new Error("Datei zu groß (max 10MB)");
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ];

      if (!allowedTypes.includes(input.mimeType)) {
        throw new Error("Dateityp nicht unterstützt");
      }

      const id = db.generateId();
      mediaStore.set(id, {
        id,
        userId: ctx.userId,
        base64: input.base64,
        mimeType: input.mimeType,
        createdAt: new Date(),
      });

      const isVideo = input.mimeType.startsWith("video/");
      console.log("[MEDIA] Uploaded:", id, isVideo ? "video" : "image", `${Math.round(sizeBytes / 1024)}KB`);

      return {
        id,
        url: `media://${id}`,
        type: isVideo ? ("video" as const) : ("image" as const),
        size: sizeBytes,
      };
    }),

  get: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .query(({ input }) => {
      const media = mediaStore.get(input.mediaId);
      if (!media) throw new Error("Medien nicht gefunden");

      return {
        id: media.id,
        base64: media.base64,
        mimeType: media.mimeType,
        createdAt: media.createdAt,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .mutation(({ ctx, input }) => {
      const media = mediaStore.get(input.mediaId);
      if (!media) throw new Error("Medien nicht gefunden");
      if (media.userId !== ctx.userId) throw new Error("Nicht berechtigt");

      mediaStore.delete(input.mediaId);
      console.log("[MEDIA] Deleted:", input.mediaId);
      return { success: true };
    }),
});
