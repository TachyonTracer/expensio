import { z } from 'zod';

// User Types
export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Expense Types
export const ExpenseStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'REIMBURSED',
]);
export type ExpenseStatus = z.infer<typeof ExpenseStatusSchema>;

// Approval Types
export const ApprovalRuleTypeSchema = z.enum([
  'PERCENTAGE',
  'SPECIFIC_APPROVER',
  'HYBRID',
]);
export type ApprovalRuleType = z.infer<typeof ApprovalRuleTypeSchema>;

export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApproverTypeSchema = z.enum(['USER', 'ROLE']);
export type ApproverType = z.infer<typeof ApproverTypeSchema>;

// Data Transfer Objects
export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  baseCurrency: z.string().length(3, 'Currency code must be 3 characters'),
});
export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: UserRoleSchema,
  managerId: z.string().uuid().optional(),
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const CreateExpenseSchema = z.object({
  originalAmount: z.number().positive('Amount must be positive'),
  originalCurrency: z.string().length(3, 'Currency code must be 3 characters'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  expenseDate: z.date(),
});
export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>;

// Comprehensive Validation Schemas
export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  baseCurrency: z.string().length(3, 'Currency code must be 3 characters'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: UserRoleSchema,
  managerId: z.string().uuid().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  originalAmount: z.number().positive('Amount must be positive'),
  originalCurrency: z.string().length(3, 'Currency code must be 3 characters'),
  convertedAmount: z.number().positive('Converted amount must be positive'),
  baseCurrency: z.string().length(3, 'Currency code must be 3 characters'),
  exchangeRate: z.number().positive('Exchange rate must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  expenseDate: z.date(),
  status: ExpenseStatusSchema,
  receiptId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ReceiptSchema = z.object({
  id: z.string().uuid(),
  expenseId: z.string().uuid(),
  filePath: z.string().min(1, 'File path is required'),
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  ocrData: z.any().optional(),
  createdAt: z.date(),
});

export const ApprovalRuleConfigSchema = z.object({
  requiredPercentage: z.number().min(0).max(100).optional(),
  specificApprovers: z.array(z.string().uuid()).optional(),
  hybridRules: z
    .object({
      percentage: z.number().min(0).max(100),
      specificApprovers: z.array(z.string().uuid()),
    })
    .optional(),
});

export const ApprovalRuleSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1, 'Rule name is required'),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  category: z.string().optional(),
  ruleType: ApprovalRuleTypeSchema,
  ruleConfig: ApprovalRuleConfigSchema,
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ApprovalStepSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  stepOrder: z.number().int().positive(),
  approverId: z.string().uuid(),
  approverType: ApproverTypeSchema,
  isRequired: z.boolean(),
  createdAt: z.date(),
});

export const ApprovalSchema = z.object({
  id: z.string().uuid(),
  expenseId: z.string().uuid(),
  stepId: z.string().uuid(),
  approverId: z.string().uuid(),
  status: ApprovalStatusSchema,
  comments: z.string().optional(),
  approvedAt: z.date().optional(),
  createdAt: z.date(),
});

export const CurrencySchema = z.object({
  code: z.string().length(3, 'Currency code must be 3 characters'),
  name: z.string().min(1, 'Currency name is required'),
  symbol: z.string().min(1, 'Currency symbol is required'),
  exchangeRate: z.number().positive('Exchange rate must be positive'),
  lastUpdated: z.date(),
});

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

// Authentication Types
export interface JWTPayload {
  userId: string;
  companyId: string;
  role: UserRole;
  email: string;
}

// Currency Types
export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  timestamp: Date;
}

// OCR Types
export interface OCRResult {
  text: string;
  confidence: number;
  extractedData?: ExtractedExpenseData;
}

export interface ExtractedExpenseData {
  amount?: number;
  currency?: string;
  date?: Date;
  vendor?: string;
  category?: string;
  confidence: number;
}

// Database Entity Interfaces
export interface Company {
  id: string;
  name: string;
  country: string;
  baseCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  password: string;
  role: UserRole;
  managerId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  companyId: string;
  userId: string;
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  baseCurrency: string;
  exchangeRate: number;
  category: string;
  description: string;
  expenseDate: Date;
  status: ExpenseStatus;
  receiptId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receipt {
  id: string;
  expenseId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  ocrData?: any;
  createdAt: Date;
}

export interface ApprovalRule {
  id: string;
  companyId: string;
  name: string;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  ruleType: ApprovalRuleType;
  ruleConfig: ApprovalRuleConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRuleConfig {
  requiredPercentage?: number;
  specificApprovers?: string[];
  hybridRules?: {
    percentage: number;
    specificApprovers: string[];
  };
}

export interface ApprovalStep {
  id: string;
  ruleId: string;
  stepOrder: number;
  approverId: string;
  approverType: ApproverType;
  isRequired: boolean;
  createdAt: Date;
}

export interface Approval {
  id: string;
  expenseId: string;
  stepId: string;
  approverId: string;
  status: ApprovalStatus;
  comments?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  lastUpdated: Date;
}
// Update Schemas
export const UpdateCompanySchema = CreateCompanySchema.partial();
export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;

export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  role: UserRoleSchema.optional(),
  managerId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const UpdateExpenseSchema = z.object({
  originalAmount: z.number().positive('Amount must be positive').optional(),
  originalCurrency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .optional(),
  category: z.string().min(1, 'Category is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  expenseDate: z.date().optional(),
  status: ExpenseStatusSchema.optional(),
});
export type UpdateExpenseDto = z.infer<typeof UpdateExpenseSchema>;

export const CreateApprovalRuleSchema = z
  .object({
    name: z.string().min(1, 'Rule name is required'),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    category: z.string().optional(),
    ruleType: ApprovalRuleTypeSchema,
    ruleConfig: ApprovalRuleConfigSchema,
    isActive: z.boolean().optional(),
  })
  .refine(
    data => {
      // Ensure minAmount is less than maxAmount if both are provided
      if (
        data.minAmount &&
        data.maxAmount &&
        data.minAmount >= data.maxAmount
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Minimum amount must be less than maximum amount',
      path: ['minAmount'],
    }
  );
export type CreateApprovalRuleDto = z.infer<typeof CreateApprovalRuleSchema>;

export const UpdateApprovalRuleSchema = z
  .object({
    name: z.string().min(1, 'Rule name is required').optional(),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    category: z.string().optional(),
    ruleType: ApprovalRuleTypeSchema.optional(),
    ruleConfig: ApprovalRuleConfigSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    data => {
      // Ensure minAmount is less than maxAmount if both are provided
      if (
        data.minAmount &&
        data.maxAmount &&
        data.minAmount >= data.maxAmount
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Minimum amount must be less than maximum amount',
      path: ['minAmount'],
    }
  );
export type UpdateApprovalRuleDto = z.infer<typeof UpdateApprovalRuleSchema>;

// File Upload Validation
export const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.enum(
    ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    {
      errorMap: () => ({ message: 'File type must be JPEG, PNG, GIF, or PDF' }),
    }
  ),
  size: z.number().max(5242880, 'File size must be less than 5MB'),
});
export type FileUploadDto = z.infer<typeof FileUploadSchema>;

// Approval Decision Schema
export const ApprovalDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().optional(),
});
export type ApprovalDecisionDto = z.infer<typeof ApprovalDecisionSchema>;

// Query Schemas for filtering and pagination
export const ExpenseQuerySchema = z.object({
  status: ExpenseStatusSchema.optional(),
  category: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z
    .enum(['createdAt', 'expenseDate', 'originalAmount', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ExpenseQueryDto = z.infer<typeof ExpenseQuerySchema>;

export const UserQuerySchema = z.object({
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  managerId: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(['createdAt', 'email', 'role']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type UserQueryDto = z.infer<typeof UserQuerySchema>;

// Workflow Types
export interface ApprovalWorkflow {
  id: string;
  expenseId: string;
  steps: ApprovalStep[];
  currentStepIndex: number;
  isComplete: boolean;
  finalStatus?: 'APPROVED' | 'REJECTED';
}

export interface ApprovalResult {
  success: boolean;
  workflow: ApprovalWorkflow;
  nextApprovers?: User[];
  isWorkflowComplete: boolean;
  finalStatus?: 'APPROVED' | 'REJECTED';
}

// Dashboard Data Types
export interface EmployeeDashboardData {
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  rejectedExpenses: number;
  totalAmount: number;
  recentExpenses: Expense[];
}

export interface ManagerDashboardData {
  pendingApprovals: number;
  teamExpenses: number;
  monthlyTeamSpend: number;
  pendingExpensesList: Array<
    Expense & {
      user?: User;
      currentApproval?: {
        id: string;
        status: string;
        createdAt: Date;
      };
    }
  >;
  teamMembers: User[];
}

export interface AdminDashboardData {
  totalUsers: number;
  totalExpenses: number;
  monthlySpend: number;
  pendingApprovals: number;
  companyExpensesByCategory: Record<string, number>;
  monthlyExpenseTrend: Array<{ month: string; amount: number }>;
}

// Error Types
export interface ValidationErrorItem {
  field: string;
  message: string;
  code: string;
}

export interface BusinessRuleErrorData {
  rule: string;
  message: string;
  context?: Record<string, any>;
}

export class ValidationError extends Error {
  public errors: ValidationErrorItem[];

  constructor(data: { message: string; errors: ValidationErrorItem[] }) {
    super(data.message);
    this.name = 'ValidationError';
    this.errors = data.errors;
  }
}

export class BusinessRuleError extends Error {
  public rule: string;
  public context?: Record<string, any>;

  constructor(data: {
    rule: string;
    message: string;
    context?: Record<string, any>;
  }) {
    super(data.message);
    this.name = 'BusinessRuleError';
    this.rule = data.rule;
    this.context = data.context;
  }
}
