import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

const id = (name = "id") => text(name).primaryKey().$defaultFn(randomUUID);
const uuidText = (name: string) => text(name);
const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date());
const timestampNullable = (name: string) => integer(name, { mode: "timestamp_ms" });
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();
const money = (name: string) => text(name);

export const orderStatusValues = [
  "PENDING",
  "PAYMENT_UPLOADED",
  "PAYMENT_VERIFIED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const deliveryMethodValues = [
  "PICKUP",
  "DELIVERY",
  "MRW",
  "ZOOM",
  "TEALCA",
] as const;

export const paymentMethodValues = [
  "PAGO_MOVIL",
  "TRANSFER",
  "ZELLE",
  "CASH_USD",
  "CASH_BSS",
  "BINANCE",
] as const;

export const currencyValues = ["USD", "BSS"] as const;
export const paymentStatusValues = ["PENDING", "VERIFIED", "REJECTED"] as const;
export const exchangeRateSourceValues = ["BCV", "PARALLEL", "MANUAL"] as const;

export const users = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    image: text("image"),
    role: text("role").default("customer").notNull(),
    phone: text("phone"),
    cedula: text("cedula"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ],
);

export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at"),
    token: text("token").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("sessions_token_idx").on(table.token)],
);

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestampNullable("access_token_expires_at"),
  refreshTokenExpiresAt: timestampNullable("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const verifications = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestampNullable("created_at").$defaultFn(() => new Date()),
  updatedAt: timestampNullable("updated_at").$defaultFn(() => new Date()).$onUpdate(() => new Date()),
});

export const addresses = sqliteTable(
  "addresses",
  {
    id: id(),
    customerId: text("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    state: text("state").notNull(),
    city: text("city").notNull(),
    addressLine: text("address_line").notNull(),
    reference: text("reference"),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [index("addresses_customer_id_idx").on(table.customerId)],
);

export const productCache = sqliteTable(
  "product_cache",
  {
    id: id(),
    veloxId: text("velox_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    description: text("description"),
    brand: text("brand"),
    category: text("category"),
    priceUsd: money("price_usd").notNull(),
    priceBs: money("price_bs"),
    currentStock: integer("current_stock").default(0).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    isFeatured: integer("is_featured", { mode: "boolean" }).default(false).notNull(),
    imageUrl: text("image_url"),
    metadata: json<Record<string, unknown>>("metadata"),
    syncedAt: timestamp("synced_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
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
  ],
);

export const productImageCache = sqliteTable(
  "product_image_cache",
  {
    id: id(),
    productId: uuidText("product_id").notNull().references(() => productCache.id, { onDelete: "cascade" }),
    veloxImageId: uuidText("velox_image_id"),
    url: text("url").notNull(),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(false).notNull(),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("product_image_cache_product_id_idx").on(table.productId),
    index("product_image_cache_sort_order_idx").on(table.sortOrder),
  ],
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: id(),
    veloxVariantId: uuidText("velox_variant_id").notNull().unique(),
    productCacheId: uuidText("product_cache_id").notNull().references(() => productCache.id, { onDelete: "cascade" }),
    sku: text("sku"),
    size: text("size"),
    color: text("color"),
    colorHex: text("color_hex"),
    imageUrl: text("image_url"),
    additionalImages: json<string[]>("additional_images").default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    priceUsdOverride: money("price_usd_override"),
    priceBsOverride: money("price_bs_override"),
    currentStock: integer("current_stock").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    syncedAt: timestamp("synced_at"),
  },
  (table) => [
    index("product_variants_product_cache_id_idx").on(table.productCacheId),
    uniqueIndex("product_variants_product_size_color_idx").on(table.productCacheId, table.size, table.color),
    index("product_variants_is_active_idx").on(table.isActive),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    orderNumber: text("order_number").notNull(),
    customerId: text("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: text("status", { enum: orderStatusValues }).default("PENDING").notNull(),
    subtotalUsd: money("subtotal_usd").notNull(),
    discountUsd: money("discount_usd").default("0").notNull(),
    totalUsd: money("total_usd").notNull(),
    totalBss: money("total_bss"),
    exchangeRateUsed: money("exchange_rate_used"),
    shippingAddressId: uuidText("shipping_address_id").references(() => addresses.id, { onDelete: "set null" }),
    deliveryMethod: text("delivery_method", { enum: deliveryMethodValues }).default("PICKUP").notNull(),
    deliveryAddressText: text("delivery_address_text"),
    deliveryLat: money("delivery_lat"),
    deliveryLng: money("delivery_lng"),
    customerNotes: text("customer_notes"),
    adminNotes: text("admin_notes"),
    lookbookId: uuidText("lookbook_id").references(() => lookbooks.id, { onDelete: "set null" }),
    lookbookSlug: text("lookbook_slug"),
    lookbookTitle: text("lookbook_title"),
    veloxSaleId: text("velox_sale_id"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
    index("orders_lookbook_id_idx").on(table.lookbookId),
    index("orders_lookbook_slug_idx").on(table.lookbookSlug),
    index("orders_velox_sale_id_idx").on(table.veloxSaleId),
    uniqueIndex("orders_idempotency_key_idx").on(table.idempotencyKey),
    index("orders_created_at_idx").on(table.createdAt),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: id(),
    orderId: uuidText("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    veloxProductId: text("velox_product_id").notNull(),
    variantId: uuidText("variant_id"),
    variantSku: text("variant_sku"),
    lookbookItemId: uuidText("lookbook_item_id").references(() => lookbookItems.id, { onDelete: "set null" }),
    lookbookRole: text("lookbook_role"),
    productName: text("product_name").notNull(),
    productSku: text("product_sku").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceUsd: money("unit_price_usd").notNull(),
    unitPriceBs: money("unit_price_bs"),
    totalUsd: money("total_usd").notNull(),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_velox_product_id_idx").on(table.veloxProductId),
    index("order_items_variant_id_idx").on(table.variantId),
    index("order_items_lookbook_item_id_idx").on(table.lookbookItemId),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    orderId: uuidText("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    method: text("method", { enum: paymentMethodValues }).notNull(),
    amount: money("amount").notNull(),
    currency: text("currency", { enum: currencyValues }).notNull(),
    referenceNumber: text("reference_number"),
    bank: text("bank"),
    phoneLast4: text("phone_last4"),
    status: text("status", { enum: paymentStatusValues }).default("PENDING").notNull(),
    proofImageUrl: text("proof_image_url"),
    rejectionReason: text("rejection_reason"),
    verifiedBy: text("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestampNullable("verified_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_status_idx").on(table.status),
    index("payments_reference_number_idx").on(table.referenceNumber),
    index("payments_method_idx").on(table.method),
  ],
);

export const orderStatusHistory = sqliteTable(
  "order_status_history",
  {
    id: id(),
    orderId: uuidText("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: text("status", { enum: orderStatusValues }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("order_status_history_order_id_idx").on(table.orderId),
    index("order_status_history_created_at_idx").on(table.createdAt),
  ],
);

export const ordersSync = sqliteTable("orders_sync", {
  orderId: uuidText("order_id").primaryKey().references(() => orders.id, { onDelete: "cascade" }),
  veloxWebOrderId: uuidText("velox_web_order_id"),
  veloxSaleId: uuidText("velox_sale_id"),
  lastSyncAttemptAt: timestampNullable("last_sync_attempt_at"),
  lastSyncError: text("last_sync_error"),
  syncStatus: text("sync_status").notNull().default("pending"),
});

export const outbox = sqliteTable(
  "outbox",
  {
    id: id(),
    type: text("type").notNull(),
    aggregateId: uuidText("aggregate_id").notNull(),
    payload: json<unknown>("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(10),
    nextAttemptAt: timestamp("next_attempt_at"),
    lockedAt: timestampNullable("locked_at"),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("outbox_status_next_attempt_idx").on(table.status, table.nextAttemptAt),
    index("outbox_aggregate_id_idx").on(table.aggregateId),
    uniqueIndex("outbox_idempotency_key_idx").on(table.idempotencyKey),
  ],
);

export const webhookDeliveries = sqliteTable(
  "webhook_deliveries",
  {
    id: id(),
    eventId: text("event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    payload: json<unknown>("payload").notNull(),
    signature: text("signature").notNull(),
    processedAt: timestampNullable("processed_at"),
    result: text("result"),
    error: text("error"),
    receivedAt: timestamp("received_at"),
  },
  (table) => [
    index("webhook_deliveries_event_type_idx").on(table.eventType),
    index("webhook_deliveries_received_at_idx").on(table.receivedAt),
  ],
);

export const exchangeRates = sqliteTable(
  "exchange_rates",
  {
    id: id(),
    rateBssPerUsd: money("rate_bss_per_usd").notNull(),
    source: text("source", { enum: exchangeRateSourceValues }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    effectiveDate: text("effective_date").notNull(),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("exchange_rates_is_active_idx").on(table.isActive),
    index("exchange_rates_effective_date_idx").on(table.effectiveDate),
    index("exchange_rates_source_idx").on(table.source),
  ],
);

export const lookbooks = sqliteTable(
  "lookbooks",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    season: text("season"),
    isPublished: integer("is_published", { mode: "boolean" }).default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("lookbooks_slug_idx").on(table.slug),
    index("lookbooks_is_published_idx").on(table.isPublished),
    index("lookbooks_sort_order_idx").on(table.sortOrder),
  ],
);

export const lookbookImages = sqliteTable(
  "lookbook_images",
  {
    id: id(),
    lookbookId: uuidText("lookbook_id").notNull().references(() => lookbooks.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    sortOrder: integer("sort_order").default(0).notNull(),
    taggedProducts: json<Array<{ productId: string; x: number; y: number; label?: string }>>("tagged_products"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("lookbook_images_lookbook_id_idx").on(table.lookbookId),
    index("lookbook_images_sort_order_idx").on(table.sortOrder),
  ],
);

export const lookbookItems = sqliteTable(
  "lookbook_items",
  {
    id: id(),
    lookbookId: uuidText("lookbook_id").notNull().references(() => lookbooks.id, { onDelete: "cascade" }),
    productCacheId: uuidText("product_cache_id").notNull().references(() => productCache.id, { onDelete: "restrict" }),
    variantId: uuidText("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    role: text("role").default("piece").notNull(),
    label: text("label"),
    isRequired: integer("is_required", { mode: "boolean" }).default(true).notNull(),
    minQuantity: integer("min_quantity").default(1).notNull(),
    maxQuantity: integer("max_quantity").default(1).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("lookbook_items_lookbook_id_idx").on(table.lookbookId),
    index("lookbook_items_product_cache_id_idx").on(table.productCacheId),
    index("lookbook_items_variant_id_idx").on(table.variantId),
    index("lookbook_items_sort_order_idx").on(table.sortOrder),
  ],
);

export const siteConfig = sqliteTable(
  "site_config",
  {
    id: id(),
    key: text("key").notNull(),
    value: json<unknown>("value").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("site_config_key_idx").on(table.key)],
);

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  verifiedPayments: many(payments),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.customerId], references: [users.id] }),
}));

export const productCacheRelations = relations(productCache, ({ many }) => ({
  images: many(productImageCache),
  variants: many(productVariants),
  lookbookItems: many(lookbookItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(productCache, { fields: [productVariants.productCacheId], references: [productCache.id] }),
  lookbookItems: many(lookbookItems),
}));

export const productImageCacheRelations = relations(productImageCache, ({ one }) => ({
  product: one(productCache, { fields: [productImageCache.productId], references: [productCache.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.customerId], references: [users.id] }),
  shippingAddress: one(addresses, { fields: [orders.shippingAddressId], references: [addresses.id] }),
  items: many(orderItems),
  payments: many(payments),
  statusHistory: many(orderStatusHistory),
  sync: one(ordersSync, { fields: [orders.id], references: [ordersSync.orderId] }),
  lookbook: one(lookbooks, { fields: [orders.lookbookId], references: [lookbooks.id] }),
}));

export const ordersSyncRelations = relations(ordersSync, ({ one }) => ({
  order: one(orders, { fields: [ordersSync.orderId], references: [orders.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  lookbookItem: one(lookbookItems, { fields: [orderItems.lookbookItemId], references: [lookbookItems.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  verifier: one(users, { fields: [payments.verifiedBy], references: [users.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const lookbooksRelations = relations(lookbooks, ({ many }) => ({
  images: many(lookbookImages),
  items: many(lookbookItems),
}));

export const lookbookImagesRelations = relations(lookbookImages, ({ one }) => ({
  lookbook: one(lookbooks, { fields: [lookbookImages.lookbookId], references: [lookbooks.id] }),
}));

export const lookbookItemsRelations = relations(lookbookItems, ({ one, many }) => ({
  lookbook: one(lookbooks, { fields: [lookbookItems.lookbookId], references: [lookbooks.id] }),
  product: one(productCache, { fields: [lookbookItems.productCacheId], references: [productCache.id] }),
  variant: one(productVariants, { fields: [lookbookItems.variantId], references: [productVariants.id] }),
  orderItems: many(orderItems),
}));
