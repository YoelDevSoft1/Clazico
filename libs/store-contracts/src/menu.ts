import { z } from 'zod';
import { ProductSchema, ProductVariantSchema } from './products';
import { WebOrderItemSchema, WebOrderCustomerSchema, WebOrderDeliverySchema, WebOrderPaymentSchema } from './web-orders';

/**
 * Menú público (restaurante): reutiliza WebOrder con kind='menu_item'.
 * Items tienen menu_item_id en vez de product_id.
 * MenuItem es esencialmente un Product con flag is_recipe.
 */

export const MenuItemSchema = ProductSchema.extend({
  is_recipe: z.boolean().default(false),
  preparation_minutes: z.number().int().nonnegative().optional(),
  allergens: z.array(z.string()).default([]),
  calories: z.number().int().nonnegative().optional(),
  modifiers: z.array(z.string()).default([]),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuItemVariantSchema = ProductVariantSchema.extend({
  preparation_minutes_override: z.number().int().nonnegative().optional(),
});
export type MenuItemVariant = z.infer<typeof MenuItemVariantSchema>;

/**
 * Endpoint público de menú: response shape.
 */
export const GetPublicMenuResponseSchema = z.object({
  store_id: z.string().uuid(),
  catalog_enabled: z.boolean(),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sort_order: z.number().int().default(0),
    })
  ),
  items: z.array(MenuItemSchema),
  exchange_rate: z.object({
    rate: z.number().positive(),
    source: z.string(),
    effective_date: z.string().datetime(),
  }),
  cached_until: z.string().datetime().optional(),
});
export type GetPublicMenuResponse = z.infer<typeof GetPublicMenuResponseSchema>;

/**
 * Crear orden de menú (puede ser de mesa con QR o de delivery).
 */
export const CreateMenuOrderDtoSchema = z.object({
  kind: z.literal('menu_item'),
  store_id: z.string().uuid(),
  source: z.string().default('clazico'),
  external_order_id: z.string(),
  table_qr_code: z.string().optional(),  // Si viene de mesa
  customer: WebOrderCustomerSchema,
  items: z.array(WebOrderItemSchema).min(1),
  delivery: WebOrderDeliverySchema.optional(),  // Si no es mesa
  payment: WebOrderPaymentSchema.optional(),
  notes: z.string().max(500).optional(),
});
export type CreateMenuOrderDto = z.infer<typeof CreateMenuOrderDtoSchema>;
