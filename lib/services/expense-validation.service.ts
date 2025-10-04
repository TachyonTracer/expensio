import { z } from 'zod';
import { db } from '../db';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseStatus, UserRole } from '../types';
import { API_ERROR_CODES } from '../constants';
import { currencyService } from './currency.service';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface BusinessRuleContext {
  userId: string;
  companyId: string;
  userRole: UserRole;
  existingExpense?: any;
}

export class ExpenseValidationService {
  /**
   * Validate expense data against business rules
   */
  async validateExpense(
    expenseData: CreateExpenseDto | UpdateExpenseDto,
    context: BusinessRuleContext,
    isUpdate: boolean = false
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic schema validation
      const schemaErrors = await this.validateSchema(expenseData, isUpdate);
      errors.push(...schemaErrors);

      // Business rule validations
      const businessRuleErrors = await this.validateBusinessRules(expenseData, context, isUpdate);
      errors.push(...businessRuleErrors.errors);
      warnings.push(...businessRuleErrors.warnings);

      // Currency validation
      if ('originalCurrency' in expenseData && expenseData.originalCurrency) {
        const currencyErrors = await this.validateCurrency(expenseData.originalCurrency);
        errors.push(...currencyErrors);
      }

      // Amount validation
      if ('originalAmount' in expenseData && expenseData.originalAmount) {
        const amountErrors = await this.validateAmount(expenseData.originalAmount, context);
        errors.push(...amountErrors.errors);
        warnings.push(...amountErrors.warnings);
      }

      // Date validation
      if ('expenseDate' in expenseData && expenseData.expenseDate) {
        const dateErrors = await this.validateExpenseDate(expenseData.expenseDate, context);
        errors.push(...dateErrors.errors);
        warnings.push(...dateErrors.warnings);
      }

      // Category validation
      if ('category' in expenseData && expenseData.category) {
        const categoryWarnings = await this.validateCategory(expenseData.category, context);
        warnings.push(...categoryWarnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error validating expense:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during validation',
          severity: 'error',
        }],
        warnings: [],
      };
    }
  }

  /**
   * Validate expense schema
   */
  private async validateSchema(
    expenseData: CreateExpenseDto | UpdateExpenseDto,
    isUpdate: boolean
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      if (isUpdate) {
        // For updates, all fields are optional
        const updateSchema = z.object({
          originalAmount: z.number().positive().optional(),
          originalCurrency: z.string().length(3).optional(),
          category: z.string().min(1).optional(),
          description: z.string().min(1).optional(),
          expenseDate: z.date().optional(),
          status: z.enum(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
        });
        updateSchema.parse(expenseData);
      } else {
        // For creation, required fields must be present
        const createSchema = z.object({
          originalAmount: z.number().positive('Amount must be positive'),
          originalCurrency: z.string().length(3, 'Currency code must be 3 characters'),
          category: z.string().min(1, 'Category is required'),
          description: z.string().min(1, 'Description is required'),
          expenseDate: z.date(),
        });
        createSchema.parse(expenseData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => ({
          field: err.path.join('.'),
          code: 'SCHEMA_VALIDATION_ERROR',
          message: err.message,
          severity: 'error' as const,
        })));
      }
    }

    return errors;
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    expenseData: CreateExpenseDto | UpdateExpenseDto,
    context: BusinessRuleContext,
    isUpdate: boolean
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if user can create/edit expenses
    if (!isUpdate && context.userRole === 'ADMIN') {
      // Admins can create expenses for others, but warn them
      warnings.push({
        field: 'general',
        code: 'ADMIN_CREATING_EXPENSE',
        message: 'Creating expense as admin - ensure this is intended',
        suggestion: 'Consider creating expenses through the appropriate user account',
      });
    }

    // Check expense limits based on company policies
    if ('originalAmount' in expenseData && expenseData.originalAmount) {
      const limitErrors = await this.checkExpenseLimits(expenseData.originalAmount, context);
      errors.push(...limitErrors.errors);
      warnings.push(...limitErrors.warnings);
    }

    // Check for duplicate expenses
    if (!isUpdate) {
      const duplicateWarnings = await this.checkDuplicateExpenses(expenseData as CreateExpenseDto, context);
      warnings.push(...duplicateWarnings);
    }

    // Validate status transitions for updates
    if (isUpdate && 'status' in expenseData && expenseData.status && context.existingExpense) {
      const statusErrors = await this.validateStatusTransition(
        context.existingExpense.status,
        expenseData.status,
        context
      );
      errors.push(...statusErrors);
    }

    return { errors, warnings };
  }

  /**
   * Validate currency code
   */
  private async validateCurrency(currencyCode: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      const currency = await currencyService.getCurrency(currencyCode);
      if (!currency) {
        errors.push({
          field: 'originalCurrency',
          code: 'INVALID_CURRENCY',
          message: `Currency ${currencyCode} is not supported`,
          severity: 'error',
        });
      }
    } catch (error) {
      errors.push({
        field: 'originalCurrency',
        code: 'CURRENCY_VALIDATION_ERROR',
        message: 'Unable to validate currency',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate expense amount
   */
  private async validateAmount(
    amount: number,
    context: BusinessRuleContext
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check minimum amount
    if (amount < 0.01) {
      errors.push({
        field: 'originalAmount',
        code: 'AMOUNT_TOO_SMALL',
        message: 'Amount must be at least 0.01',
        severity: 'error',
      });
    }

    // Check maximum amount (configurable per company)
    const MAX_EXPENSE_AMOUNT = 10000; // This could be fetched from company settings
    if (amount > MAX_EXPENSE_AMOUNT) {
      warnings.push({
        field: 'originalAmount',
        code: 'LARGE_AMOUNT',
        message: `Amount ${amount} is unusually large`,
        suggestion: 'Large expenses may require additional approval steps',
      });
    }

    // Check for round numbers (potential fraud indicator)
    if (amount % 1 === 0 && amount >= 100) {
      warnings.push({
        field: 'originalAmount',
        code: 'ROUND_AMOUNT',
        message: 'Round amounts may require additional documentation',
        suggestion: 'Ensure receipt is attached for verification',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate expense date
   */
  private async validateExpenseDate(
    expenseDate: Date,
    context: BusinessRuleContext
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check if date is in the future
    if (expenseDate > now) {
      errors.push({
        field: 'expenseDate',
        code: 'FUTURE_DATE',
        message: 'Expense date cannot be in the future',
        severity: 'error',
      });
    }

    // Check if date is too old
    const MAX_DAYS_OLD = 90; // Configurable per company
    if (daysDiff > MAX_DAYS_OLD) {
      warnings.push({
        field: 'expenseDate',
        code: 'OLD_EXPENSE',
        message: `Expense is ${daysDiff} days old`,
        suggestion: 'Old expenses may require additional justification',
      });
    }

    // Check if date is on weekend (for certain categories)
    const dayOfWeek = expenseDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push({
        field: 'expenseDate',
        code: 'WEEKEND_EXPENSE',
        message: 'Expense occurred on weekend',
        suggestion: 'Weekend expenses may require additional documentation',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate expense category
   */
  private async validateCategory(
    category: string,
    context: BusinessRuleContext
  ): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // Check if category is commonly used
    const categoryUsage = await db.expense.count({
      where: {
        companyId: context.companyId,
        category: {
          equals: category,
          mode: 'insensitive',
        },
      },
    });

    if (categoryUsage === 0) {
      warnings.push({
        field: 'category',
        code: 'NEW_CATEGORY',
        message: `Category "${category}" hasn't been used before`,
        suggestion: 'Verify category spelling and appropriateness',
      });
    }

    return warnings;
  }

  /**
   * Check expense limits
   */
  private async checkExpenseLimits(
    amount: number,
    context: BusinessRuleContext
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get user's monthly expense total
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyTotal = await db.expense.aggregate({
      where: {
        userId: context.userId,
        companyId: context.companyId,
        expenseDate: {
          gte: startOfMonth,
        },
        status: {
          not: 'REJECTED',
        },
      },
      _sum: {
        convertedAmount: true,
      },
    });

    const currentMonthlyTotal = Number(monthlyTotal._sum.convertedAmount || 0);
    const MONTHLY_LIMIT = 5000; // This could be fetched from user/company settings

    if (currentMonthlyTotal + amount > MONTHLY_LIMIT) {
      warnings.push({
        field: 'originalAmount',
        code: 'MONTHLY_LIMIT_EXCEEDED',
        message: `This expense would exceed monthly limit of ${MONTHLY_LIMIT}`,
        suggestion: 'Consider splitting large expenses or getting pre-approval',
      });
    }

    return { errors, warnings };
  }

  /**
   * Check for duplicate expenses
   */
  private async checkDuplicateExpenses(
    expenseData: CreateExpenseDto,
    context: BusinessRuleContext
  ): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // Look for similar expenses in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const similarExpenses = await db.expense.findMany({
      where: {
        userId: context.userId,
        companyId: context.companyId,
        originalAmount: expenseData.originalAmount,
        category: expenseData.category,
        expenseDate: {
          gte: thirtyDaysAgo,
        },
      },
      take: 1,
    });

    if (similarExpenses.length > 0) {
      warnings.push({
        field: 'general',
        code: 'POTENTIAL_DUPLICATE',
        message: 'Similar expense found in the last 30 days',
        suggestion: 'Verify this is not a duplicate submission',
      });
    }

    return warnings;
  }

  /**
   * Validate status transitions
   */
  private async validateStatusTransition(
    currentStatus: ExpenseStatus,
    newStatus: ExpenseStatus,
    context: BusinessRuleContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Define valid status transitions
    const validTransitions: Record<ExpenseStatus, ExpenseStatus[]> = {
      DRAFT: ['SUBMITTED'],
      SUBMITTED: ['PENDING_APPROVAL', 'DRAFT'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
      APPROVED: ['REIMBURSED'],
      REJECTED: ['DRAFT', 'SUBMITTED'],
      REIMBURSED: [], // Final state
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus].includes(newStatus)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot change status from ${currentStatus} to ${newStatus}`,
        severity: 'error',
      });
    }

    // Check role permissions for status changes
    if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
      if (context.userRole === 'EMPLOYEE') {
        errors.push({
          field: 'status',
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Employees cannot approve or reject expenses',
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * Get validation rules summary for a company
   */
  async getValidationRules(companyId: string): Promise<{
    maxAmount: number;
    monthlyLimit: number;
    maxDaysOld: number;
    requiredFields: string[];
    supportedCurrencies: string[];
  }> {
    try {
      const currencies = await currencyService.getAllCurrencies();
      
      return {
        maxAmount: 10000,
        monthlyLimit: 5000,
        maxDaysOld: 90,
        requiredFields: ['originalAmount', 'originalCurrency', 'category', 'description', 'expenseDate'],
        supportedCurrencies: currencies.map(c => c.code),
      };
    } catch (error) {
      console.error('Error getting validation rules:', error);
      throw new Error(`${API_ERROR_CODES.DATABASE_ERROR}: Failed to get validation rules`);
    }
  }
}

// Export singleton instance
export const expenseValidationService = new ExpenseValidationService();