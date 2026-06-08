import { z } from 'zod';

/**
 * Product + ProductVariant + ProductImage — single source of truth
 * para el shape canónico de catálogo en la integración storefront.
 *
 * Velox persiste estas entidades en PostgreSQL con TypeORM.
 * clazico las mirror-ea en Drizzle (clazico-store productCache +
 * product_variants + product_images).
 */

export const ColorHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'color_hex must be a 6-digit hex color (e.g. #FF0000)');

export const ProductVariantSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  sku: z.string().nullable(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  color_hex: ColorHexSchema.nullable(),
  image_url: z.string().url().nullable(),
  additional_images: z.array(z.string().url()).default([]),
  price_usd_override: z.number().positive().nullable(),
  price_bs_override: z.number().positive().nullable(),
  current_stock: z.number().int().min(0),
  is_active: z.boolean(),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductImageSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url(),
  alt: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_primary: z.boolean().default(false),
});
export type ProductImage = z.infer<typeof ProductImageSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  description: z.string().nullable(),
  brand: z.string().nullable(),
  category: z.string().nullable(),
  slug: z.string().min(1).max(200),
  price_usd: z.number().nonnegative(),
  price_bs: z.number().nonnegative(),
  image_url: z.string().url().nullable(),
  images: z.array(ProductImageSchema).default([]),
  variants: z.array(ProductVariantSchema).default([]),
  is_active: z.boolean(),
  is_featured: z.boolean().default(false),
  is_visible_public: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
  synced_at: z.string().datetime(),
});
export type Product = z.infer<typeof ProductSchema>;

/**
 * Stock update payload — emitido por Velox cuando cambia el stock.
 * Variant es opcional para compatibilidad con productos sin variants.
 */
export const StockUpdatedPayloadSchema = z.object({
  type: z.literal('stock.updated'),
  data: z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().nullable(),
    warehouse_id: z.string().uuid(),
    previous_stock: z.number().int(),
    new_stock: z.number().int(),
    delta: z.number().int(),
    reason: z.enum(['sale', 'adjustment', 'transfer', 'web_order', 'return', 'recipe_consumption']),
    occurred_at: z.string().datetime(),
  }),
});
export type StockUpdatedPayload = z.infer<typeof StockUpdatedPayloadSchema>;

export const ProductUpdatedPayloadSchema = z.object({
  type: z.literal('product.updated'),
  data: z.object({
    product_id: z.string().uuid(),
    name: z.string().optional(),
    price_usd: z.number().nonnegative().nullable().optional(),
    price_bs: z.number().nonnegative().nullable().optional(),
    is_active: z.boolean().optional(),
    changed_fields: z.array(z.string()),
    occurred_at: z.string().datetime(),
  }),
});
export type ProductUpdatedPayload = z.infer<typeof ProductUpdatedPayloadSchema>;

export const ProductVariantUpdatedPayloadSchema = z.object({
  type: z.literal('product.variant_updated'),
  data: z.object({
    variant_id: z.string().uuid(),
    product_id: z.string().uuid(),
    changes: z.object({
      sku: z.string().nullable().optional(),
      size: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
      color_hex: ColorHexSchema.nullable().optional(),
      image_url: z.string().url().nullable().optional(),
      price_usd_override: z.number().positive().nullable().optional(),
      price_bs_override: z.number().positive().nullable().optional(),
      is_active: z.boolean().optional(),
    }),
    occurred_at: z.string().datetime(),
  }),
});
export type ProductVariantUpdatedPayload = z.infer<typeof ProductVariantUpdatedPayloadSchema>;
