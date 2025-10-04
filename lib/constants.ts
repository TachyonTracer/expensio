// User Role Constants
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

// Expense Status Constants
export const EXPENSE_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REIMBURSED: 'REIMBURSED',
} as const;

// Approval Rule Type Constants
export const APPROVAL_RULE_TYPES = {
  PERCENTAGE: 'PERCENTAGE',
  SPECIFIC_APPROVER: 'SPECIFIC_APPROVER',
  HYBRID: 'HYBRID',
} as const;

// Approval Status Constants
export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

// Approver Type Constants
export const APPROVER_TYPES = {
  USER: 'USER',
  ROLE: 'ROLE',
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 5242880, // 5MB in bytes
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ],
  UPLOAD_DIR: './uploads',
} as const;

// Currency Constants
export const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW',
] as const;

// Expense Categories
export const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals & Entertainment',
  'Office Supplies',
  'Software & Subscriptions',
  'Marketing',
  'Training & Education',
  'Equipment',
  'Utilities',
  'Professional Services',
  'Other',
] as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// API Response Codes
export const API_ERROR_CODES = {
  // Authentication Errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CURRENCY_API_ERROR: 'CURRENCY_API_ERROR',
  OCR_PROCESSING_ERROR: 'OCR_PROCESSING_ERROR',
  
  // File Upload Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  
  // Database Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  
  // General Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// JWT Constants
export const JWT = {
  DEFAULT_EXPIRES_IN: '1h',
  REFRESH_EXPIRES_IN: '7d',
  ALGORITHM: 'HS256',
} as const;

// Email Templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  EXPENSE_SUBMITTED: 'expense-submitted',
  EXPENSE_APPROVED: 'expense-approved',
  EXPENSE_REJECTED: 'expense-rejected',
  APPROVAL_REQUIRED: 'approval-required',
} as const;

// External API URLs
export const EXTERNAL_APIS = {
  COUNTRIES: 'https://restcountries.com/v3.1/all?fields=name,currencies',
  EXCHANGE_RATES: 'https://api.exchangerate-api.com/v4/latest',
} as const;

// Cache Keys
export const CACHE_KEYS = {
  EXCHANGE_RATES: 'exchange_rates',
  COUNTRIES: 'countries',
  USER_PERMISSIONS: 'user_permissions',
  COMPANY_SETTINGS: 'company_settings',
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  EXCHANGE_RATES: 3600, // 1 hour
  COUNTRIES: 86400, // 24 hours
  USER_PERMISSIONS: 1800, // 30 minutes
  COMPANY_SETTINGS: 3600, // 1 hour
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  COMPANY_NAME_MIN_LENGTH: 1,
  DESCRIPTION_MIN_LENGTH: 1,
  CURRENCY_CODE_LENGTH: 3,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Security Constants
export const SECURITY = {
  BCRYPT_SALT_ROUNDS: 12,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Database Indexes (for reference)
export const DATABASE_INDEXES = {
  COMPANIES: ['country', 'createdAt'],
  USERS: ['companyId', 'role', 'managerId', 'isActive', 'companyId_role'],
  EXPENSES: ['companyId', 'userId', 'status', 'category', 'expenseDate', 'companyId_status', 'userId_status', 'companyId_expenseDate'],
  RECEIPTS: ['mimeType', 'createdAt'],
  APPROVAL_RULES: ['companyId', 'isActive', 'ruleType', 'category', 'companyId_isActive'],
  APPROVAL_STEPS: ['ruleId', 'approverId', 'stepOrder', 'ruleId_stepOrder'],
  APPROVALS: ['expenseId', 'stepId', 'approverId', 'status', 'expenseId_status', 'approverId_status'],
  CURRENCIES: ['lastUpdated'],
} as const;