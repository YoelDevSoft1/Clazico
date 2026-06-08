import { z } from 'zod';

/**
 * Sources permitidos para web-orders desde storefronts externos.
 * Single source of truth — el POS acepta solo sources en este whitelist.
 *
 * Para agregar un nuevo storefront: añadir el slug aquí, versionar
 * el contrato (ADR-7), y publicar el cambio.
 */
export const STOREFRONT_SOURCES = ['clazico', 'shopify', 'woocommerce', 'custom'] as const;
export type StorefrontSource = (typeof STOREFRONT_SOURCES)[number];

export const StorefrontSourceSchema = z.enum(STOREFRONT_SOURCES);

/**
 * Versión actual del contrato. Header `x-velox-api-version`.
 * Semver: MAJOR bump = breaking change, MINOR = additive, PATCH = internal.
 */
export const STOREFRONT_API_VERSION = '2.0.0' as const;
