import { createHmac, timingSafeEqual } from 'node:crypto';
import { STOREFRONT_API_VERSION, WebhookEnvelopeSchema, WebhookPayloadSchema, WEBHOOK_HEADERS, } from '@yoeldevsoft25/store-contracts';
export class WebhookSignatureError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WebhookSignatureError';
    }
}
export class WebhookTimestampError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WebhookTimestampError';
    }
}
export class WebhookHeaderError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WebhookHeaderError';
    }
}
export class WebhookSchemaError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WebhookSchemaError';
    }
}
export class WebhookEventMismatchError extends Error {
    constructor(message) {
        super(message);
        this.name = 'WebhookEventMismatchError';
    }
}
export function verifyWebhook(rawBody, headers, options) {
    if (!options.secret) {
        throw new WebhookHeaderError('verifyWebhook: secret is required');
    }
    const signatureHeader = firstHeader(headers[WEBHOOK_HEADERS.SIGNATURE]);
    const eventHeader = firstHeader(headers[WEBHOOK_HEADERS.EVENT]);
    const deliveryIdHeader = firstHeader(headers[WEBHOOK_HEADERS.DELIVERY_ID]);
    const timestampHeader = firstHeader(headers[WEBHOOK_HEADERS.TIMESTAMP]);
    const apiVersionHeader = firstHeader(headers[WEBHOOK_HEADERS.API_VERSION]);
    if (!signatureHeader) {
        throw new WebhookHeaderError(`Missing header: ${WEBHOOK_HEADERS.SIGNATURE}`);
    }
    if (!eventHeader) {
        throw new WebhookHeaderError(`Missing header: ${WEBHOOK_HEADERS.EVENT}`);
    }
    if (!deliveryIdHeader) {
        throw new WebhookHeaderError(`Missing header: ${WEBHOOK_HEADERS.DELIVERY_ID}`);
    }
    if (!timestampHeader) {
        throw new WebhookHeaderError(`Missing header: ${WEBHOOK_HEADERS.TIMESTAMP}`);
    }
    const providedHex = signatureHeader.replace(/^sha256=/, '');
    const expectedHex = createHmac('sha256', options.secret).update(rawBody).digest('hex');
    const providedBuf = safeHexToBuffer(providedHex);
    const expectedBuf = safeHexToBuffer(expectedHex);
    if (providedBuf === null || expectedBuf === null || providedBuf.length !== expectedBuf.length) {
        throw new WebhookSignatureError('Invalid webhook signature');
    }
    if (!timingSafeEqual(providedBuf, expectedBuf)) {
        throw new WebhookSignatureError('Invalid webhook signature');
    }
    const now = options.now ?? Date.now;
    const ts = Date.parse(timestampHeader);
    if (Number.isNaN(ts)) {
        throw new WebhookTimestampError('Invalid timestamp');
    }
    const maxSkew = options.maxClockSkewMs ?? 5 * 60 * 1000;
    if (Math.abs(now() - ts) > maxSkew) {
        throw new WebhookTimestampError('Webhook timestamp outside allowed clock skew');
    }
    let parsed;
    try {
        parsed = JSON.parse(rawBody);
    }
    catch {
        throw new WebhookSchemaError('Webhook body is not valid JSON');
    }
    const envelopeResult = WebhookEnvelopeSchema.safeParse(parsed);
    if (!envelopeResult.success) {
        throw new WebhookSchemaError(`Webhook envelope does not match schema: ${envelopeResult.error.message}`);
    }
    const envelope = envelopeResult.data;
    if (envelope.type !== eventHeader) {
        throw new WebhookEventMismatchError(`Event type mismatch: header=${eventHeader}, body=${envelope.type}`);
    }
    if (envelope.delivery_id !== deliveryIdHeader) {
        throw new WebhookEventMismatchError(`Delivery ID mismatch: header=${deliveryIdHeader}, body=${envelope.delivery_id}`);
    }
    const expectedVersion = options.apiVersion ?? STOREFRONT_API_VERSION;
    if (apiVersionHeader && apiVersionHeader !== expectedVersion) {
    }
    const payloadResult = WebhookPayloadSchema.safeParse(envelope);
    if (!payloadResult.success) {
        throw new WebhookSchemaError(`Webhook payload does not match schema for type ${envelope.type}: ${payloadResult.error.message}`);
    }
    return { envelope, payload: payloadResult.data };
}
function getHeader(headers, name) {
    const value = headers[name.toLowerCase()] ?? headers[name];
    return firstHeader(value);
}
function firstHeader(value) {
    if (Array.isArray(value))
        return value[0];
    return value;
}
export function verifyWebhookFromRequest(rawBody, headers, options) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = value;
    }
    return verifyWebhook(rawBody, {
        [WEBHOOK_HEADERS.SIGNATURE]: getHeader(normalized, WEBHOOK_HEADERS.SIGNATURE),
        [WEBHOOK_HEADERS.EVENT]: getHeader(normalized, WEBHOOK_HEADERS.EVENT),
        [WEBHOOK_HEADERS.DELIVERY_ID]: getHeader(normalized, WEBHOOK_HEADERS.DELIVERY_ID),
        [WEBHOOK_HEADERS.TIMESTAMP]: getHeader(normalized, WEBHOOK_HEADERS.TIMESTAMP),
        [WEBHOOK_HEADERS.API_VERSION]: getHeader(normalized, WEBHOOK_HEADERS.API_VERSION),
    }, options);
}
export async function processWebhookDedup(rawBody, headers, options, dedupStore) {
    const verified = verifyWebhook(rawBody, headers, options);
    const { delivery_id: deliveryId } = verified.envelope;
    if (await dedupStore.has(deliveryId)) {
        await dedupStore.mark(deliveryId, 'skipped_duplicate');
        return null;
    }
    return verified;
}
function safeHexToBuffer(hex) {
    if (typeof hex !== 'string' || hex.length === 0)
        return null;
    if (hex.length % 2 !== 0)
        return null;
    if (!/^[0-9a-fA-F]+$/.test(hex))
        return null;
    return Buffer.from(hex, 'hex');
}
//# sourceMappingURL=webhook.js.map