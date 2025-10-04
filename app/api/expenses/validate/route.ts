import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { expenseValidationService } from '@/lib/services/expense-validation.service';
import { CreateExpenseSchema, UpdateExpenseSchema } from '@/lib/types';

// POST /api/expenses/validate - Validate expense data
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { expenseData, isUpdate = false, expenseId } = body;

    // Parse expense data based on whether it's an update or creation
    let parsedData;
    try {
      if (isUpdate) {
        parsedData = UpdateExpenseSchema.parse(expenseData);
      } else {
        parsedData = CreateExpenseSchema.parse(expenseData);
      }
    } catch (error) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'SCHEMA_VALIDATION_ERROR',
          message: 'Invalid expense data format',
          details: error,
        }),
        { status: 400 }
      );
    }

    // Get existing expense if this is an update
    let existingExpense = null;
    if (isUpdate && expenseId) {
      existingExpense = await db.expense.findFirst({
        where: {
          id: expenseId,
          companyId: user.companyId,
        },
      });

      if (!existingExpense) {
        return NextResponse.json(
          createApiResponse(false, null, { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }),
          { status: 404 }
        );
      }
    }

    // Validate expense
    const validationResult = await expenseValidationService.validateExpense(
      parsedData,
      {
        userId: user.userId,
        companyId: user.companyId,
        userRole: user.role,
        existingExpense,
      },
      isUpdate
    );

    return NextResponse.json(
      createApiResponse(true, {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        canSubmit: validationResult.isValid && validationResult.errors.length === 0,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/expenses/validate/rules - Get validation rules for the company
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const validationRules = await expenseValidationService.getValidationRules(user.companyId);

    return NextResponse.json(
      createApiResponse(true, validationRules)
    );
  } catch (error) {
    return handleApiError(error);
  }
}