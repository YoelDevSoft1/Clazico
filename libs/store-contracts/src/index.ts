/**
 * @la-caja/store-contracts
 *
 * Single source of truth para el shape del contrato HTTP entre
 * Velox POS y storefronts externos (clazico-store y futuras tiendas).
 *
 * Versionado semántico: STOREFRONT_API_VERSION se envía en el header
 * `x-velox-api-version`. Cambios incompatibles bump MAJOR.
 *
 * Ver:
 * - ADR-7: SDK vive en packages/storefront-sdk/ (consumer)
 * - ADR-6: Webhooks canónicos via Zod
 * - docs/architecture/storefront-integration-v2.md
 */

export * from './sources';
export * from './products';
export * from './web-orders';
export * from './webhooks';
export * from './menu';
