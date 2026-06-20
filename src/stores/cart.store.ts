"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================
// Cart Item Type
// ============================================
export interface CartItem {
  /** Velox POS variant id (v2 contract). The cart key is this value. */
  variantId: string;
  /** Velox POS product id (FK to productCache). Kept for PDP lookups. */
  productId: string;
  /** Product name (snapshot) */
  name: string;
  /** Variant SKU when present, else product SKU. */
  sku: string;
  /** Selected size (mirrored from variant for legacy display). */
  size: string | null;
  /** Selected color (mirrored from variant for legacy display). */
  color: string | null;
  /** Color hex for display. */
  colorHex: string | null;
  /** Image URL (variant-specific when present). */
  imageUrl: string;
  /** Unit price in USD (variant override applied at add-time). */
  priceUsd: number;
  /** Unit price in BsS (at time of adding). */
  priceBs: number;
  /** Quantity */
  quantity: number;
  /** Available stock (snapshot per variant). */
  availableStock: number;
  /** Product slug for linking. */
  slug: string;
  /** Lookbook recipe context, when the item was added from a curated drop. */
  lookbookSlug?: string;
  lookbookTitle?: string;
  lookbookItemId?: string;
  lookbookRole?: string;
  /**
   * True for legacy carts that did not have a `variantId`. Such items are
   * kept in the cart but force a re-sync at the PDP before they can be
   * ordered, because the cart key is composable until migration completes.
   */
  legacy?: boolean;
}

// ============================================
// Cart Store Interface
// ============================================
interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  /** Replace a legacy item with a freshly-synced variant (called from PDP). */
  syncLegacyItem: (legacyKey: string, next: CartItem) => void;

  // Computed (via getters)
  getItemCount: () => number;
  getSubtotalUsd: () => number;
  getSubtotalBs: () => number;
  getItemKey: (variantId: string) => string;
  /** Legacy composite key for items that predate the v2 contract. */
  getLegacyKey: (productId: string, size: string, color: string) => string;
}

// ============================================
// Helpers: cart keys
// ============================================
function itemKey(variantId: string): string {
  return variantId;
}

function legacyItemKey(productId: string, size: string, color: string): string {
  return `legacy::${productId}__${size}__${color}`;
}

// ============================================
// Backward-compat: legacy carts that used
// { veloxProductId, size, color } as the key are normalized on rehydrate.
// A legacy variant id is derived as a stable synthetic value so the rest of
// the app keeps working until the user re-visits the PDP and the real
// variant id is hydrated.
// ============================================
interface LegacyCartItem {
  veloxProductId: string;
  name: string;
  sku: string;
  imageUrl: string;
  size: string;
  color: string;
  colorHex: string;
  priceUsd: number;
  priceBs: number;
  quantity: number;
  availableStock: number;
  slug: string;
}

interface PersistedState {
  items: unknown[];
}

function isLegacyItem(value: unknown): value is LegacyCartItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.veloxProductId === 'string' && !('variantId' in v);
}

function migrateLegacyItems(items: unknown[]): CartItem[] {
  return items.map((raw): CartItem => {
    if (!isLegacyItem(raw)) {
      // Already in v2 shape, but TS doesn't know — cast safely.
      return raw as CartItem;
    }
    const legacyVariantId = legacyItemKey(
      raw.veloxProductId,
      raw.size,
      raw.color,
    );
    return {
      variantId: legacyVariantId,
      productId: raw.veloxProductId,
      name: raw.name,
      sku: raw.sku,
      size: raw.size,
      color: raw.color,
      colorHex: raw.colorHex,
      imageUrl: raw.imageUrl,
      priceUsd: raw.priceUsd,
      priceBs: raw.priceBs,
      quantity: raw.quantity,
      availableStock: raw.availableStock,
      slug: raw.slug,
      legacy: true,
    };
  });
}

// ============================================
// Cart Store
// ============================================
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const key = itemKey(newItem.variantId);
          const existingIndex = state.items.findIndex(
            (item) => itemKey(item.variantId) === key,
          );

          if (existingIndex >= 0) {
            // Update quantity of existing item
            const updatedItems = [...state.items];
            const existing = updatedItems[existingIndex]!;
            const newQty = existing.quantity + (newItem.quantity ?? 1);
            updatedItems[existingIndex] = {
              ...existing,
              ...newItem,
              lookbookSlug: newItem.lookbookSlug,
              lookbookTitle: newItem.lookbookTitle,
              lookbookItemId: newItem.lookbookItemId,
              lookbookRole: newItem.lookbookRole,
              quantity: Math.min(newQty, existing.availableStock),
            };
            return { items: updatedItems, isOpen: true };
          }

          return {
            items: [
              ...state.items,
              { ...newItem, quantity: newItem.quantity ?? 1 },
            ],
            isOpen: true,
          };
        });
      },

      removeItem: (variantId) => {
        const key = itemKey(variantId);
        set((state) => ({
          items: state.items.filter(
            (item) => itemKey(item.variantId) !== key,
          ),
        }));
      },

      updateQuantity: (variantId, quantity) => {
        const key = itemKey(variantId);
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) => itemKey(item.variantId) !== key,
              ),
            };
          }

          return {
            items: state.items.map((item) => {
              if (itemKey(item.variantId) === key) {
                return {
                  ...item,
                  quantity: Math.min(quantity, item.availableStock),
                };
              }
              return item;
            }),
          };
        });
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      syncLegacyItem: (legacyKey, next) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === legacyKey ? { ...next, legacy: false } : item,
          ),
        }));
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotalUsd: () => {
        return get().items.reduce(
          (sum, item) => sum + item.priceUsd * item.quantity,
          0,
        );
      },

      getSubtotalBs: () => {
        return get().items.reduce(
          (sum, item) => sum + item.priceBs * item.quantity,
          0,
        );
      },

      getItemKey: itemKey,
      getLegacyKey: legacyItemKey,
    }),
    {
      name: "clazico-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      // Normalize legacy carts on rehydrate. v2 items pass through.
      merge: (persisted, current) => {
        const persistedState = (persisted ?? {}) as PersistedState;
        const migrated = migrateLegacyItems(persistedState.items ?? []);
        return { ...current, items: migrated };
      },
    },
  ),
);
