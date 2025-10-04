import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';

const AnalyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().uuid().optional(),
  category: z.string().optional(),
  includeTeam: z.boolean().default(false),
});

// GET /api/expenses/analytics - Get expense analytics and reporting
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const query = AnalyticsQuerySchema.parse({
      ...queryParams,
      includeTeam: queryParams.includeTeam === 'true',
    });

    // Build base where clause
    const whereClause: any = {
      companyId: user.companyId,
    };

    // Role-based filtering
    if (user.role === 'EMPLOYEE') {
      whereClause.userId = user.userId;
    } else if (user.role === 'MANAGER' && !query.includeTeam) {
      whereClause.userId = user.userId;
    } else if (user.role === 'MANAGER' && query.includeTeam) {
      // Include manager's team
      const teamMembers = await db.user.findMany({
        where: {
          companyId: user.companyId,
          managerId: user.userId,
        },
        select: { id: true },
      });
      
      const teamMemberIds = teamMembers.map(member => member.id);
      whereClause.userId = {
        in: [...teamMemberIds, user.userId],
      };
    }

    // Apply filters
    if (query.userId && user.role === 'ADMIN') {
      whereClause.userId = query.userId;
    }

    if (query.category) {
      whereClause.category = {
        contains: query.category,
        mode: 'insensitive',
      };
    }

    // Date range filtering
    const dateRange = getDateRange(query.period, query.startDate, query.endDate);
    if (dateRange.start || dateRange.end) {
      whereClause.expenseDate = {};
      if (dateRange.start) {
        whereClause.expenseDate.gte = dateRange.start;
      }
      if (dateRange.end) {
        whereClause.expenseDate.lte = dateRange.end;
      }
    }

    // Generate analytics
    const [
      overviewStats,
      trendData,
      categoryBreakdown,
      statusBreakdown,
      topExpenses,
      monthlyComparison,
    ] = await Promise.all([
      generateOverviewStats(whereClause),
      generateTrendData(whereClause, query.period),
      generateCategoryBreakdown(whereClause),
      generateStatusBreakdown(whereClause),
      getTopExpenses(whereClause),
      generateMonthlyComparison(whereClause),
    ]);

    return NextResponse.json(
      createApiResponse(true, {
        overview: overviewStats,
        trends: trendData,
        categoryBreakdown,
        statusBreakdown,
        topExpenses,
        monthlyComparison,
        period: query.period,
        dateRange,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Get date range based on period
function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date | undefined;
  let end: Date | undefined;

  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
    };
  }

  switch (period) {
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      end = now;
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
  }

  return { start, end };
}

// Generate overview statistics
async function generateOverviewStats(whereClause: any) {
  const stats = await db.expense.aggregate({
    where: whereClause,
    _count: {
      id: true,
    },
    _sum: {
      convertedAmount: true,
    },
    _avg: {
      convertedAmount: true,
    },
  });

  const approvedStats = await db.expense.aggregate({
    where: {
      ...whereClause,
      status: 'APPROVED',
    },
    _count: {
      id: true,
    },
    _sum: {
      convertedAmount: true,
    },
  });

  const pendingStats = await db.expense.aggregate({
    where: {
      ...whereClause,
      status: {
        in: ['SUBMITTED', 'PENDING_APPROVAL'],
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      convertedAmount: true,
    },
  });

  return {
    totalExpenses: stats._count.id,
    totalAmount: Number(stats._sum.convertedAmount || 0),
    averageAmount: Number(stats._avg.convertedAmount || 0),
    approvedExpenses: approvedStats._count.id,
    approvedAmount: Number(approvedStats._sum.convertedAmount || 0),
    pendingExpenses: pendingStats._count.id,
    pendingAmount: Number(pendingStats._sum.convertedAmount || 0),
    approvalRate: stats._count.id > 0 ? (approvedStats._count.id / stats._count.id) * 100 : 0,
  };
}

// Generate trend data
async function generateTrendData(whereClause: any, period: string) {
  const expenses = await db.expense.findMany({
    where: whereClause,
    select: {
      expenseDate: true,
      convertedAmount: true,
      status: true,
    },
    orderBy: {
      expenseDate: 'asc',
    },
  });

  // Group by period
  const trendMap = new Map();
  
  expenses.forEach(expense => {
    let key: string;
    const date = new Date(expense.expenseDate);
    
    switch (period) {
      case 'week':
        // Group by day
        key = date.toISOString().split('T')[0];
        break;
      case 'month':
        // Group by week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'quarter':
      case 'year':
        // Group by month
        key = date.toISOString().substring(0, 7);
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!trendMap.has(key)) {
      trendMap.set(key, {
        period: key,
        count: 0,
        amount: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      });
    }

    const data = trendMap.get(key);
    data.count++;
    data.amount += Number(expense.convertedAmount);
    
    if (expense.status === 'APPROVED') data.approved++;
    else if (['SUBMITTED', 'PENDING_APPROVAL'].includes(expense.status)) data.pending++;
    else if (expense.status === 'REJECTED') data.rejected++;
  });

  return Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));
}

// Generate category breakdown
async function generateCategoryBreakdown(whereClause: any) {
  const categoryStats = await db.expense.groupBy({
    by: ['category'],
    where: whereClause,
    _count: {
      id: true,
    },
    _sum: {
      convertedAmount: true,
    },
    orderBy: {
      _sum: {
        convertedAmount: 'desc',
      },
    },
  });

  const total = categoryStats.reduce((sum, cat) => sum + Number(cat._sum.convertedAmount || 0), 0);

  return categoryStats.map(stat => ({
    category: stat.category,
    count: stat._count.id,
    amount: Number(stat._sum.convertedAmount || 0),
    percentage: total > 0 ? ((Number(stat._sum.convertedAmount || 0) / total) * 100) : 0,
  }));
}

// Generate status breakdown
async function generateStatusBreakdown(whereClause: any) {
  const statusStats = await db.expense.groupBy({
    by: ['status'],
    where: whereClause,
    _count: {
      id: true,
    },
    _sum: {
      convertedAmount: true,
    },
    orderBy: {
      status: 'asc',
    },
  });

  return statusStats.map(stat => ({
    status: stat.status,
    count: stat._count.id,
    amount: Number(stat._sum.convertedAmount || 0),
  }));
}

// Get top expenses
async function getTopExpenses(whereClause: any) {
  return await db.expense.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      convertedAmount: 'desc',
    },
    take: 10,
  });
}

// Generate monthly comparison
async function generateMonthlyComparison(whereClause: any) {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [currentMonthStats, previousMonthStats] = await Promise.all([
    db.expense.aggregate({
      where: {
        ...whereClause,
        expenseDate: {
          gte: currentMonth,
        },
      },
      _count: { id: true },
      _sum: { convertedAmount: true },
    }),
    db.expense.aggregate({
      where: {
        ...whereClause,
        expenseDate: {
          gte: previousMonth,
          lte: previousMonthEnd,
        },
      },
      _count: { id: true },
      _sum: { convertedAmount: true },
    }),
  ]);

  const currentAmount = Number(currentMonthStats._sum.convertedAmount || 0);
  const previousAmount = Number(previousMonthStats._sum.convertedAmount || 0);
  const currentCount = currentMonthStats._count.id;
  const previousCount = previousMonthStats._count.id;

  return {
    current: {
      month: currentMonth.toISOString().substring(0, 7),
      count: currentCount,
      amount: currentAmount,
    },
    previous: {
      month: previousMonth.toISOString().substring(0, 7),
      count: previousCount,
      amount: previousAmount,
    },
    comparison: {
      countChange: previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0,
      amountChange: previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0,
    },
  };
}