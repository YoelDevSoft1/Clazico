import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import * as schema from '@/../drizzle/schema';
import {
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc/init';
import { listStorefrontLookbooks } from '@/server/services/lookbook-recipe.service';

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
   * List published lookbooks with sellable recipe items resolved from Velox
   * product cache. Falls back to the editorial drops when no DB lookbooks
   * exist yet, so the public storefront remains usable.
   */
  listForStorefront: publicProcedure.query(async ({ ctx }) => {
    return listStorefrontLookbooks(ctx.db);
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
