import { z } from 'zod';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .refine((value) => emailPattern.test(value), 'validation.email'),
  password: z.string().min(1, 'validation.required'),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'validation.required')
      .refine((value) => emailPattern.test(value), 'validation.email'),
    password: z.string().min(8, 'validation.minPassword'),
    confirmPassword: z.string().min(1, 'validation.required'),
    acceptTerms: z.boolean().refine((value) => value === true, 'auth.acceptTermsError'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordMatch',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .refine((value) => emailPattern.test(value), 'validation.email'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.required'),
    newPassword: z.string().min(8, 'validation.minPassword'),
    confirmPassword: z.string().min(1, 'validation.required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'validation.passwordMatch',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'auth.passwordUnchanged',
    path: ['newPassword'],
  });

export const vehicleSchema = z.object({
  nickname: z.string().trim().min(1, 'validation.required'),
  make: z.string().trim().min(1, 'validation.required'),
  model: z.string().trim().min(1, 'validation.required'),
  year: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .refine((value) => {
      const year = Number(value);
      return Number.isInteger(year) && year >= 1980 && year <= 2035;
    }, 'validation.year'),
  current_odometer: z.string().min(1, 'validation.odometer'),
  distance_unit: z.enum(['km', 'mi']),
  plate: z.string().trim().optional(),
  notes: z.string().optional(),
});

export const odometerSchema = z.object({
  vehicle_id: z.string().min(1, 'validation.required'),
  reading: z.string().min(1, 'validation.odometer'),
  recorded_on: z
    .string()
    .min(1, 'validation.required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date'),
  recorded_time: z
    .string()
    .min(1, 'validation.required')
    .regex(/^\d{2}:\d{2}$/, 'validation.time'),
  kind: z.enum(['start_of_day', 'end_of_day', 'manual']),
  unit: z.enum(['km', 'mi']),
  notes: z.string().optional(),
  saveDespiteInvalid: z.boolean().optional(),
});

const optionalAmount = z
  .string()
  .optional()
  .refine((value) => !value || value.trim() === '' || /^-?\d+([.,]\d+)?$/.test(value.trim()), 'validation.positive');

export const receiptReviewSchema = z.object({
  vendor_name: z.string().trim().min(1, 'validation.required'),
  amount: z.string().min(1, 'validation.positive'),
  subtotal: optionalAmount,
  tax_amount: optionalAmount,
  category_id: z.string().min(1, 'validation.required'),
  incurred_on: z
    .string()
    .min(1, 'validation.required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date'),
  incurred_time: z
    .string()
    .optional()
    .refine((value) => !value || value.trim() === '' || /^\d{2}:\d{2}$/.test(value), 'validation.time'),
  currency: z.string().min(1, 'validation.required'),
  vehicle_id: z.string().optional(),
  fuel_quantity: optionalAmount,
  price_per_unit: optionalAmount,
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseSchema = receiptReviewSchema;

export const incomeSchema = z.object({
  source_name: z.string().trim().min(1, 'validation.required'),
  amount: z.string().min(1, 'validation.positive'),
  received_on: z.string().min(1, 'validation.required'),
  source_kind: z.enum(['platform', 'invoice', 'cash', 'other']),
  category_id: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

export const onboardingSchema = z.object({
  full_name: z.string().trim().min(1, 'validation.required'),
  occupancy: z.string().min(1, 'validation.required'),
  country_code: z.string().min(1, 'validation.required'),
  jurisdiction_id: z.string().min(1, 'validation.required'),
  default_distance_unit: z.enum(['km', 'mi']),
  default_currency: z.string().min(1, 'validation.required'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type VehicleValues = z.infer<typeof vehicleSchema>;
export type OdometerValues = z.infer<typeof odometerSchema>;
export type ExpenseValues = z.infer<typeof expenseSchema>;
export type ReceiptReviewValues = z.infer<typeof receiptReviewSchema>;
export type IncomeValues = z.infer<typeof incomeSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;
