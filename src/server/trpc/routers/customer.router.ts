import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import * as schema from '@/../drizzle/schema';
import {
  createTRPCRouter,
  protectedProcedure,
} from '@/server/trpc/init';
import { updateProfileSchema } from '@/schemas/customer.schema';
import {
  createAddressSchema,
  updateAddressSchema,
  deleteAddressSchema,
} from '@/schemas/address.schema';

export const customerRouter = createTRPCRouter({
  /**
   * Get the current user's profile.
   */
  profile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [user] = await ctx.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Usuario no encontrado',
      });
    }

    return user;
  }),

  /**
   * Update current user's profile.
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [updated] = await ctx.db
        .update(schema.users)
        .set({
          name: input.name ?? undefined,
          phone: input.phone ?? undefined,
          cedula: input.documentId ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      return updated;
    }),

  /**
   * Get all addresses for the current user.
   */
  addresses: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const addresses = await ctx.db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.customerId, userId));

    return addresses;
  }),

  /**
   * Create a new address.
   */
  createAddress: protectedProcedure
    .input(createAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // If this is set as default, un-default all others
      if (input.isDefault) {
        await ctx.db
          .update(schema.addresses)
          .set({ isDefault: false })
          .where(eq(schema.addresses.customerId, userId));
      }

      const [address] = await ctx.db
        .insert(schema.addresses)
        .values({
          customerId: userId,
          label: input.label,
          state: input.state,
          city: input.city,
          addressLine: input.streetAddress,
          reference: input.additionalInfo ?? null,
          isDefault: input.isDefault,
        })
        .returning();

      return address;
    }),

  /**
   * Update an existing address.
   */
  updateAddress: protectedProcedure
    .input(updateAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const [existing] = await ctx.db
        .select()
        .from(schema.addresses)
        .where(
          and(
            eq(schema.addresses.id, input.id),
            eq(schema.addresses.customerId, userId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Dirección no encontrada',
        });
      }

      // If setting as default, un-default all others
      if (input.isDefault) {
        await ctx.db
          .update(schema.addresses)
          .set({ isDefault: false })
          .where(eq(schema.addresses.customerId, userId));
      }

      const [updated] = await ctx.db
        .update(schema.addresses)
        .set({
          label: input.label ?? undefined,
          state: input.state ?? undefined,
          city: input.city ?? undefined,
          addressLine: input.streetAddress ?? undefined,
          reference: input.additionalInfo ?? undefined,
          isDefault: input.isDefault ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(schema.addresses.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete an address.
   */
  deleteAddress: protectedProcedure
    .input(deleteAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [existing] = await ctx.db
        .select()
        .from(schema.addresses)
        .where(
          and(
            eq(schema.addresses.id, input.id),
            eq(schema.addresses.customerId, userId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Dirección no encontrada',
        });
      }

      await ctx.db
        .delete(schema.addresses)
        .where(eq(schema.addresses.id, input.id));

      return { success: true };
    }),
});
