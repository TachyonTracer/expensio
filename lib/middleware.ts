import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth';
import { ApiResponse, JWTPayload, UserRole } from '@/lib/types';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload & {
    company: {
      id: string;
      name: string;
      country: string;
      baseCurrency: string;
    };
    manager?: {
      id: string;
      email: string;
      role: string;
    };
    directReports?: Array<{
      id: string;
      email: string;
      role: string;
    }>;
  };
}

/**
 * Authentication middleware that verifies JWT tokens
 */
export async function authenticate(request: NextRequest): Promise<{
  success: boolean;
  user?: JWTPayload & any;
  response?: NextResponse;
}> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_TOKEN',
              message: 'Authorization token is required',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 401 }
        ),
      };
    }

    // Verify access token
    const payload = verifyAccessToken(token);
    if (!payload) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired access token',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 401 }
        ),
      };
    }

    // Get user with company information to ensure user is still active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        company: true,
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
      },
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found or inactive',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 401 }
        ),
      };
    }

    // Return authenticated user data
    return {
      success: true,
      user: {
        ...payload,
        company: {
          id: user.company.id,
          name: user.company.name,
          country: user.company.country,
          baseCurrency: user.company.baseCurrency,
        },
        manager: user.manager,
        directReports: user.directReports,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Authentication failed',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      ),
    };
  }
}

/**
 * Authorization middleware that checks user roles and permissions
 */
export function authorize(allowedRoles: UserRole[]) {
  return async (request: NextRequest): Promise<{
    success: boolean;
    user?: JWTPayload & any;
    response?: NextResponse;
  }> => {
    // First authenticate the user
    const authResult = await authenticate(request);
    if (!authResult.success) {
      return authResult;
    }

    const user = authResult.user!;

    // Check if user role is allowed
    if (!allowedRoles.includes(user.role)) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
              details: {
                userRole: user.role,
                requiredRoles: allowedRoles,
              },
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      user,
    };
  };
}

/**
 * Resource-based authorization for user-specific resources
 */
export async function authorizeResourceAccess(
  user: JWTPayload & any,
  resourceUserId: string,
  resourceType: 'expense' | 'user' | 'approval'
): Promise<{
  success: boolean;
  response?: NextResponse;
}> {
  try {
    // Admin can access all resources
    if (user.role === 'ADMIN') {
      return { success: true };
    }

    // Users can access their own resources
    if (user.userId === resourceUserId) {
      return { success: true };
    }

    // Managers can access their direct reports' resources
    if (user.role === 'MANAGER') {
      const isDirectReport = user.directReports?.some(
        (report: any) => report.id === resourceUserId
      );
      
      if (isDirectReport) {
        return { success: true };
      }

      // For approval-related resources, managers can access expenses they need to approve
      if (resourceType === 'expense' || resourceType === 'approval') {
        const expense = await prisma.expense.findFirst({
          where: {
            userId: resourceUserId,
            companyId: user.companyId,
            approvals: {
              some: {
                approverId: user.userId,
              },
            },
          },
        });

        if (expense) {
          return { success: true };
        }
      }
    }

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESOURCE_ACCESS_DENIED',
            message: 'You do not have permission to access this resource',
            details: {
              resourceType,
              resourceUserId,
              userRole: user.role,
            },
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 403 }
      ),
    };
  } catch (error) {
    console.error('Resource authorization error:', error);
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Authorization check failed',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      ),
    };
  }
}

/**
 * Company-scoped authorization to ensure users can only access their company's data
 */
export function authorizeCompanyAccess(
  user: JWTPayload & any,
  resourceCompanyId: string
): {
  success: boolean;
  response?: NextResponse;
} {
  if (user.companyId !== resourceCompanyId) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'COMPANY_ACCESS_DENIED',
            message: 'You can only access resources from your own company',
            details: {
              userCompanyId: user.companyId,
              resourceCompanyId,
            },
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 403 }
      ),
    };
  }

  return { success: true };
}

/**
 * Permission checking functions for specific operations
 */
export const permissions = {
  // User management permissions
  canManageUsers: (user: JWTPayload & any): boolean => {
    return user.role === 'ADMIN';
  },

  canViewUser: (user: JWTPayload & any, targetUserId: string): boolean => {
    if (user.role === 'ADMIN') return true;
    if (user.userId === targetUserId) return true;
    if (user.role === 'MANAGER') {
      return user.directReports?.some((report: any) => report.id === targetUserId) || false;
    }
    return false;
  },

  canUpdateUser: (user: JWTPayload & any, targetUserId: string): boolean => {
    if (user.role === 'ADMIN') return true;
    if (user.userId === targetUserId) return true; // Users can update their own profile
    return false;
  },

  canDeleteUser: (user: JWTPayload & any): boolean => {
    return user.role === 'ADMIN';
  },

  // Expense management permissions
  canViewExpense: (user: JWTPayload & any, expenseUserId: string): boolean => {
    if (user.role === 'ADMIN') return true;
    if (user.userId === expenseUserId) return true;
    if (user.role === 'MANAGER') {
      return user.directReports?.some((report: any) => report.id === expenseUserId) || false;
    }
    return false;
  },

  canCreateExpense: (user: JWTPayload & any): boolean => {
    return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role);
  },

  canUpdateExpense: (user: JWTPayload & any, expenseUserId: string): boolean => {
    if (user.role === 'ADMIN') return true;
    if (user.userId === expenseUserId) return true;
    return false;
  },

  canDeleteExpense: (user: JWTPayload & any, expenseUserId: string): boolean => {
    if (user.role === 'ADMIN') return true;
    if (user.userId === expenseUserId) return true;
    return false;
  },

  // Approval permissions
  canApproveExpense: (user: JWTPayload & any): boolean => {
    return ['ADMIN', 'MANAGER'].includes(user.role);
  },

  canOverrideApproval: (user: JWTPayload & any): boolean => {
    return user.role === 'ADMIN';
  },

  // Company management permissions
  canManageCompany: (user: JWTPayload & any): boolean => {
    return user.role === 'ADMIN';
  },

  canViewCompanyData: (user: JWTPayload & any): boolean => {
    return ['ADMIN', 'MANAGER'].includes(user.role);
  },

  // Approval rule management permissions
  canManageApprovalRules: (user: JWTPayload & any): boolean => {
    return user.role === 'ADMIN';
  },
};

/**
 * Higher-order function to create protected API route handlers
 */
export function withAuth(
  handler: (request: AuthenticatedRequest, user: JWTPayload & any) => Promise<NextResponse>,
  options: {
    roles?: UserRole[];
    requireCompanyAccess?: boolean;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Authenticate user
      let authResult;
      if (options.roles && options.roles.length > 0) {
        // Use role-based authorization
        authResult = await authorize(options.roles)(request);
      } else {
        // Use basic authentication
        authResult = await authenticate(request);
      }

      if (!authResult.success) {
        return authResult.response!;
      }

      const user = authResult.user!;

      // Add user to request object
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      // Call the actual handler
      return await handler(authenticatedRequest, user);
    } catch (error) {
      console.error('Protected route error:', error);
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
  };
}