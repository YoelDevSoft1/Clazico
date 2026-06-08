import { clsx, type ClassValue } from "clsx";

/**
 * Merge class names with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format price in USD
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format price in Bolívares (Bs.)
 */
export function formatBsS(amount: number): string {
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " Bs.";
}

/**
 * Convert USD to BsS using exchange rate
 */
export function usdToBsS(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}

/**
 * Convert BsS to USD using exchange rate
 */
export function bsSToUsd(bss: number, rate: number): number {
  if (rate === 0) return 0;
  return Math.round((bss / rate) * 100) / 100;
}

/**
 * Format a date for Venezuelan locale
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    ...options,
  }).format(d);
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Format relative time (e.g., "hace 5 minutos")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;

  return formatDate(d);
}

/**
 * Generate a slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format phone number (Venezuelan format)
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Validate Venezuelan cedula format
 */
export function isValidCedula(cedula: string): boolean {
  return /^[VEJPGvejpg]-?\d{5,9}$/.test(cedula);
}

/**
 * Format Venezuelan cedula
 */
export function formatCedula(cedula: string): string {
  const cleaned = cedula.replace(/[^VEJPGvejpg0-9]/g, "");
  if (cleaned.length >= 2) {
    const prefix = cleaned[0].toUpperCase();
    const number = cleaned.slice(1);
    const formatted = number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${prefix}-${formatted}`;
  }
  return cedula;
}

/**
 * Get payment method display label
 */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    PAGO_MOVIL: "Pago Móvil",
    TRANSFER: "Transferencia Bancaria",
    ZELLE: "Zelle",
    CASH_USD: "Efectivo USD",
    CASH_BSS: "Efectivo Bs.",
    BINANCE: "Binance / USDT",
  };
  return labels[method] || method;
}

/**
 * Get payment method icon emoji
 */
export function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    PAGO_MOVIL: "💳",
    TRANSFER: "🏦",
    ZELLE: "💵",
    CASH_USD: "💲",
    CASH_BSS: "💰",
    BINANCE: "₿",
  };
  return icons[method] || "💳";
}

/**
 * Get order status display label and color
 */
export function getOrderStatusInfo(status: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  const statuses: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING_PAYMENT: {
      label: "Pendiente de Pago",
      color: "text-warning",
      bgColor: "bg-warning-light",
    },
    PAYMENT_SUBMITTED: {
      label: "Pago Enviado",
      color: "text-info",
      bgColor: "bg-info-light",
    },
    PAYMENT_VERIFIED: {
      label: "Pago Verificado",
      color: "text-success",
      bgColor: "bg-success-light",
    },
    PROCESSING: {
      label: "En Proceso",
      color: "text-info",
      bgColor: "bg-info-light",
    },
    READY: {
      label: "Listo para Entrega",
      color: "text-success",
      bgColor: "bg-success-light",
    },
    DELIVERED: {
      label: "Entregado",
      color: "text-success",
      bgColor: "bg-success-light",
    },
    CANCELLED: {
      label: "Cancelado",
      color: "text-danger",
      bgColor: "bg-danger-light",
    },
  };
  return statuses[status] || { label: status, color: "text-neutral-500", bgColor: "bg-neutral-100" };
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random string ID
 */
export function generateId(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
