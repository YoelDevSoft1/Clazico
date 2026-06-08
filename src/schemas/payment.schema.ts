import { z } from 'zod';

export const submitPaymentSchema = z.object({
  orderId: z.string().min(1, 'El ID del pedido es requerido'),
  method: z.enum([
    'pago_movil',
    'transferencia',
    'zelle',
    'efectivo_usd',
    'punto_venta',
  ]),
  reference: z
    .string()
    .min(1, 'La referencia de pago es requerida')
    .max(100, 'La referencia no debe exceder 100 caracteres'),
  amountUsd: z.number().positive('El monto USD debe ser mayor a 0'),
  amountBs: z.number().positive('El monto Bs debe ser mayor a 0'),
  exchangeRate: z.number().positive('La tasa de cambio debe ser positiva'),
  bankName: z.string().max(100).optional(),
  accountLastFour: z
    .string()
    .length(4, 'Debe ser los últimos 4 dígitos')
    .regex(/^\d{4}$/, 'Solo dígitos permitidos')
    .optional(),
  payerName: z.string().max(200).optional(),
  payerDocumentId: z.string().max(20).optional(),
  payerPhone: z.string().max(20).optional(),
  proofImageUrl: z.string().url('URL de comprobante inválida').optional(),
  notes: z.string().max(500).optional(),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1, 'El ID del pago es requerido'),
  verifiedAmountUsd: z.number().positive().optional(),
  verifiedAmountBs: z.number().positive().optional(),
  adminNotes: z.string().max(500).optional(),
});

export const rejectPaymentSchema = z.object({
  paymentId: z.string().min(1, 'El ID del pago es requerido'),
  reason: z.string().min(1, 'El motivo de rechazo es requerido').max(500),
});

export const listPaymentsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  status: z.enum(['pending', 'verified', 'rejected']).optional(),
  orderId: z.string().optional(),
  method: z
    .enum(['pago_movil', 'transferencia', 'zelle', 'efectivo_usd', 'punto_venta'])
    .optional(),
});

export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;
