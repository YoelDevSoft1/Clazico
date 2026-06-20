import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '@/server/db';
import * as schema from '@/../drizzle/schema';
import {
  DEFAULT_LOOKBOOKS,
  getDefaultLookbookBySlug,
  type DefaultLookbookDefinition,
} from '@/lib/lookbook-definitions';

const FALLBACK_RATE_BS_PER_USD = 36.715;
const FALLBACK_ITEMS_PER_LOOKBOOK = 4;

type ProductRow = typeof schema.productCache.$inferSelect;
type VariantRow = typeof schema.productVariants.$inferSelect;
type LookbookItemRow = typeof schema.lookbookItems.$inferSelect;

export type StorefrontLookbookRecipeItem = {
  id: string;
  source: 'database' | 'fallback';
  role: string;
  label: string | null;
  isRequired: boolean;
  minQuantity: number;
  maxQuantity: number;
  productCacheId: string;
  productId: string;
  productSlug: string;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  variantId: string | null;
  variantSku: string | null;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  priceUsd: number;
  priceBs: number;
  currentStock: number;
};

export type StorefrontLookbookRecipe = DefaultLookbookDefinition & {
  databaseId: string | null;
  source: 'database' | 'fallback';
  recipeItems: StorefrontLookbookRecipeItem[];
  isSellable: boolean;
};

export type LookbookSaleRule = {
  id: string | null;
  source: 'database' | 'fallback';
  productCacheId: string;
  productId: string;
  variantId: string | null;
  role: string;
  isRequired: boolean;
  minQuantity: number;
  maxQuantity: number;
  productName: string;
};

export type LookbookSaleRecipe = {
  lookbookId: string | null;
  slug: string;
  title: string;
  source: 'database' | 'fallback';
  rules: LookbookSaleRule[];
};

export async function listStorefrontLookbooks(
  db: Database,
): Promise<StorefrontLookbookRecipe[]> {
  const lookbooks = await db
    .select()
    .from(schema.lookbooks)
    .where(eq(schema.lookbooks.isPublished, true))
    .orderBy(asc(schema.lookbooks.sortOrder));

  if (lookbooks.length === 0) {
    return buildFallbackLookbooks(db);
  }

  const itemsByLookbook = await fetchItemsByLookbook(db, lookbooks.map((item) => item.id));

  return lookbooks.map((lookbook, index) => {
    const fallback = DEFAULT_LOOKBOOKS[index % DEFAULT_LOOKBOOKS.length]!;
    const recipeItems = itemsByLookbook.get(lookbook.id) ?? [];

    return {
      ...fallback,
      id: lookbook.id,
      databaseId: lookbook.id,
      source: 'database',
      title: lookbook.title,
      slug: lookbook.slug,
      season: lookbook.season || fallback.season,
      description: lookbook.description || fallback.description,
      recipeItems,
      isSellable: recipeItems.length > 0 && recipeItems.every((item) => item.currentStock > 0),
    };
  });
}

export async function resolveLookbookSaleRecipe(
  db: Database,
  slug: string,
): Promise<LookbookSaleRecipe | null> {
  const [lookbook] = await db
    .select()
    .from(schema.lookbooks)
    .where(and(eq(schema.lookbooks.slug, slug), eq(schema.lookbooks.isPublished, true)))
    .limit(1);

  if (lookbook) {
    const itemsByLookbook = await fetchItemsByLookbook(db, [lookbook.id]);
    const recipeItems = itemsByLookbook.get(lookbook.id) ?? [];

    if (recipeItems.length === 0) {
      return null;
    }

    return {
      lookbookId: lookbook.id,
      slug: lookbook.slug,
      title: lookbook.title,
      source: 'database',
      rules: recipeItems.map(toSaleRule),
    };
  }

  const fallback = getDefaultLookbookBySlug(slug);
  if (!fallback) return null;

  const fallbackLookbooks = await buildFallbackLookbooks(db);
  const fallbackRecipe = fallbackLookbooks.find((item) => item.slug === slug);
  if (!fallbackRecipe || fallbackRecipe.recipeItems.length === 0) {
    return null;
  }

  return {
    lookbookId: null,
    slug: fallback.slug,
    title: fallback.title,
    source: 'fallback',
    rules: fallbackRecipe.recipeItems.map(toSaleRule),
  };
}

async function fetchItemsByLookbook(
  db: Database,
  lookbookIds: string[],
): Promise<Map<string, StorefrontLookbookRecipeItem[]>> {
  const byLookbook = new Map<string, StorefrontLookbookRecipeItem[]>();
  if (lookbookIds.length === 0) return byLookbook;

  const rows = await db
    .select({
      item: schema.lookbookItems,
      product: schema.productCache,
      variant: schema.productVariants,
    })
    .from(schema.lookbookItems)
    .innerJoin(
      schema.productCache,
      eq(schema.lookbookItems.productCacheId, schema.productCache.id),
    )
    .leftJoin(
      schema.productVariants,
      eq(schema.lookbookItems.variantId, schema.productVariants.id),
    )
    .where(
      and(
        inArray(schema.lookbookItems.lookbookId, lookbookIds),
        eq(schema.productCache.isActive, true),
      ),
    )
    .orderBy(asc(schema.lookbookItems.sortOrder));

  for (const row of rows) {
    const items = byLookbook.get(row.item.lookbookId) ?? [];
    items.push(toStorefrontRecipeItem(row.item, row.product, row.variant, 'database'));
    byLookbook.set(row.item.lookbookId, items);
  }

  return byLookbook;
}

async function buildFallbackLookbooks(db: Database): Promise<StorefrontLookbookRecipe[]> {
  const products = await db
    .select()
    .from(schema.productCache)
    .where(and(eq(schema.productCache.isActive, true), sql`${schema.productCache.currentStock} > 0`))
    .orderBy(desc(schema.productCache.currentStock), desc(schema.productCache.createdAt))
    .limit(DEFAULT_LOOKBOOKS.length * FALLBACK_ITEMS_PER_LOOKBOOK);

  return DEFAULT_LOOKBOOKS.map((lookbook, lookbookIndex) => {
    const recipeItems = pickFallbackProducts(products, lookbookIndex).map((product, index) =>
      toFallbackRecipeItem(lookbook, product, index),
    );

    return {
      ...lookbook,
      databaseId: null,
      source: 'fallback',
      recipeItems,
      isSellable: recipeItems.length > 0 && recipeItems.every((item) => item.currentStock > 0),
    };
  });
}

function pickFallbackProducts(products: ProductRow[], lookbookIndex: number): ProductRow[] {
  if (products.length === 0) return [];

  const count = Math.min(FALLBACK_ITEMS_PER_LOOKBOOK, products.length);
  return Array.from({ length: count }, (_, offset) => {
    const productIndex = (lookbookIndex * FALLBACK_ITEMS_PER_LOOKBOOK + offset) % products.length;
    return products[productIndex]!;
  });
}

function toStorefrontRecipeItem(
  item: LookbookItemRow,
  product: ProductRow,
  variant: VariantRow | null,
  source: 'database',
): StorefrontLookbookRecipeItem {
  const priceUsd = Number(variant?.priceUsdOverride ?? product.priceUsd);
  const priceBs = Number(
    variant?.priceBsOverride ?? product.priceBs ?? priceUsd * FALLBACK_RATE_BS_PER_USD,
  );

  return {
    id: item.id,
    source,
    role: item.role,
    label: item.label,
    isRequired: item.isRequired,
    minQuantity: item.minQuantity,
    maxQuantity: item.maxQuantity,
    productCacheId: product.id,
    productId: product.veloxId,
    productSlug: product.slug,
    productName: product.name,
    productSku: product.sku,
    productImageUrl: product.imageUrl,
    variantId: variant?.veloxVariantId ?? null,
    variantSku: variant?.sku ?? null,
    size: variant?.size ?? null,
    color: variant?.color ?? null,
    colorHex: variant?.colorHex ?? null,
    imageUrl: variant?.imageUrl ?? product.imageUrl,
    priceUsd,
    priceBs,
    currentStock: variant?.currentStock ?? product.currentStock,
  };
}

function toFallbackRecipeItem(
  lookbook: DefaultLookbookDefinition,
  product: ProductRow,
  index: number,
): StorefrontLookbookRecipeItem {
  const priceUsd = Number(product.priceUsd);
  const roles = ['sneaker', 'top', 'bottom', 'accessory'];

  return {
    id: `fallback:${lookbook.slug}:${product.veloxId}`,
    source: 'fallback',
    role: roles[index] ?? 'piece',
    label: null,
    isRequired: true,
    minQuantity: 1,
    maxQuantity: Math.max(1, product.currentStock),
    productCacheId: product.id,
    productId: product.veloxId,
    productSlug: product.slug,
    productName: product.name,
    productSku: product.sku,
    productImageUrl: product.imageUrl,
    variantId: null,
    variantSku: null,
    size: null,
    color: null,
    colorHex: null,
    imageUrl: product.imageUrl ?? lookbook.image,
    priceUsd,
    priceBs: Number(product.priceBs ?? priceUsd * FALLBACK_RATE_BS_PER_USD),
    currentStock: product.currentStock,
  };
}

function toSaleRule(item: StorefrontLookbookRecipeItem): LookbookSaleRule {
  return {
    id: item.source === 'database' ? item.id : null,
    source: item.source,
    productCacheId: item.productCacheId,
    productId: item.productId,
    variantId: item.variantId,
    role: item.role,
    isRequired: item.isRequired,
    minQuantity: item.minQuantity,
    maxQuantity: item.maxQuantity,
    productName: item.productName,
  };
}
