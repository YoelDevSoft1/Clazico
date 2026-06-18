import 'server-only';
import { db } from '@/server/db';
import * as schema from '@/../drizzle/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { veloxPosService, type VeloxProduct, type VeloxProductVariant } from './velox-pos.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: string[];
  variantsSynced: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class ProductSyncService {
  private static instance: ProductSyncService | null = null;

  private constructor() { }

  static getInstance(): ProductSyncService {
    if (!ProductSyncService.instance) {
      ProductSyncService.instance = new ProductSyncService();
    }
    return ProductSyncService.instance;
  }

  /**
   * Full sync: fetch all products from Velox POS and upsert into local
   * ProductCache + ProductVariants + ProductImageCache.
   */
  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = {
      total: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: [],
      variantsSynced: 0,
    };

    try {
      // Fetch all products from Velox POS
      const veloxProducts = await veloxPosService.getProducts({ limit: 10000 });
      result.total = veloxProducts.length;

      const veloxProductIds = new Set<string>();

      for (const product of veloxProducts) {
        veloxProductIds.add(product.id);

        try {
          const syncedVariants = await this.upsertProduct(product, result);
          result.variantsSynced += syncedVariants;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to sync product ${product.id} (${product.sku ?? 'sin-sku'}): ${message}`);
        }
      }

      // Deactivate products that no longer exist in Velox POS
      result.deactivated = await this.deactivateMissingProducts(veloxProductIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Sync failed: ${message}`);
    }

    return result;
  }

  /**
   * Sync a single product by fetching its stock and updating the cache.
   */
  async syncProduct(veloxProductId: string): Promise<void> {
    const products = await veloxPosService.getProducts({ limit: 10000 });
    const product = products.find((p) => p.id === veloxProductId);

    if (!product) {
      throw new Error(`Product ${veloxProductId} not found in Velox POS`);
    }

    const result: SyncResult = {
      total: 1,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: [],
      variantsSynced: 0,
    };
    await this.upsertProduct(product, result);
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private async upsertProduct(
    product: VeloxProduct,
    result: SyncResult,
  ): Promise<number> {
    // Get total stock and per-variant stock from Velox.
    // When variants exist, the product-level stock equals the sum of
    // variant stocks (Velox POS recomputes the parent from the variants).
    const variants = product.variants ?? [];
    let stock = 0;
    try {
      const stockData = await veloxPosService.getStock(product.id);
      stock = stockData.current_stock;
    } catch {
      // If stock fetch fails, fall back to sum of variant stocks.
      stock = variants.reduce((sum, v) => sum + v.current_stock, 0);
    }

    const existing = await db
      .select({ id: schema.productCache.id })
      .from(schema.productCache)
      .where(eq(schema.productCache.veloxId, product.id))
      .limit(1);

    const productData = {
      veloxId: product.id,
      name: product.name,
      sku: product.sku ?? product.id,
      barcode: product.barcode,
      priceUsd: String(product.price_usd),
      priceBs: String(product.price_bs),
      isActive: product.is_active && product.is_visible_public !== false,
      imageUrl: this.normalizeVeloxImageUrl(product.image_url),
      category: product.category,
      currentStock: stock,
      metadata: {
        isVisiblePublic: product.is_visible_public !== false,
      },
      syncedAt: new Date(),
    };

    let productCacheId: string;

    if (existing.length > 0) {
      productCacheId = existing[0]!.id;
      await db
        .update(schema.productCache)
        .set(productData)
        .where(eq(schema.productCache.id, productCacheId));
      result.updated++;
    } else {
      const [inserted] = await db
        .insert(schema.productCache)
        .values({
          ...productData,
          slug: this.generateSlug(product.name, product.sku ?? product.id),
        })
        .returning({ id: schema.productCache.id });
      if (!inserted) {
        throw new Error('Insert returned no row');
      }
      productCacheId = inserted.id;
      result.created++;
    }

    // Sync variants (if any) and image cache. The image cache stores both
    // the parent product image and any variant-level image, so the PDP can
    // swap images by color.
    await this.syncVariants(productCacheId, variants);
    await this.syncImages(productCacheId, product.image_url, variants);

    return variants.length;
  }

  private async syncVariants(
    productCacheId: string,
    variants: VeloxProductVariant[],
  ): Promise<void> {
    if (variants.length === 0) {
      // No variants in Velox — drop any local variants left over from a
      // previous sync so the PDP doesn't show stale size/color data.
      await db
        .delete(schema.productVariants)
        .where(eq(schema.productVariants.productCacheId, productCacheId));
      return;
    }

    // Get the existing variants so we can determine which ones to remove
    // (Velox may have deleted variants since the last sync).
    const existing = await db
      .select({ id: schema.productVariants.id, veloxVariantId: schema.productVariants.veloxVariantId })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productCacheId, productCacheId));

    const incomingIds = new Set(variants.map((v) => v.id));
    const staleIds = existing
      .filter((row) => !incomingIds.has(row.veloxVariantId))
      .map((row) => row.id);

    if (staleIds.length > 0) {
      await db
        .delete(schema.productVariants)
        .where(inArray(schema.productVariants.id, staleIds));
    }

    // Bulk upsert via INSERT ... ON CONFLICT (velox_variant_id) DO UPDATE.
    // Drizzle exposes this via onConflictDoUpdate.
    for (const variant of variants) {
      await db
        .insert(schema.productVariants)
        .values({
          veloxVariantId: variant.id,
          productCacheId,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          colorHex: variant.color_hex,
          imageUrl: this.normalizeVeloxImageUrl(variant.image_url),
          additionalImages: variant.additional_images ?? [],
          sortOrder: variant.sort_order ?? 0,
          priceUsdOverride:
            variant.price_usd_override === null
              ? null
              : String(variant.price_usd_override),
          priceBsOverride:
            variant.price_bs_override === null
              ? null
              : String(variant.price_bs_override),
          currentStock: variant.current_stock,
          isActive: variant.is_active,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.productVariants.veloxVariantId,
          set: {
            productCacheId,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            colorHex: variant.color_hex,
            imageUrl: this.normalizeVeloxImageUrl(variant.image_url),
            additionalImages: variant.additional_images ?? [],
            sortOrder: variant.sort_order ?? 0,
            priceUsdOverride:
              variant.price_usd_override === null
                ? null
                : String(variant.price_usd_override),
            priceBsOverride:
              variant.price_bs_override === null
                ? null
                : String(variant.price_bs_override),
            currentStock: variant.current_stock,
            isActive: variant.is_active,
            syncedAt: new Date(),
          },
        });
    }
  }

  private async syncImages(
    productCacheId: string,
    productImageUrl: string | null,
    variants: VeloxProductVariant[],
  ): Promise<void> {
    // Build the deduped image list:
    // 1. parent product image (isPrimary)
    // 2. variant images (one entry per color, by variant)
    const seen = new Set<string>();
    const imageRows: Array<{
      url: string;
      sortOrder: number;
      isPrimary: boolean;
    }> = [];

    const parentImage = this.normalizeVeloxImageUrl(productImageUrl);
    if (parentImage) {
      seen.add(parentImage);
      imageRows.push({ url: parentImage, sortOrder: 0, isPrimary: true });
    }

    let order = 1;
    for (const variant of variants) {
      const url = this.normalizeVeloxImageUrl(variant.image_url);
      if (url && !seen.has(url)) {
        seen.add(url);
        imageRows.push({ url, sortOrder: order++, isPrimary: false });
      }
      for (const additional of variant.additional_images ?? []) {
        const norm = this.normalizeVeloxImageUrl(additional);
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          imageRows.push({ url: norm, sortOrder: order++, isPrimary: false });
        }
      }
    }

    // Replace all images for this product. Simpler than diffing and
    // acceptable because the list is small.
    await db
      .delete(schema.productImageCache)
      .where(eq(schema.productImageCache.productId, productCacheId));

    if (imageRows.length > 0) {
      await db.insert(schema.productImageCache).values(
        imageRows.map((row) => ({
          productId: productCacheId,
          url: row.url,
          sortOrder: row.sortOrder,
          isPrimary: row.isPrimary,
        })),
      );
    }
  }

  private async deactivateMissingProducts(activeIds: Set<string>): Promise<number> {
    const allCached = await db
      .select({ veloxId: schema.productCache.veloxId })
      .from(schema.productCache)
      .where(eq(schema.productCache.isActive, true));

    let deactivatedCount = 0;

    for (const row of allCached) {
      if (!activeIds.has(row.veloxId)) {
        await db
          .update(schema.productCache)
          .set({ isActive: false, syncedAt: new Date() })
          .where(eq(schema.productCache.veloxId, row.veloxId));
        deactivatedCount++;
      }
    }

    return deactivatedCount;
  }

  private generateSlug(name: string, sku: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${base}-${sku.toLowerCase()}`;
  }

  private normalizeVeloxImageUrl(imageUrl: string | null | undefined): string | null {
    const value = imageUrl?.trim();
    if (!value) return null;

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    if (value.startsWith('//')) {
      return `https:${value}`;
    }

    const baseUrl = process.env.VELOX_PUBLIC_ASSET_URL || process.env.VELOX_POS_API_URL;
    if (!baseUrl) return value;

    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const normalizedPath = value.startsWith('/') ? value : `/${value}`;
    return `${normalizedBase}${normalizedPath}`;
  }
}

export const productSyncService = ProductSyncService.getInstance();
export default ProductSyncService;

// Avoid the unused-import warning from `and, sql` if unused after refactors
void and;
void sql;
