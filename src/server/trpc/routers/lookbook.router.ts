import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import * as schema from '@/../drizzle/schema';
import {
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc/init';

export const lookbookRouter = createTRPCRouter({
  /**
   * List all published lookbooks.
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const lookbooks = await ctx.db
      .select()
      .from(schema.lookbooks)
      .where(eq(schema.lookbooks.isPublished, true))
      .orderBy(asc(schema.lookbooks.sortOrder));
    return lookbooks;
  }),

  /**
   * Get a single lookbook by slug with its images.
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [lookbook] = await ctx.db
        .select()
        .from(schema.lookbooks)
        .where(
          and(
            eq(schema.lookbooks.slug, input.slug),
            eq(schema.lookbooks.isPublished, true)
          )
        )
        .limit(1);

      if (!lookbook) {
        return null;
      }

      const images = await ctx.db
        .select()
        .from(schema.lookbookImages)
        .where(eq(schema.lookbookImages.lookbookId, lookbook.id))
        .orderBy(asc(schema.lookbookImages.sortOrder));

      return {
        ...lookbook,
        images,
      };
    }),
});
