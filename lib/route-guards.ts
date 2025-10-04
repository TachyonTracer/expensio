import { NextRequest, NextResponse } from 'next/server';
import { withAuth, permissions } from '@/lib/middleware';
import { UserRole, ApiResponse } from '@/lib/types';

/**
 * Route guard for Admin-only endpoints
 */
export const adminOnly = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withAuth(handler, { roles: ['ADMIN'] });
};

/**
 * Route guard for Manager and Admin endpoints
 */
export const managerOrAdmin = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withAuth(handler, { roles: ['ADMIN', 'MANAGER'] });
};

/**
 * Route guard for all authenticated users
 */
export const authenticated = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withAuth(handler, { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] });
};

/**
 * Route guard for Employee-level access (all roles)
 */
export const employeeOrAbove = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withAuth(handler, { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] });
};

/**
 * Custom route guard with specific permission check
 */
export const withPermission = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  permissionCheck: (user: any, ...args: any[]) => boolean,
  errorMessage: string = 'Insufficient permissions'
) => {
  return withAuth(async (request: NextRequest, user: any) => {
    // Extract additional parameters from request if needed
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Check permission
    if (!permissionCheck(user)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: errorMessage,
            details: {
              userRole: user.role,
              userId: user.userId,
            },
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 403 }
      );
    }

    return await handler(request, user);
  });
};

/**
 * Route guard for user management operations
 */
export const canManageUsers = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withPermission(
    handler,
    (user) => permissions.canManageUsers(user),
    'Only administrators can manage users'
  );
};

/**
 * Route guard for expense management operations
 */
export const canCreateExpense = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withPermission(
    handler,
    (user) => permissions.canCreateExpense(user),
    'You do not have permission to create expenses'
  );
};

/**
 * Route guard for approval operations
 */
export const canApproveExpense = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withPermission(
    handler,
    (user) => permissions.canApproveExpense(user),
    'Only managers and administrators can approve expenses'
  );
};

/**
 * Route guard for company management operations
 */
export const canManageCompany = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withPermission(
    handler,
    (user) => permissions.canManageCompany(user),
    'Only administrators can manage company settings'
  );
};

/**
 * Route guard for approval rule management
 */
export const canManageApprovalRules = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withPermission(
    handler,
    (user) => permissions.canManageApprovalRules(user),
    'Only administrators can manage approval rules'
  );
};

/**
 * Resource-specific route guard that checks if user can access a specific resource
 */
export const withResourceAccess = (
  handler: (request: NextRequest, user: any, resourceId: string) => Promise<NextResponse>,
  resourceType: 'expense' | 'user' | 'approval',
  resourceIdParam: string = 'id'
) => {
  return withAuth(async (request: NextRequest, user: any) => {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract resource ID from URL path
    let resourceId: string | undefined;
    
    // Try to find the resource ID in the path segments
    const paramIndex = pathSegments.findIndex(segment => segment === resourceIdParam);
    if (paramIndex !== -1 && paramIndex + 1 < pathSegments.length) {
      resourceId = pathSegments[paramIndex + 1];
    } else {
      // Try to find it as the last segment if it looks like a UUID
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastSegment)) {
        resourceId = lastSegment;
      }
    }

    if (!resourceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'Resource ID is required',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 400 }
      );
    }

    // For user resources, check if user can access the target user
    if (resourceType === 'user') {
      if (!permissions.canViewUser(user, resourceId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RESOURCE_ACCESS_DENIED',
              message: 'You do not have permission to access this user',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }
    }

    return await handler(request, user, resourceId);
  });
};

/**
 * Utility function to create role-based middleware
 */
export const requireRoles = (...roles: UserRole[]) => {
  return (handler: (request: NextRequest, user: any) => Promise<NextResponse>) => {
    return withAuth(handler, { roles });
  };
};

/**
 * Utility function to create company-scoped middleware
 */
export const requireCompanyAccess = (
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) => {
  return withAuth(handler, { requireCompanyAccess: true });
};

/**
 * Combined middleware for common patterns
 */
export const adminOrResourceOwner = (
  handler: (request: NextRequest, user: any, resourceId: string) => Promise<NextResponse>,
  resourceType: 'expense' | 'user' | 'approval' = 'user'
) => {
  return withResourceAccess(async (request: NextRequest, user: any, resourceId: string) => {
    // Admin can access any resource
    if (user.role === 'ADMIN') {
      return await handler(request, user, resourceId);
    }

    // Resource owner can access their own resource
    if (resourceType === 'user' && user.userId === resourceId) {
      return await handler(request, user, resourceId);
    }

    // For expenses, check if user owns the expense
    if (resourceType === 'expense') {
      // This would need to be implemented with a database check
      // For now, we'll allow the handler to do the check
      return await handler(request, user, resourceId);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only access your own resources or you must be an administrator',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 403 }
    );
  }, resourceType);
};