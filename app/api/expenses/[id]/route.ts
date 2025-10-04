import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { UpdateExpenseSchema } from '@/lib/types';
import { currencyConversionService } from '@/lib/services/currency-conversion.service';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/expenses/[id] - Get single expense
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const expense = await db.expense.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        receipt: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            filePath: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
            step: {
              select: {
                id: true,
                stepOrder: true,
                isRequired: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }),
        { status: 404 }
      );
    }

    // Check access permissions
    if (user.role === 'EMPLOYEE' && expense.userId !== user.userId) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Access denied' }),
        { status: 403 }
      );
    }

    if (user.role === 'MANAGER') {
      // Check if expense belongs to user or their team
      const isTeamMember = await db.user.findFirst({
        where: {
          id: expense.userId,
          companyId: user.companyId,
          OR: [
            { id: user.userId },
            { managerId: user.userId },
          ],
        },
      });

      if (!isTeamMember) {
        return NextResponse.json(
          createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Access denied' }),
          { status: 403 }
        );
      }
    }

    return NextResponse.json(createApiResponse(true, expense));
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/expenses/[id] - Update expense
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateData = UpdateExpenseSchema.parse(body);

    // Find existing expense
    const existingExpense = await db.expense.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }),
        { status: 404 }
      );
    }

    // Check permissions - only expense owner can edit (unless admin)
    if (user.role !== 'ADMIN' && existingExpense.userId !== user.userId) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Only expense owner can edit' }),
        { status: 403 }
      );
    }

    // Check if expense can be edited (not in final states)
    if (['APPROVED', 'REJECTED', 'REIMBURSED'].includes(existingExpense.status)) {
      return NextResponse.json(
        createApiResponse(false, null, { 
          code: 'EXPENSE_LOCKED', 
          message: 'Cannot edit expense in current status' 
        }),
        { status: 400 }
      );
    }

    // Prepare update data
    const updatePayload: any = { ...updateData };

    // Handle currency conversion if amount or currency changed
    if (updateData.originalAmount || updateData.originalCurrency) {
      const company = await db.company.findUnique({
        where: { id: user.companyId },
        select: { baseCurrency: true },
      });

      if (!company) {
        return NextResponse.json(
          createApiResponse(false, null, { code: 'COMPANY_NOT_FOUND', message: 'Company not found' }),
          { status: 404 }
        );
      }

      const newAmount = updateData.originalAmount ?? existingExpense.originalAmount;
      const newCurrency = updateData.originalCurrency ?? existingExpense.originalCurrency;

      let convertedAmount = Number(newAmount);
      let exchangeRate = 1;

      if (newCurrency !== company.baseCurrency) {
        const conversionResult = await currencyConversionService.convertAmount(
          Number(newAmount),
          newCurrency,
          company.baseCurrency
        );
        convertedAmount = conversionResult.convertedAmount;
        exchangeRate = conversionResult.exchangeRate;
      }

      updatePayload.convertedAmount = convertedAmount;
      updatePayload.exchangeRate = exchangeRate;
      updatePayload.baseCurrency = company.baseCurrency;
    }

    // Update expense
    const updatedExpense = await db.expense.update({
      where: { id: params.id },
      data: updatePayload,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        receipt: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return NextResponse.json(createApiResponse(true, updatedExpense));
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    // Find existing expense
    const existingExpense = await db.expense.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }),
        { status: 404 }
      );
    }

    // Check permissions - only expense owner or admin can delete
    if (user.role !== 'ADMIN' && existingExpense.userId !== user.userId) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Access denied' }),
        { status: 403 }
      );
    }

    // Check if expense can be deleted (not in final states)
    if (['APPROVED', 'REIMBURSED'].includes(existingExpense.status)) {
      return NextResponse.json(
        createApiResponse(false, null, { 
          code: 'EXPENSE_LOCKED', 
          message: 'Cannot delete approved or reimbursed expense' 
        }),
        { status: 400 }
      );
    }

    // Delete expense (cascade will handle related records)
    await db.expense.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      createApiResponse(true, { message: 'Expense deleted successfully' })
    );
  } catch (error) {
    return handleApiError(error);
  }
}