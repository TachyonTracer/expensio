import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/expenses/[id]/tracking - Get detailed expense tracking information
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
            createdAt: true,
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

    // Generate timeline of expense events
    const timeline = await generateExpenseTimeline(expense);

    // Calculate approval progress
    const approvalProgress = calculateApprovalProgress(expense);

    // Get next actions
    const nextActions = getNextActions(expense, user);

    return NextResponse.json(
      createApiResponse(true, {
        expense: {
          id: expense.id,
          status: expense.status,
          originalAmount: expense.originalAmount,
          originalCurrency: expense.originalCurrency,
          convertedAmount: expense.convertedAmount,
          baseCurrency: expense.baseCurrency,
          category: expense.category,
          description: expense.description,
          expenseDate: expense.expenseDate,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
          user: expense.user,
          receipt: expense.receipt,
        },
        timeline,
        approvalProgress,
        nextActions,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Generate timeline of expense events
async function generateExpenseTimeline(expense: any) {
  const timeline = [];

  // Expense created
  timeline.push({
    event: 'CREATED',
    timestamp: expense.createdAt,
    description: 'Expense created',
    actor: expense.user,
    status: 'DRAFT',
  });

  // Receipt uploaded (if exists)
  if (expense.receipt) {
    timeline.push({
      event: 'RECEIPT_UPLOADED',
      timestamp: expense.receipt.createdAt,
      description: `Receipt uploaded: ${expense.receipt.fileName}`,
      actor: expense.user,
      status: 'DRAFT',
    });
  }

  // Expense submitted (inferred from status)
  if (expense.status !== 'DRAFT') {
    timeline.push({
      event: 'SUBMITTED',
      timestamp: expense.updatedAt, // This is approximate
      description: 'Expense submitted for approval',
      actor: expense.user,
      status: 'SUBMITTED',
    });
  }

  // Approval events
  expense.approvals.forEach((approval: any) => {
    timeline.push({
      event: approval.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      timestamp: approval.approvedAt || approval.createdAt,
      description: approval.status === 'APPROVED' 
        ? `Approved by ${approval.approver.email}`
        : `Rejected by ${approval.approver.email}`,
      actor: approval.approver,
      status: approval.status,
      comments: approval.comments,
    });
  });

  // Final status events
  if (expense.status === 'REIMBURSED') {
    timeline.push({
      event: 'REIMBURSED',
      timestamp: expense.updatedAt,
      description: 'Expense reimbursed',
      status: 'REIMBURSED',
    });
  }

  // Sort timeline by timestamp
  return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Calculate approval progress
function calculateApprovalProgress(expense: any) {
  const totalApprovals = expense.approvals.length;
  const completedApprovals = expense.approvals.filter((a: any) => 
    a.status === 'APPROVED' || a.status === 'REJECTED'
  ).length;

  const approvedCount = expense.approvals.filter((a: any) => a.status === 'APPROVED').length;
  const rejectedCount = expense.approvals.filter((a: any) => a.status === 'REJECTED').length;
  const pendingCount = expense.approvals.filter((a: any) => a.status === 'PENDING').length;

  return {
    totalSteps: totalApprovals,
    completedSteps: completedApprovals,
    approvedSteps: approvedCount,
    rejectedSteps: rejectedCount,
    pendingSteps: pendingCount,
    progressPercentage: totalApprovals > 0 ? Math.round((completedApprovals / totalApprovals) * 100) : 0,
    isComplete: expense.status === 'APPROVED' || expense.status === 'REJECTED' || expense.status === 'REIMBURSED',
    currentStatus: expense.status,
  };
}

// Get next possible actions for the user
function getNextActions(expense: any, user: any) {
  const actions = [];

  switch (expense.status) {
    case 'DRAFT':
      if (expense.userId === user.userId) {
        actions.push({
          action: 'SUBMIT',
          label: 'Submit for Approval',
          description: 'Submit this expense for approval',
          endpoint: `/api/expenses/${expense.id}/status`,
          method: 'PUT',
          payload: { status: 'SUBMITTED' },
        });
        actions.push({
          action: 'EDIT',
          label: 'Edit Expense',
          description: 'Modify expense details',
          endpoint: `/api/expenses/${expense.id}`,
          method: 'PUT',
        });
        actions.push({
          action: 'DELETE',
          label: 'Delete Expense',
          description: 'Delete this expense',
          endpoint: `/api/expenses/${expense.id}`,
          method: 'DELETE',
        });
      }
      break;

    case 'SUBMITTED':
    case 'PENDING_APPROVAL':
      // Check if user can approve
      const canApprove = (user.role === 'MANAGER' || user.role === 'ADMIN') && 
                        expense.userId !== user.userId;
      
      if (canApprove) {
        actions.push({
          action: 'APPROVE',
          label: 'Approve',
          description: 'Approve this expense',
          endpoint: `/api/expenses/${expense.id}/status`,
          method: 'PUT',
          payload: { status: 'APPROVED' },
        });
        actions.push({
          action: 'REJECT',
          label: 'Reject',
          description: 'Reject this expense',
          endpoint: `/api/expenses/${expense.id}/status`,
          method: 'PUT',
          payload: { status: 'REJECTED' },
        });
      }

      // Owner can withdraw
      if (expense.userId === user.userId) {
        actions.push({
          action: 'WITHDRAW',
          label: 'Withdraw',
          description: 'Withdraw expense from approval',
          endpoint: `/api/expenses/${expense.id}/status`,
          method: 'PUT',
          payload: { status: 'DRAFT' },
        });
      }
      break;

    case 'REJECTED':
      if (expense.userId === user.userId) {
        actions.push({
          action: 'RESUBMIT',
          label: 'Resubmit',
          description: 'Resubmit for approval',
          endpoint: `/api/expenses/${expense.id}/status`,
          method: 'PUT',
          payload: { status: 'SUBMITTED' },
        });
        actions.push({
          action: 'EDIT',
          label: 'Edit & Resubmit',
          description: 'Modify and resubmit expense',
          endpoint: `/api/expenses/${expense.id}`,
          method: 'PUT',
        });
      }
      break;

    case 'APPROVED':
      if (user.role === 'ADMIN') {
        actions.push({
          action: 'REIMBURSE',
          label: 'Mark as Reimbursed',
          description: 'Mark expense as reimbursed',
          endpoint: `/api/expenses/${expense.id}/status`,
          method: 'PUT',
          payload: { status: 'REIMBURSED' },
        });
      }
      break;

    case 'REIMBURSED':
      // No actions available for reimbursed expenses
      break;
  }

  return actions;
}