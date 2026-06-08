import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z
    .string()
    .min(1, 'La etiqueta es requerida')
    .max(50, 'La etiqueta no debe exceder 50 caracteres'),
  recipientName: z
    .string()
    .min(2, 'El nombre del destinatario es requerido')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  recipientPhone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Número de teléfono inválido'),
  streetAddress: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(300, 'La dirección no debe exceder 300 caracteres'),
  additionalInfo: z.string().max(200).optional(),
  city: z
    .string()
    .min(2, 'La ciudad es requerida')
    .max(100, 'La ciudad no debe exceder 100 caracteres'),
  state: z
    .string()
    .min(2, 'El estado es requerido')
    .max(100, 'El estado no debe exceder 100 caracteres'),
  zipCode: z.string().max(10).optional(),
  country: z.string().default('Venezuela'),
  isDefault: z.boolean().default(false),
  notes: z.string().max(300, 'Las notas no deben exceder 300 caracteres').optional(),
});

export const updateAddressSchema = z.object({
  id: z.string().min(1, 'El ID de la dirección es requerido'),
  label: z.string().min(1).max(50).optional(),
  recipientName: z.string().min(2).max(100).optional(),
  recipientPhone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  streetAddress: z.string().min(5).max(300).optional(),
  additionalInfo: z.string().max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  zipCode: z.string().max(10).optional(),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
  notes: z.string().max(300).optional(),
});

export const deleteAddressSchema = z.object({
  id: z.string().min(1, 'El ID de la dirección es requerido'),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type DeleteAddressInput = z.infer<typeof deleteAddressSchema>;
