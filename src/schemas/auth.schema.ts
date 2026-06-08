import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Dirección de correo electrónico inválida')
    .min(1, 'El correo electrónico es requerido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no debe exceder 128 caracteres'),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no debe exceder 100 caracteres'),
    email: z
      .string()
      .email('Dirección de correo electrónico inválida')
      .min(1, 'El correo electrónico es requerido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(128, 'La contraseña no debe exceder 128 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
      ),
    confirmPassword: z.string().min(1, 'La confirmación de contraseña es requerida'),
    phone: z
      .string()
      .regex(/^\+?[0-9]{10,15}$/, 'Número de teléfono inválido')
      .optional(),
    documentId: z
      .string()
      .min(6, 'La cédula debe tener al menos 6 caracteres')
      .max(20, 'La cédula no debe exceder 20 caracteres')
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
