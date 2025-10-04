import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';

// GET /api/expenses/search - Advanced search with text matching
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
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        createApiResponse(false, null, { 
          code: 'INVALID_QUERY', 
          message: 'Search query must be at least 2 characters' 
        }),
        { status: 400 }
      );
    }

    // Build where clause based on user role
    const whereClause: any = {
      companyId: user.companyId,
      OR: [
        {
          description: {
            contains: query.trim(),
            mode: 'insensitive',
          },
        },
        {
          category: {
            contains: query.trim(),
            mode: 'insensitive',
          },
        },
      ],
    };

    // Role-based filtering
    if (user.role === 'EMPLOYEE') {
      whereClause.userId = user.userId;
    } else if (user.role === 'MANAGER') {
      // Managers can search their own expenses and their team's expenses
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

    // Apply additional filters
    if (category) {
      whereClause.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (userId && user.role === 'ADMIN') {
      whereClause.userId = userId;
    }

    // Search expenses
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
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: Math.min(limit, 50), // Cap at 50 results
    });

    return NextResponse.json(
      createApiResponse(true, {
        expenses,
        query: query.trim(),
        totalResults: expenses.length,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}