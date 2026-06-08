import type { WebhookEnvelope, WebhookPayload } from '@yoeldevsoft25/store-contracts';
export interface VerifyWebhookOptions {
    secret: string;
    apiVersion?: string;
    maxClockSkewMs?: number;
    now?: () => number;
}
export interface VerifiedWebhook {
    envelope: WebhookEnvelope;
    payload: WebhookPayload;
}
export declare class WebhookSignatureError extends Error {
    constructor(message: string);
}
export declare class WebhookTimestampError extends Error {
    constructor(message: string);
}
export declare class WebhookHeaderError extends Error {
    constructor(message: string);
}
export declare class WebhookSchemaError extends Error {
    constructor(message: string);
}
export declare class WebhookEventMismatchError extends Error {
    constructor(message: string);
}
export declare function verifyWebhook(rawBody: string, headers: WebhookHeaders, options: VerifyWebhookOptions): VerifiedWebhook;
export type WebhookHeaders = Partial<Record<string, string | string[] | undefined>>;
export declare function verifyWebhookFromRequest(rawBody: string, headers: Record<string, string | string[] | undefined>, options: VerifyWebhookOptions): VerifiedWebhook;
export interface WebhookDedupStore {
    has(deliveryId: string): Promise<boolean>;
    mark(deliveryId: string, result: 'success' | 'failed' | 'skipped_duplicate'): Promise<void>;
}
export declare function processWebhookDedup(rawBody: string, headers: WebhookHeaders, options: VerifyWebhookOptions, dedupStore: WebhookDedupStore): Promise<VerifiedWebhook | null>;
//# sourceMappingURL=webhook.d.ts.map