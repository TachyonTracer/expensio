import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Authentication
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Email (optional)
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().min(1).optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // External APIs
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  EXCHANGE_RATE_BASE_URL: z.string().url().default('https://api.exchangerate-api.com/v4/latest'),
  COUNTRIES_API_URL: z.string().url().default('https://restcountries.com/v3.1/all?fields=name,currencies'),
  
  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(5242880), // 5MB
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/gif,application/pdf'),
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
}).superRefine((data, ctx) => {
  const smtpFields = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'] as const;

  const isAnySmtpValueProvided = smtpFields.some((field) => Boolean(data[field]));
  const isAllSmtpValuesProvided = smtpFields.every((field) => Boolean(data[field]));

  if (isAnySmtpValueProvided && !isAllSmtpValuesProvided) {
    smtpFields.forEach((field) => {
      if (!data[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'SMTP configuration incomplete. Please provide all SMTP variables or remove them entirely.',
        });
      }
    });
  }
});

export const env = envSchema.parse(process.env);