import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no debe exceder 100 caracteres')
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Número de teléfono inválido')
    .optional(),
  documentId: z
    .string()
    .min(6, 'La cédula debe tener al menos 6 caracteres')
    .max(20, 'La cédula no debe exceder 20 caracteres')
    .optional(),
  avatarUrl: z.string().url('URL de avatar inválida').optional(),
  preferredCurrency: z.enum(['USD', 'BS']).optional(),
});

export const customerAddressSchema = z.object({
  label: z
    .string()
    .min(1, 'La etiqueta es requerida')
    .max(50, 'La etiqueta no debe exceder 50 caracteres'),
  recipientName: z.string().min(2, 'El nombre del destinatario es requerido').max(100),
  recipientPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Teléfono inválido'),
  streetAddress: z.string().min(5, 'La dirección es requerida').max(300),
  city: z.string().min(2, 'La ciudad es requerida').max(100),
  state: z.string().min(2, 'El estado es requerido').max(100),
  zipCode: z.string().max(10).optional(),
  country: z.string().default('Venezuela'),
  isDefault: z.boolean().default(false),
  notes: z.string().max(300).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
