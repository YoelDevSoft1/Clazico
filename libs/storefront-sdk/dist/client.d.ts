import { z } from 'zod';
import type { CreateWebOrderDto, Product, ProductVariant, WebOrderStatus } from '@yoeldevsoft25/store-contracts';
export interface StorefrontClientConfig {
    baseUrl: string;
    storeId: string;
    secret: string;
    apiVersion?: string;
    fetch?: typeof globalThis.fetch;
    maxRetries?: number;
    baseDelayMs?: number;
    timeoutMs?: number;
}
export declare class StorefrontApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly body: unknown;
    constructor(status: number, code: string, message: string, body?: unknown);
}
export declare class StorefrontSchemaError extends Error {
    readonly issues: z.ZodIssue[];
    constructor(message: string, issues: z.ZodIssue[]);
}
export declare class StorefrontClient {
    private readonly baseUrl;
    private readonly storeId;
    private readonly secret;
    private readonly apiVersion;
    private readonly fetchImpl;
    private readonly maxRetries;
    private readonly baseDelayMs;
    private readonly timeoutMs;
    constructor(config: StorefrontClientConfig);
    private get headers();
    setFetchImpl(impl: typeof globalThis.fetch): void;
    private request;
    getProducts(params?: {
        limit?: number;
        offset?: number;
        search?: string;
        category?: string;
    }): Promise<{
        items: Product[];
        total: number;
    }>;
    getProduct(productId: string): Promise<Product>;
    getProductVariants(productId: string): Promise<ProductVariant[]>;
    createWebOrder(dto: Omit<CreateWebOrderDto, 'kind'>, options: {
        idempotencyKey: string;
    }): Promise<{
        id: string;
        status: WebOrderStatus;
        velox_sale_id: string | null;
    }>;
    verifyPayment(externalOrderId: string, options: {
        idempotencyKey: string;
    }): Promise<{
        status: WebOrderStatus;
        velox_sale_id: string | null;
    }>;
    buildTrackingUrl(token: string): string;
}
//# sourceMappingURL=client.d.ts.map