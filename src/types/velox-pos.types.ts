// ─────────────────────────────────────────────────────────────
// Velox POS API response types
// ─────────────────────────────────────────────────────────────

/** Authentication token response */
export interface VeloxAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/** A single product from Velox POS */
export interface VeloxProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  price: number;
  cost: number;
  stock: number;
  is_active: boolean;
  images: VeloxProductImage[];
  variants: VeloxProductVariant[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Image attached to a Velox product */
export interface VeloxProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

/** Variant (size / color) from Velox POS */
export interface VeloxProductVariant {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
}

/** Paginated list response wrapper */
export interface VeloxPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

/** Velox POS sale (order pushed to POS) */
export interface VeloxSale {
  id: string;
  sale_number: string;
  customer_name: string;
  customer_cedula: string | null;
  items: VeloxSaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
}

/** Line item inside a Velox sale */
export interface VeloxSaleItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

/** Velox webhook payload */
export interface VeloxWebhookPayload {
  event: VeloxWebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/** Known webhook event types */
export type VeloxWebhookEvent =
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "stock.updated"
  | "sale.created"
  | "sale.updated"
  | "sale.voided";

/** Inventory / stock update from Velox */
export interface VeloxStockUpdate {
  product_id: string;
  sku: string;
  previous_stock: number;
  new_stock: number;
  reason: string;
  updated_at: string;
}

/** Category from Velox POS */
export interface VeloxCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

/** Generic API error from Velox */
export interface VeloxApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}
