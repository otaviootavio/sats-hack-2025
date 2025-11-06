import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const presetRouter = createTRPCRouter({
  getSelected: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { selectedPreset: true },
    });
    return user?.selectedPreset ?? null;
  }),

  setSelected: protectedProcedure
    .input(z.object({ value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.db.user.update({
        where: { id: userId },
        data: { selectedPreset: input.value },
      });
      return { ok: true } as const;
    }),
});


