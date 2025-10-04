import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { adminOnly, authenticated } from '@/lib/route-guards';
import { ApiResponse, CreateUserSchema, UserQuerySchema, UserRole } from '@/lib/types';
import { generateRandomPassword, sendPasswordEmail } from '@/lib/email-utils';

// GET /api/users - List users with filtering and pagination
export const GET = authenticated(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Parse and validate query parameters
    const {
      role,
      isActive,
      managerId,
      page,
      limit,
      sortBy,
      sortOrder,
    } = UserQuerySchema.parse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 10,
      isActive: queryParams.isActive ? queryParams.isActive === 'true' : undefined,
    });

    // Build where clause based on user role and filters
    const whereClause: any = {
      companyId: user.companyId, // Company-scoped access
    };

    // Apply role-based filtering
    if (user.role === 'MANAGER') {
      // Managers can only see their direct reports and themselves
      whereClause.OR = [
        { id: user.userId }, // Self
        { managerId: user.userId }, // Direct reports
      ];
    }
    // Admins can see all users in their company (no additional filtering needed)

    // Apply query filters
    if (role) whereClause.role = role;
    if (typeof isActive === 'boolean') whereClause.isActive = isActive;
    if (managerId) whereClause.managerId = managerId;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          role: true,
          managerId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          manager: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          directReports: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              expenses: true,
              directReports: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Get users error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    );
  }
});

// POST /api/users - Create new user (Admin only)
export const POST = adminOnly(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    
    // Extend schema to include optional password generation
    const CreateUserWithPasswordSchema = CreateUserSchema.extend({
      password: z.string().min(8).optional(),
      generatePassword: z.boolean().default(false),
      sendEmail: z.boolean().default(true),
    });

    const userData = CreateUserWithPasswordSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 409 }
      );
    }

    // Validate manager exists if provided
    if (userData.managerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: userData.managerId,
          companyId: user.companyId,
          role: { in: ['ADMIN', 'MANAGER'] },
          isActive: true,
        },
      });

      if (!manager) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_MANAGER',
              message: 'Manager not found or invalid',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // Generate password if requested or if none provided
    let password = userData.password;
    let generatedPassword: string | undefined;
    
    if (userData.generatePassword || !password) {
      generatedPassword = generateRandomPassword();
      password = generatedPassword;
    }

    // Hash password
    const hashedPassword = await hashPassword(password!);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        companyId: user.companyId,
        managerId: userData.managerId,
      },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send password email if requested and password was generated
    if (userData.sendEmail && generatedPassword) {
      try {
        await sendPasswordEmail(
          newUser.email,
          generatedPassword,
          newUser.company.name
        );
      } catch (emailError) {
        console.error('Failed to send password email:', emailError);
        // Don't fail the user creation, just log the error
      }
    }

    // Return user data (excluding password)
    const responseData = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      companyId: newUser.companyId,
      managerId: newUser.managerId,
      manager: newUser.manager,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      ...(generatedPassword && { temporaryPassword: generatedPassword }),
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          user: responseData,
          message: generatedPassword 
            ? 'User created successfully with generated password'
            : 'User created successfully',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    );
  }
});