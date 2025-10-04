import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { AdminDashboardData } from '@/lib/types';

// GET /api/dashboard/admin - Get admin dashboard data
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

    // Only admins can access admin dashboard
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Admin access required' }),
        { status: 403 }
      );
    }

    // Get current month start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get last 12 months for trend data
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      totalUsersCount,
      totalExpensesCount,
      monthlySpendResult,
      pendingApprovalsCount,
      expensesByCategory,
      monthlyExpenseTrend,
    ] = await Promise.all([
      // Total active users in company
      prisma.user.count({
        where: {
          companyId: user.companyId,
          isActive: true,
        },
      }),

      // Total expenses count
      prisma.expense.count({
        where: {
          companyId: user.companyId,
        },
      }),

      // Monthly spend (approved expenses only)
      prisma.expense.aggregate({
        where: {
          companyId: user.companyId,
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

      // Pending approvals count across all users
      prisma.approval.count({
        where: {
          expense: {
            companyId: user.companyId,
          },
          status: 'PENDING',
        },
      }),

      // Expenses by category (approved expenses only)
      prisma.expense.groupBy({
        by: ['category'],
        where: {
          companyId: user.companyId,
          status: 'APPROVED',
        },
        _sum: {
          convertedAmount: true,
        },
        orderBy: {
          _sum: {
            convertedAmount: 'desc',
          },
        },
      }),

      // Monthly expense trend for last 12 months
      prisma.$queryRaw<Array<{ month: Date; amount: bigint }>>`
        SELECT 
          DATE_TRUNC('month', "expenseDate") as month,
          SUM("convertedAmount") as amount
        FROM "Expense"
        WHERE "companyId" = ${user.companyId}
          AND "status" = 'APPROVED'
          AND "expenseDate" >= ${twelveMonthsAgo}
          AND "expenseDate" <= ${monthEnd}
        GROUP BY DATE_TRUNC('month', "expenseDate")
        ORDER BY month ASC
      `,
    ]);

    // Transform expenses by category data
    const companyExpensesByCategory: Record<string, number> = {};
    expensesByCategory.forEach((item) => {
      companyExpensesByCategory[item.category] = Number(item._sum.convertedAmount || 0);
    });

    // Transform monthly trend data
    const monthlyExpenseTrendFormatted = monthlyExpenseTrend.map((item) => ({
      month: new Date(item.month).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      }),
      amount: Number(item.amount || 0),
    }));

    // Fill in missing months with zero amounts
    const completeMonthlyTrend: Array<{ month: string; amount: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      const existingData = monthlyExpenseTrendFormatted.find(item => item.month === monthKey);
      completeMonthlyTrend.push({
        month: monthKey,
        amount: existingData ? existingData.amount : 0,
      });
    }

    const dashboardData: AdminDashboardData = {
      totalUsers: totalUsersCount,
      totalExpenses: totalExpensesCount,
      monthlySpend: Number(monthlySpendResult._sum.convertedAmount || 0),
      pendingApprovals: pendingApprovalsCount,
      companyExpensesByCategory,
      monthlyExpenseTrend: completeMonthlyTrend,
    };

    return NextResponse.json(createApiResponse(true, dashboardData));
  } catch (error) {
    return handleApiError(error, request);
  }
}