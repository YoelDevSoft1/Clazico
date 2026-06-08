import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  date,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────
// Postgres Enums
// ─────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PAYMENT_UPLOADED",
  "PAYMENT_VERIFIED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "PICKUP",
  "DELIVERY",
  "MRW",
  "ZOOM",
  "TEALCA",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "PAGO_MOVIL",
  "TRANSFER",
  "ZELLE",
  "CASH_USD",
  "CASH_BSS",
  "BINANCE",
]);

export const currencyEnum = pgEnum("currency", ["USD", "BSS"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "VERIFIED",
  "REJECTED",
]);

export const exchangeRateSourceEnum = pgEnum("exchange_rate_source", [
  "BCV",
  "PARALLEL",
  "MANUAL",
]);

// ─────────────────────────────────────────────────────────────
// Better Auth Tables
// ─────────────────────────────────────────────────────────────

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: varchar("role", { length: 50 }).default("customer").notNull(),
    phone: varchar("phone", { length: 30 }),
    cedula: varchar("cedula", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ]
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("sessions_token_idx").on(table.token),
  ]
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  }
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  }
);

// ── Addresses ────────────────────────────────────────────────

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(), // e.g. "Casa", "Oficina"
    state: varchar("state", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    addressLine: text("address_line").notNull(),
    reference: text("reference"), // "frente al CC Sambil"
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("addresses_customer_id_idx").on(table.customerId),
  ]
);

// ── Product Cache (synced from Velox POS) ────────────────────

export const productCache = pgTable(
  "product_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    veloxId: varchar("velox_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    description: text("description"),
    brand: varchar("brand", { length: 200 }),
    category: varchar("category", { length: 200 }),
    priceUsd: decimal("price_usd", { precision: 12, scale: 2 }).notNull(),
    priceBs: decimal("price_bs", { precision: 16, scale: 2 }),
    currentStock: integer("current_stock").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    imageUrl: text("image_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("product_cache_velox_id_idx").on(table.veloxId),
    uniqueIndex("product_cache_slug_idx").on(table.slug),
    uniqueIndex("product_cache_sku_idx").on(table.sku),
    index("product_cache_barcode_idx").on(table.barcode),
    index("product_cache_category_idx").on(table.category),
    index("product_cache_brand_idx").on(table.brand),
    index("product_cache_is_active_idx").on(table.isActive),
    index("product_cache_is_featured_idx").on(table.isFeatured),
  ]
);

// ── Product Image Cache ──────────────────────────────────────

export const productImageCache = pgTable(
  "product_image_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productCache.id, { onDelete: "cascade" }),
    veloxImageId: uuid("velox_image_id"),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 500 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_image_cache_product_id_idx").on(table.productId),
    index("product_image_cache_sort_order_idx").on(table.sortOrder),
  ]
);

// ── Product Variants (storefront v2) ─────────────────────────

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    veloxVariantId: uuid("velox_variant_id").notNull().unique(),
    productCacheId: uuid("product_cache_id")
      .notNull()
      .references(() => productCache.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }),
    size: varchar("size", { length: 50 }),
    color: varchar("color", { length: 100 }),
    colorHex: varchar("color_hex", { length: 7 }),
    imageUrl: text("image_url"),
    additionalImages: jsonb("additional_images").$type<string[]>().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    priceUsdOverride: numeric("price_usd_override", { precision: 12, scale: 2 }),
    priceBsOverride: numeric("price_bs_override", { precision: 18, scale: 2 }),
    currentStock: integer("current_stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_variants_product_cache_id_idx").on(table.productCacheId),
    uniqueIndex("product_variants_product_size_color_idx").on(
      table.productCacheId,
      table.size,
      table.color,
    ),
    index("product_variants_is_active_idx").on(table.isActive),
  ]
);

// ── Orders ───────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 30 }).notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").default("PENDING").notNull(),
    subtotalUsd: decimal("subtotal_usd", { precision: 12, scale: 2 }).notNull(),
    discountUsd: decimal("discount_usd", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    totalUsd: decimal("total_usd", { precision: 12, scale: 2 }).notNull(),
    totalBss: decimal("total_bss", { precision: 16, scale: 2 }),
    exchangeRateUsed: decimal("exchange_rate_used", {
      precision: 12,
      scale: 4,
    }),
    shippingAddressId: uuid("shipping_address_id").references(
      () => addresses.id,
      { onDelete: "set null" }
    ),
    deliveryMethod: deliveryMethodEnum("delivery_method")
      .default("PICKUP")
      .notNull(),
    deliveryAddressText: text("delivery_address_text"),
    deliveryLat: decimal("delivery_lat", { precision: 10, scale: 7 }),
    deliveryLng: decimal("delivery_lng", { precision: 10, scale: 7 }),
    customerNotes: text("customer_notes"),
    adminNotes: text("admin_notes"),
    veloxSaleId: varchar("velox_sale_id", { length: 100 }),
    /** Idempotency key propagated to Velox (webhook replay protection) */
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
    index("orders_velox_sale_id_idx").on(table.veloxSaleId),
    index("orders_idempotency_key_idx").on(table.idempotencyKey),
    index("orders_created_at_idx").on(table.createdAt),
  ]
);

// ── Order Items ──────────────────────────────────────────────

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    veloxProductId: varchar("velox_product_id", { length: 100 }).notNull(),
    variantId: uuid("variant_id"),
    variantSku: varchar("variant_sku", { length: 100 }),
    productName: varchar("product_name", { length: 500 }).notNull(),
    productSku: varchar("product_sku", { length: 100 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceUsd: decimal("unit_price_usd", {
      precision: 12,
      scale: 2,
    }).notNull(),
    unitPriceBs: decimal("unit_price_bs", { precision: 16, scale: 2 }),
    totalUsd: decimal("total_usd", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_velox_product_id_idx").on(table.veloxProductId),
    index("order_items_variant_id_idx").on(table.variantId),
  ]
);

// ── Payments ─────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    amount: decimal("amount", { precision: 16, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    referenceNumber: varchar("reference_number", { length: 100 }),
    bank: varchar("bank", { length: 100 }),
    phoneLast4: varchar("phone_last4", { length: 4 }),
    status: paymentStatusEnum("status").default("PENDING").notNull(),
    proofImageUrl: text("proof_image_url"),
    rejectionReason: text("rejection_reason"),
    verifiedBy: text("verified_by").references(() => users.id, {
      onDelete: "set null",
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_status_idx").on(table.status),
    index("payments_reference_number_idx").on(table.referenceNumber),
    index("payments_method_idx").on(table.method),
  ]
);

// ── Order Status History ─────────────────────────────────────

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_status_history_order_id_idx").on(table.orderId),
    index("order_status_history_created_at_idx").on(table.createdAt),
  ]
);

// ── Orders Sync (storefront v2) ───────────────────────────────

export const ordersSync = pgTable("orders_sync", {
  orderId: uuid("order_id")
    .primaryKey()
    .references(() => orders.id, { onDelete: "cascade" }),
  veloxSaleId: uuid("velox_sale_id"),
  lastSyncAttemptAt: timestamp("last_sync_attempt_at", { withTimezone: true }),
  lastSyncError: text("last_sync_error"),
  syncStatus: varchar("sync_status", { length: 20 })
    .notNull()
    .default("pending"),
});

// ── Outbox (storefront v2) ────────────────────────────────────

export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 50 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(10),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("outbox_status_next_attempt_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
    index("outbox_aggregate_id_idx").on(table.aggregateId),
    index("outbox_idempotency_key_idx").on(table.idempotencyKey),
  ],
);

// ── Webhook Deliveries (storefront v2 dedup) ──────────────────

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull().unique(),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    source: varchar("source", { length: 50 }).notNull(),
    payload: jsonb("payload").notNull(),
    signature: text("signature").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    result: varchar("result", { length: 20 }),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("webhook_deliveries_event_type_idx").on(table.eventType),
    index("webhook_deliveries_received_at_idx").on(table.receivedAt),
  ],
);

// ── Exchange Rates ───────────────────────────────────────────

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rateBssPerUsd: decimal("rate_bss_per_usd", {
      precision: 12,
      scale: 4,
    }).notNull(),
    source: exchangeRateSourceEnum("source").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    effectiveDate: date("effective_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("exchange_rates_is_active_idx").on(table.isActive),
    index("exchange_rates_effective_date_idx").on(table.effectiveDate),
    index("exchange_rates_source_idx").on(table.source),
  ]
);

// ── Lookbooks ────────────────────────────────────────────────

export const lookbooks = pgTable(
  "lookbooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 300 }).notNull(),
    slug: varchar("slug", { length: 300 }).notNull(),
    description: text("description"),
    season: varchar("season", { length: 100 }),
    isPublished: boolean("is_published").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("lookbooks_slug_idx").on(table.slug),
    index("lookbooks_is_published_idx").on(table.isPublished),
    index("lookbooks_sort_order_idx").on(table.sortOrder),
  ]
);

// ── Lookbook Images ──────────────────────────────────────────

export const lookbookImages = pgTable(
  "lookbook_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lookbookId: uuid("lookbook_id")
      .notNull()
      .references(() => lookbooks.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    sortOrder: integer("sort_order").default(0).notNull(),
    taggedProducts: jsonb("tagged_products").$type<
      Array<{ productId: string; x: number; y: number; label?: string }>
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("lookbook_images_lookbook_id_idx").on(table.lookbookId),
    index("lookbook_images_sort_order_idx").on(table.sortOrder),
  ]
);

// ── Site Config (key-value) ──────────────────────────────────

export const siteConfig = pgTable(
  "site_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 255 }).notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("site_config_key_idx").on(table.key)]
);

// ─────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  verifiedPayments: many(payments),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.customerId],
    references: [users.id],
  }),
}));

export const productCacheRelations = relations(productCache, ({ many }) => ({
  images: many(productImageCache),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(productCache, {
      fields: [productVariants.productCacheId],
      references: [productCache.id],
    }),
  }),
);

export const productImageCacheRelations = relations(
  productImageCache,
  ({ one }) => ({
    product: one(productCache, {
      fields: [productImageCache.productId],
      references: [productCache.id],
    }),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  statusHistory: many(orderStatusHistory),
  sync: one(ordersSync, {
    fields: [orders.id],
    references: [ordersSync.orderId],
  }),
}));

export const ordersSyncRelations = relations(ordersSync, ({ one }) => ({
  order: one(orders, {
    fields: [ordersSync.orderId],
    references: [orders.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  verifier: one(users, {
    fields: [payments.verifiedBy],
    references: [users.id],
  }),
}));

export const orderStatusHistoryRelations = relations(
  orderStatusHistory,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderStatusHistory.orderId],
      references: [orders.id],
    }),
  })
);

export const lookbooksRelations = relations(lookbooks, ({ many }) => ({
  images: many(lookbookImages),
}));

export const lookbookImagesRelations = relations(
  lookbookImages,
  ({ one }) => ({
    lookbook: one(lookbooks, {
      fields: [lookbookImages.lookbookId],
      references: [lookbooks.id],
    }),
  })
);
