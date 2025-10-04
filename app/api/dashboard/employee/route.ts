import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { EmployeeDashboardData } from '@/lib/types';

// GET /api/dashboard/employee - Get employee dashboard data
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

    // Only employees and managers can access their own dashboard
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Access denied' }),
        { status: 403 }
      );
    }

    // Get expense statistics for the current user
    const [
      totalExpensesResult,
      pendingExpensesResult,
      approvedExpensesResult,
      rejectedExpensesResult,
      totalAmountResult,
      recentExpenses,
    ] = await Promise.all([
      // Total expenses count
      prisma.expense.count({
        where: {
          userId: user.userId,
          companyId: user.companyId,
        },
      }),
      
      // Pending expenses count
      prisma.expense.count({
        where: {
          userId: user.userId,
          companyId: user.companyId,
          status: {
            in: ['SUBMITTED', 'PENDING_APPROVAL'],
          },
        },
      }),
      
      // Approved expenses count
      prisma.expense.count({
        where: {
          userId: user.userId,
          companyId: user.companyId,
          status: 'APPROVED',
        },
      }),
      
      // Rejected expenses count
      prisma.expense.count({
        where: {
          userId: user.userId,
          companyId: user.companyId,
          status: 'REJECTED',
        },
      }),
      
      // Total amount of approved expenses
      prisma.expense.aggregate({
        where: {
          userId: user.userId,
          companyId: user.companyId,
          status: 'APPROVED',
        },
        _sum: {
          convertedAmount: true,
        },
      }),
      
      // Recent expenses (last 10)
      prisma.expense.findMany({
        where: {
          userId: user.userId,
          companyId: user.companyId,
        },
        include: {
          receipt: {
            select: {
              id: true,
              fileName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    const dashboardData: EmployeeDashboardData = {
      totalExpenses: totalExpensesResult,
      pendingExpenses: pendingExpensesResult,
      approvedExpenses: approvedExpensesResult,
      rejectedExpenses: rejectedExpensesResult,
      totalAmount: Number(totalAmountResult._sum.convertedAmount || 0),
      recentExpenses: recentExpenses.map(expense => ({
        ...expense,
        originalAmount: Number(expense.originalAmount),
        convertedAmount: Number(expense.convertedAmount),
        exchangeRate: Number(expense.exchangeRate),
        receiptId: expense.receiptId || undefined,
      })),
    };

    return NextResponse.json(createApiResponse(true, dashboardData));
  } catch (error) {
    return handleApiError(error, request);
  }
}