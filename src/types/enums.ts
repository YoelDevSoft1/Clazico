// ─────────────────────────────────────────────────────────────
// Enums — these mirror the pgEnum definitions in drizzle/schema.ts
// ─────────────────────────────────────────────────────────────

/** Order lifecycle status */
export enum OrderStatus {
  PENDING = "PENDING",
  PAYMENT_UPLOADED = "PAYMENT_UPLOADED",
  PAYMENT_VERIFIED = "PAYMENT_VERIFIED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

/** How the customer wants the order delivered */
export enum DeliveryMethod {
  PICKUP = "PICKUP",
  DELIVERY = "DELIVERY",
  MRW = "MRW",
  ZOOM = "ZOOM",
  TEALCA = "TEALCA",
}

/** Accepted payment methods in Venezuela */
export enum PaymentMethod {
  PAGO_MOVIL = "PAGO_MOVIL",
  TRANSFER = "TRANSFER",
  ZELLE = "ZELLE",
  CASH_USD = "CASH_USD",
  CASH_BSS = "CASH_BSS",
  BINANCE = "BINANCE",
}

/** Currency codes used in the store */
export enum Currency {
  USD = "USD",
  BSS = "BSS",
}

/** Payment verification status */
export enum PaymentStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

/** Where the exchange rate was sourced from */
export enum ExchangeRateSource {
  BCV = "BCV",
  PARALLEL = "PARALLEL",
  MANUAL = "MANUAL",
}

/** Admin user roles */
export enum AdminRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
}
