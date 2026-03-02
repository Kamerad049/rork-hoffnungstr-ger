import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { db } from "../storage";

const STAMP_EP = 50;
const GPS_TOLERANCE_METERS = 500;

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const stampsRouter = createTRPCRouter({
  checkin: protectedProcedure
    .input(
      z.object({
        placeId: z.string(),
        placeName: z.string(),
        photoUrl: z.string(),
        userLatitude: z.number(),
        userLongitude: z.number(),
        placeLatitude: z.number(),
        placeLongitude: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      const distance = haversineDistance(
        input.userLatitude,
        input.userLongitude,
        input.placeLatitude,
        input.placeLongitude
      );

      if (distance > GPS_TOLERANCE_METERS) {
        console.log("[STAMPS] GPS check failed:", distance, "m away");
        throw new Error(
          `Du bist ${Math.round(distance)}m entfernt. Du musst vor Ort sein (max ${GPS_TOLERANCE_METERS}m).`
        );
      }

      const existingStamp = Array.from(db.stamps.values()).find(
        (s) => s.userId === ctx.userId && s.placeId === input.placeId
      );

      if (existingStamp) {
        throw new Error("Du hast diesen Ort bereits gestempelt");
      }

      const id = db.generateId();
      const stamp = {
        id,
        userId: ctx.userId,
        placeId: input.placeId,
        placeName: input.placeName,
        photoUrl: input.photoUrl,
        latitude: input.userLatitude,
        longitude: input.userLongitude,
        verifiedAt: new Date(),
        epEarned: STAMP_EP,
      };

      db.stamps.set(id, stamp);

      const user = db.users.get(ctx.userId);
      if (user) {
        user.ep += STAMP_EP;
        user.rank = db.getRankForEp(user.ep);
        db.users.set(ctx.userId, user);
        console.log("[STAMPS] Checkin:", ctx.userId, "at", input.placeName, "| EP:", user.ep, "| Rank:", user.rank);
      }

      return {
        id,
        epEarned: STAMP_EP,
        newRank: user?.rank ?? "Sucher",
        totalEp: user?.ep ?? 0,
      };
    }),

  getUserStamps: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const userStamps = Array.from(db.stamps.values())
        .filter((s) => s.userId === input.userId)
        .sort((a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime());

      return userStamps;
    }),

  getLeaderboard: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(25) }))
    .query(({ input }) => {
      const rankedUsers = Array.from(db.users.values())
        .sort((a, b) => b.ep - a.ep)
        .slice(0, input.limit)
        .map((u, index) => ({
          position: index + 1,
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          rank: u.rank,
          ep: u.ep,
          stampCount: Array.from(db.stamps.values()).filter((s) => s.userId === u.id).length,
        }));

      return rankedUsers;
    }),

  getRanks: publicProcedure.query(() => {
    return db.RANKS;
  }),
});
