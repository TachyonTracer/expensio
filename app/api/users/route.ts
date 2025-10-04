import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth';
import { adminOnly, authenticated } from '@/lib/route-guards';
import { ApiResponse, CreateUserSchema, UserQuerySchema, UserRole } from '@/lib/types';
import { generateRandomPassword, sendPasswordEmail } from '@/lib/email-utils';
import { createTenantService } from '@/lib/services/tenant-service';

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

    // Create tenant service for company-scoped operations
    const tenantService = createTenantService(user);

    // Build where clause with role-based filtering
    let whereClause: any = {};

    // Apply role-based filtering
    if (user.role === 'MANAGER') {
      // Managers can only see their direct reports and themselves
      const accessibleUserIds = await tenantService.getAccessibleUserIds();
      whereClause.id = { in: accessibleUserIds };
    }
    // Admins can see all users in their company (no additional filtering needed)

    // Apply query filters
    if (role) whereClause.role = role;
    if (typeof isActive === 'boolean') whereClause.isActive = isActive;
    if (managerId) whereClause.managerId = managerId;

    // Get users with pagination using tenant service
    const result = await tenantService.getUsers({
      where: whereClause,
      include: {
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
      pagination: { page, limit },
    });

    const users = result.data;
    const totalPages = result.pagination.totalPages;

    return NextResponse.json(
      {
        success: true,
        data: {
          users,
          pagination: result.pagination,
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

    // Create tenant service for company-scoped operations
    const tenantService = createTenantService(user);

    // Check if user already exists (global check, not company-scoped)
    const existingUsers = await tenantService.getUsers({
      where: { email: userData.email },
    });
    const existingUser = Array.isArray(existingUsers) ? existingUsers[0] : null;

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

    // Validate manager exists if provided (company-scoped)
    if (userData.managerId) {
      const manager = await tenantService.getUserById(userData.managerId);

      if (!manager || !['ADMIN', 'MANAGER'].includes(manager.role) || !manager.isActive) {
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

    // Create user using tenant service
    const newUser = await tenantService.createUser({
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      managerId: userData.managerId,
    });

    // Get the created user with relations
    const userWithRelations = await tenantService.getUserById(newUser.id, {
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
    });

    // Send password email if requested and password was generated
    if (userData.sendEmail && generatedPassword && userWithRelations) {
      try {
        await sendPasswordEmail(
          userWithRelations.email,
          generatedPassword,
          userWithRelations.company.name
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
      manager: userWithRelations?.manager,
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