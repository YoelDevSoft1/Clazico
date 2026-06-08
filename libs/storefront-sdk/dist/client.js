import { z } from 'zod';
import { CreateWebOrderDtoSchema, ProductSchema, ProductVariantSchema, STOREFRONT_API_VERSION, WebOrderStatusUpdatedPayloadSchema, } from '@yoeldevsoft25/store-contracts';
const GetPublicMenuRawResponseSchema = z.object({
    success: z.boolean(),
    store: z.object({
        id: z.string().uuid(),
        name: z.string(),
        pickup_enabled: z.boolean(),
        delivery_enabled: z.boolean(),
    }),
    menu: z.object({
        categories: z.array(z.object({
            name: z.string(),
            products: z.array(ProductSchema),
        })),
    }),
    exchange_rate: z.number(),
});
const CreateWebOrderResponseSchema = z.object({
    id: z.string().uuid(),
    status: WebOrderStatusUpdatedPayloadSchema.shape.data.shape.status,
    velox_sale_id: z.string().uuid().nullable(),
});
const VerifyPaymentResponseSchema = z.object({
    status: WebOrderStatusUpdatedPayloadSchema.shape.data.shape.status,
    velox_sale_id: z.string().uuid().nullable(),
});
export class StorefrontApiError extends Error {
    status;
    code;
    body;
    constructor(status, code, message, body) {
        super(message);
        this.name = 'StorefrontApiError';
        this.status = status;
        this.code = code;
        this.body = body;
    }
}
export class StorefrontSchemaError extends Error {
    issues;
    constructor(message, issues) {
        super(message);
        this.name = 'StorefrontSchemaError';
        this.issues = issues;
    }
}
export class StorefrontClient {
    baseUrl;
    storeId;
    secret;
    apiVersion;
    fetchImpl;
    maxRetries;
    baseDelayMs;
    timeoutMs;
    constructor(config) {
        if (!config.baseUrl)
            throw new Error('StorefrontClient: baseUrl is required');
        if (!config.storeId)
            throw new Error('StorefrontClient: storeId is required');
        if (!config.secret)
            throw new Error('StorefrontClient: secret is required');
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.storeId = config.storeId;
        this.secret = config.secret;
        this.apiVersion = config.apiVersion ?? STOREFRONT_API_VERSION;
        this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
        this.maxRetries = Math.max(0, config.maxRetries ?? 3);
        this.baseDelayMs = Math.max(50, config.baseDelayMs ?? 500);
        this.timeoutMs = Math.max(1000, config.timeoutMs ?? 15_000);
    }
    get headers() {
        return {
            'content-type': 'application/json',
            'x-storefront-store-id': this.storeId,
            'x-storefront-secret': this.secret,
            'x-velox-api-version': this.apiVersion,
        };
    }
    setFetchImpl(impl) {
        Object.defineProperty(this, 'fetchImpl', { value: impl, writable: true });
    }
    async request(method, path, options = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = { ...this.headers };
        if (options.idempotencyKey) {
            headers['idempotency-key'] = options.idempotencyKey;
        }
        let lastError = new Error('Request failed: no attempt was made');
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            const signal = options.signal ?? controller.signal;
            try {
                const response = await this.fetchImpl(url, {
                    method,
                    headers,
                    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
                    signal,
                });
                if (response.status >= 200 && response.status < 300) {
                    const text = await response.text();
                    clearTimeout(timer);
                    const parsed = text.length > 0 ? JSON.parse(text) : undefined;
                    if (options.schema) {
                        const result = options.schema.safeParse(parsed);
                        if (!result.success) {
                            throw new StorefrontSchemaError(`Response from ${method} ${path} did not match schema`, result.error.issues);
                        }
                        return result.data;
                    }
                    return parsed;
                }
                if (response.status >= 400 && response.status < 500) {
                    clearTimeout(timer);
                    const body = await response.json().catch(() => undefined);
                    const code = readErrorCode(body) ?? 'CLIENT_ERROR';
                    const message = readErrorMessage(body) ?? `HTTP ${response.status}`;
                    throw new StorefrontApiError(response.status, code, message, body);
                }
                clearTimeout(timer);
                const body = await response.json().catch(() => undefined);
                lastError = new StorefrontApiError(response.status, readErrorCode(body) ?? 'SERVER_ERROR', readErrorMessage(body) ?? `HTTP ${response.status}`, body);
            }
            catch (error) {
                clearTimeout(timer);
                if (error instanceof StorefrontApiError && error.status < 500) {
                    throw error;
                }
                if (error instanceof StorefrontSchemaError) {
                    throw error;
                }
                lastError = error;
            }
            if (attempt < this.maxRetries) {
                const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), 8_000);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        if (lastError instanceof Error) {
            throw lastError;
        }
        throw new Error('Request failed');
    }
    async getProducts(params = {}) {
        const raw = await this.request('GET', `/public/menu/store/${this.storeId}`, {
            schema: GetPublicMenuRawResponseSchema,
        });
        let products = [];
        for (const cat of raw.menu.categories) {
            if (params.category && cat.name.toLowerCase() !== params.category.toLowerCase()) {
                continue;
            }
            products.push(...cat.products);
        }
        if (params.search) {
            const searchLower = params.search.toLowerCase();
            products = products.filter((p) => p.name.toLowerCase().includes(searchLower) ||
                (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
                (p.category && p.category.toLowerCase().includes(searchLower)));
        }
        const total = products.length;
        const offset = params.offset ?? 0;
        const limit = params.limit ?? 20;
        const items = products.slice(offset, offset + limit);
        return { items, total };
    }
    async getProduct(productId) {
        return this.request('GET', `/public/menu/store/${this.storeId}/products/${productId}`, {
            schema: ProductSchema,
        });
    }
    async getProductVariants(productId) {
        return this.request('GET', `/public/menu/store/${this.storeId}/products/${productId}/variants`, { schema: z.array(ProductVariantSchema) });
    }
    async createWebOrder(dto, options) {
        if (!options.idempotencyKey) {
            throw new Error('createWebOrder: idempotencyKey is required');
        }
        const body = CreateWebOrderDtoSchema.parse({ kind: 'product', ...dto });
        return this.request('POST', `/web-orders/public/${this.storeId}`, {
            body,
            idempotencyKey: options.idempotencyKey,
            schema: CreateWebOrderResponseSchema,
        });
    }
    async verifyPayment(externalOrderId, options) {
        if (!options.idempotencyKey) {
            throw new Error('verifyPayment: idempotencyKey is required');
        }
        return this.request('POST', `/web-orders/external/${encodeURIComponent(externalOrderId)}/verify-payment`, {
            idempotencyKey: options.idempotencyKey,
            schema: VerifyPaymentResponseSchema,
        });
    }
    buildTrackingUrl(token) {
        return `${this.baseUrl}/web-orders/public/tracking/${token}`;
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function readErrorCode(body) {
    if (!isRecord(body))
        return undefined;
    const value = body['code'];
    return typeof value === 'string' ? value : undefined;
}
function readErrorMessage(body) {
    if (!isRecord(body))
        return undefined;
    const value = body['message'];
    return typeof value === 'string' ? value : undefined;
}
//# sourceMappingURL=client.js.map