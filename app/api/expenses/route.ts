import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { CreateExpenseSchema, ExpenseQuerySchema } from '@/lib/types';
import { currencyConversionService } from '@/lib/services/currency-conversion.service';

// GET /api/expenses - List expenses with filtering and pagination
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
    
    // Parse and validate query parameters
    const query = ExpenseQuerySchema.parse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 10,
      minAmount: queryParams.minAmount ? parseFloat(queryParams.minAmount) : undefined,
      maxAmount: queryParams.maxAmount ? parseFloat(queryParams.maxAmount) : undefined,
      startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
      endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
    });

    // Build where clause based on user role and filters
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
    // Admins can see all company expenses (no additional filtering)

    // Apply query filters
    if (query.status) {
      whereClause.status = query.status;
    }
    if (query.category) {
      whereClause.category = {
        contains: query.category,
        mode: 'insensitive',
      };
    }
    if (query.userId && user.role === 'ADMIN') {
      whereClause.userId = query.userId;
    }
    if (query.startDate || query.endDate) {
      whereClause.expenseDate = {};
      if (query.startDate) {
        whereClause.expenseDate.gte = query.startDate;
      }
      if (query.endDate) {
        whereClause.expenseDate.lte = query.endDate;
      }
    }
    if (query.minAmount || query.maxAmount) {
      whereClause.convertedAmount = {};
      if (query.minAmount) {
        whereClause.convertedAmount.gte = query.minAmount;
      }
      if (query.maxAmount) {
        whereClause.convertedAmount.lte = query.maxAmount;
      }
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;

    // Get total count for pagination
    const totalCount = await db.expense.count({ where: whereClause });

    // Fetch expenses with relations
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
        [query.sortBy]: query.sortOrder,
      },
      skip,
      take: query.limit,
    });

    const totalPages = Math.ceil(totalCount / query.limit);

    return NextResponse.json(
      createApiResponse(true, {
        expenses,
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

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const expenseData = CreateExpenseSchema.parse(body);

    // Get currency conversion if needed
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

    let convertedAmount = expenseData.originalAmount;
    let exchangeRate = 1;

    if (expenseData.originalCurrency !== company.baseCurrency) {
      const conversionResult = await currencyConversionService.convertAmount(
        expenseData.originalAmount,
        expenseData.originalCurrency,
        company.baseCurrency
      );
      convertedAmount = conversionResult.convertedAmount;
      exchangeRate = conversionResult.exchangeRate;
    }

    // Create expense
    const expense = await db.expense.create({
      data: {
        companyId: user.companyId,
        userId: user.userId,
        originalAmount: expenseData.originalAmount,
        originalCurrency: expenseData.originalCurrency,
        convertedAmount,
        baseCurrency: company.baseCurrency,
        exchangeRate,
        category: expenseData.category,
        description: expenseData.description,
        expenseDate: expenseData.expenseDate,
        status: 'SUBMITTED',
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
      },
    });

    return NextResponse.json(
      createApiResponse(true, expense),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}