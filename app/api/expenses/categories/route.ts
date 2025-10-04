import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';

// Default expense categories
const DEFAULT_CATEGORIES = [
  'Travel',
  'Meals & Entertainment',
  'Office Supplies',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Professional Services',
  'Training & Education',
  'Equipment & Hardware',
  'Utilities',
  'Transportation',
  'Accommodation',
  'Communication',
  'Insurance',
  'Maintenance & Repairs',
  'Other'
];

// GET /api/expenses/categories - Get expense categories
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    // Get categories used in the company's expenses
    const usedCategories = await db.expense.findMany({
      where: {
        companyId: user.companyId,
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    const categories = usedCategories.map(expense => expense.category);
    
    // Merge with default categories and remove duplicates
    const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).sort();

    // Get category usage statistics for admins and managers
    let categoryStats = null;
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      const stats = await db.expense.groupBy({
        by: ['category'],
        where: {
          companyId: user.companyId,
          ...(user.role === 'MANAGER' ? {
            OR: [
              { userId: user.userId },
              {
                user: {
                  managerId: user.userId,
                },
              },
            ],
          } : {}),
        },
        _count: {
          category: true,
        },
        _sum: {
          convertedAmount: true,
        },
        orderBy: {
          _count: {
            category: 'desc',
          },
        },
      });

      categoryStats = stats.map(stat => ({
        category: stat.category,
        count: stat._count.category,
        totalAmount: Number(stat._sum.convertedAmount || 0),
      }));
    }

    return NextResponse.json(
      createApiResponse(true, {
        categories: allCategories,
        defaultCategories: DEFAULT_CATEGORIES,
        stats: categoryStats,
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/expenses/categories - Add custom category (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Admin access required' }),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category } = body;

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return NextResponse.json(
        createApiResponse(false, null, { 
          code: 'INVALID_CATEGORY', 
          message: 'Category name is required' 
        }),
        { status: 400 }
      );
    }

    const categoryName = category.trim();

    // Check if category already exists
    const existingExpense = await db.expense.findFirst({
      where: {
        companyId: user.companyId,
        category: {
          equals: categoryName,
          mode: 'insensitive',
        },
      },
    });

    if (existingExpense || DEFAULT_CATEGORIES.some(cat => 
      cat.toLowerCase() === categoryName.toLowerCase()
    )) {
      return NextResponse.json(
        createApiResponse(false, null, { 
          code: 'CATEGORY_EXISTS', 
          message: 'Category already exists' 
        }),
        { status: 409 }
      );
    }

    // Create a dummy expense with the new category to register it
    // This is a simple approach - in a more complex system, you might have a separate categories table
    return NextResponse.json(
      createApiResponse(true, {
        category: categoryName,
        message: 'Category will be available once an expense is created with it',
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}