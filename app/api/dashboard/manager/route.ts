import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { ManagerDashboardData } from '@/lib/types';

// GET /api/dashboard/manager - Get manager dashboard data
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const user = authResult.user;

    // Only managers and admins can access manager dashboard
    if (user.role === 'EMPLOYEE') {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Access denied' }),
        { status: 403 }
      );
    }

    // Get team members (users who report to this manager)
    const teamMembers = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        managerId: user.userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const teamMemberIds = teamMembers.map(member => member.id);

    // If admin, include all company users
    const relevantUserIds = user.role === 'ADMIN' 
      ? await prisma.user.findMany({
          where: { companyId: user.companyId, isActive: true },
          select: { id: true },
        }).then(users => users.map(u => u.id))
      : teamMemberIds;

    // Get current month start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      pendingApprovalsCount,
      teamExpensesCount,
      monthlyTeamSpendResult,
      pendingExpensesList,
    ] = await Promise.all([
      // Count of pending approvals for this manager
      prisma.approval.count({
        where: {
          approverId: user.userId,
          status: 'PENDING',
        },
      }),

      // Total team expenses count
      prisma.expense.count({
        where: {
          companyId: user.companyId,
          userId: { in: relevantUserIds },
        },
      }),

      // Monthly team spend (approved expenses only)
      prisma.expense.aggregate({
        where: {
          companyId: user.companyId,
          userId: { in: relevantUserIds },
          status: 'APPROVED',
          expenseDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          convertedAmount: true,
        },
      }),

      // Pending expenses list with user details
      prisma.expense.findMany({
        where: {
          companyId: user.companyId,
          status: {
            in: ['SUBMITTED', 'PENDING_APPROVAL'],
          },
          approvals: {
            some: {
              approverId: user.userId,
              status: 'PENDING',
            },
          },
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
            },
          },
          approvals: {
            where: {
              approverId: user.userId,
              status: 'PENDING',
            },
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: [
          { originalAmount: 'desc' }, // High amount expenses first
          { createdAt: 'asc' }, // Older expenses first
        ],
        take: 20, // Limit to 20 most important pending expenses
      }),
    ]);

    // Transform pending expenses data
    const transformedPendingExpenses = pendingExpensesList.map(expense => ({
      ...expense,
      originalAmount: Number(expense.originalAmount),
      convertedAmount: Number(expense.convertedAmount),
      exchangeRate: Number(expense.exchangeRate),
      receiptId: expense.receiptId || undefined,
      currentApproval: expense.approvals[0] || undefined,
    }));

    // Transform team members data
    const transformedTeamMembers = teamMembers.map(member => ({
      id: member.id,
      companyId: user.companyId,
      email: member.email,
      password: '', // Don't expose password
      role: member.role,
      managerId: user.userId,
      isActive: true,
      createdAt: member.createdAt,
      updatedAt: member.createdAt,
    }));

    const dashboardData: ManagerDashboardData = {
      pendingApprovals: pendingApprovalsCount,
      teamExpenses: teamExpensesCount,
      monthlyTeamSpend: Number(monthlyTeamSpendResult._sum.convertedAmount || 0),
      pendingExpensesList: transformedPendingExpenses,
      teamMembers: transformedTeamMembers,
    };

    return NextResponse.json(createApiResponse(true, dashboardData));
  } catch (error) {
    return handleApiError(error, request);
  }
}