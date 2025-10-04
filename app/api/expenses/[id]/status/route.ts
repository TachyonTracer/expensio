import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { expenseValidationService } from '@/lib/services/expense-validation.service';
import { ExpenseStatusSchema } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

const StatusUpdateSchema = z.object({
  status: ExpenseStatusSchema,
  comments: z.string().optional(),
});

// PUT /api/expenses/[id]/status - Update expense status
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
    const { status, comments } = StatusUpdateSchema.parse(body);

    // Find existing expense
    const existingExpense = await db.expense.findFirst({
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
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }),
        { status: 404 }
      );
    }

    // Validate status transition
    const validationResult = await expenseValidationService.validateExpense(
      { status },
      {
        userId: user.userId,
        companyId: user.companyId,
        userRole: user.role,
        existingExpense,
      },
      true
    );

    if (!validationResult.isValid) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Status update validation failed',
          details: {
            errors: validationResult.errors,
            warnings: validationResult.warnings,
          },
        }),
        { status: 400 }
      );
    }

    // Check permissions for specific status changes
    if (status === 'APPROVED' || status === 'REJECTED') {
      if (user.role === 'EMPLOYEE') {
        return NextResponse.json(
          createApiResponse(false, null, { 
            code: 'FORBIDDEN', 
            message: 'Employees cannot approve or reject expenses' 
          }),
          { status: 403 }
        );
      }

      // Managers can only approve/reject their team's expenses
      if (user.role === 'MANAGER') {
        const isTeamMember = await db.user.findFirst({
          where: {
            id: existingExpense.userId,
            companyId: user.companyId,
            OR: [
              { id: user.userId },
              { managerId: user.userId },
            ],
          },
        });

        if (!isTeamMember) {
          return NextResponse.json(
            createApiResponse(false, null, { 
              code: 'FORBIDDEN', 
              message: 'Can only approve/reject your own or team member expenses' 
            }),
            { status: 403 }
          );
        }
      }
    }

    // Update expense status
    const updatedExpense = await db.expense.update({
      where: { id: params.id },
      data: {
        status,
        updatedAt: new Date(),
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

    // Log status change for audit trail
    console.log(`Expense ${params.id} status changed from ${existingExpense.status} to ${status} by user ${user.userId}`);

    // TODO: Send notification to expense owner if status changed by someone else
    // TODO: Trigger approval workflow if status is SUBMITTED

    return NextResponse.json(
      createApiResponse(true, {
        expense: updatedExpense,
        statusChange: {
          from: existingExpense.status,
          to: status,
          changedBy: user.userId,
          comments,
          timestamp: new Date(),
        },
        warnings: validationResult.warnings,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}