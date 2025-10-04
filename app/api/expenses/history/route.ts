import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';

const HistoryQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
  category: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  groupBy: z.enum(['month', 'category', 'status', 'user']).optional(),
});

// GET /api/expenses/history - Get expense history with analytics
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
    
    const query = HistoryQuerySchema.parse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      startDate: queryParams.startDate || undefined,
      endDate: queryParams.endDate || undefined,
    });

    // Build base where clause
    const whereClause: any = {
      companyId: user.companyId,
    };

    // Role-based filtering
    if (user.role === 'EMPLOYEE') {
      whereClause.userId = user.userId;
    } else if (user.role === 'MANAGER') {
      // Managers can see their own expenses and their team's expenses
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

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.category) {
      whereClause.category = {
        contains: query.category,
        mode: 'insensitive',
      };
    }

    if (query.startDate || query.endDate) {
      whereClause.expenseDate = {};
      if (query.startDate) {
        whereClause.expenseDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        whereClause.expenseDate.lte = new Date(query.endDate);
      }
    }

    // Get total count
    const totalCount = await db.expense.count({ where: whereClause });

    // Get expenses with pagination
    const skip = (query.page - 1) * query.limit;
    const expenses = await db.expense.findMany({
      where: whereClause,
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
      orderBy: {
        expenseDate: 'desc',
      },
      skip,
      take: query.limit,
    });

    // Generate analytics based on groupBy parameter
    let analytics = null;
    if (query.groupBy) {
      analytics = await generateAnalytics(whereClause, query.groupBy);
    }

    // Generate summary statistics
    const summary = await generateSummary(whereClause);

    const totalPages = Math.ceil(totalCount / query.limit);

    return NextResponse.json(
      createApiResponse(true, {
        expenses,
        summary,
        analytics,
        pagination: {
          page: query.page,
          limit: query.limit,
          totalCount,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        },
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Generate analytics based on groupBy parameter
async function generateAnalytics(whereClause: any, groupBy: string) {
  switch (groupBy) {
    case 'month':
      return await db.expense.groupBy({
        by: ['expenseDate'],
        where: whereClause,
        _count: {
          id: true,
        },
        _sum: {
          convertedAmount: true,
        },
        orderBy: {
          expenseDate: 'desc',
        },
      }).then(results => {
        // Group by month
        const monthlyData = new Map();
        results.forEach(result => {
          const month = result.expenseDate.toISOString().substring(0, 7); // YYYY-MM
          if (!monthlyData.has(month)) {
            monthlyData.set(month, {
              month,
              count: 0,
              totalAmount: 0,
            });
          }
          const data = monthlyData.get(month);
          data.count += result._count.id;
          data.totalAmount += Number(result._sum.convertedAmount || 0);
        });
        return Array.from(monthlyData.values()).sort((a, b) => b.month.localeCompare(a.month));
      });

    case 'category':
      return await db.expense.groupBy({
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
      }).then(results => 
        results.map(result => ({
          category: result.category,
          count: result._count.id,
          totalAmount: Number(result._sum.convertedAmount || 0),
        }))
      );

    case 'status':
      return await db.expense.groupBy({
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
      }).then(results => 
        results.map(result => ({
          status: result.status,
          count: result._count.id,
          totalAmount: Number(result._sum.convertedAmount || 0),
        }))
      );

    case 'user':
      return await db.expense.groupBy({
        by: ['userId'],
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
      }).then(async results => {
        // Get user details
        const userIds = results.map(r => r.userId);
        const users = await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, role: true },
        });
        
        const userMap = new Map(users.map(u => [u.id, u]));
        
        return results.map(result => ({
          user: userMap.get(result.userId),
          count: result._count.id,
          totalAmount: Number(result._sum.convertedAmount || 0),
        }));
      });

    default:
      return null;
  }
}

// Generate summary statistics
async function generateSummary(whereClause: any) {
  const [totalStats, statusStats] = await Promise.all([
    db.expense.aggregate({
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
    }),
    db.expense.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true,
      },
    }),
  ]);

  const statusCounts = statusStats.reduce((acc, stat) => {
    acc[stat.status] = stat._count.id;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalExpenses: totalStats._count.id,
    totalAmount: Number(totalStats._sum.convertedAmount || 0),
    averageAmount: Number(totalStats._avg.convertedAmount || 0),
    statusBreakdown: statusCounts,
  };
}