import { NextRequest } from 'next/server';
import { JWTPayload } from '@/lib/types';

/**
 * Extract tenant context from request headers (set by middleware)
 */
export function extractTenantContext(request: NextRequest): {
  userId?: string;
  companyId?: string;
  role?: string;
  email?: string;
} {
  return {
    userId: request.headers.get('x-user-id') || undefined,
    companyId: request.headers.get('x-company-id') || undefined,
    role: request.headers.get('x-user-role') || undefined,
    email: request.headers.get('x-user-email') || undefined,
  };
}

/**
 * Create a tenant-aware where clause for database queries
 */
export function createTenantWhere<T extends Record<string, any>>(
  companyId: string,
  additionalWhere: T = {} as T
): T & { companyId: string } {
  return {
    ...additionalWhere,
    companyId,
  };
}

/**
 * Validate that a user can access a resource based on their role and company
 */
export function validateTenantAccess(
  userContext: { companyId: string; role: string; userId: string },
  resourceContext: { companyId?: string; userId?: string }
): {
  canAccess: boolean;
  reason?: string;
} {
  // Check company access first
  if (resourceContext.companyId && resourceContext.companyId !== userContext.companyId) {
    return {
      canAccess: false,
      reason: 'Resource belongs to a different company',
    };
  }

  // Admin can access everything in their company
  if (userContext.role === 'ADMIN') {
    return { canAccess: true };
  }

  // Users can access their own resources
  if (resourceContext.userId && resourceContext.userId === userContext.userId) {
    return { canAccess: true };
  }

  // For manager access to team members, this would need additional logic
  // that checks the reporting relationship in the database
  
  return {
    canAccess: false,
    reason: 'Insufficient permissions to access this resource',
  };
}

/**
 * Create tenant-scoped database operations
 */
export class TenantDatabase {
  private companyId: string;
  private userId: string;
  private role: string;

  constructor(context: { companyId: string; userId: string; role: string }) {
    this.companyId = context.companyId;
    this.userId = context.userId;
    this.role = context.role;
  }

  /**
   * Create a company-scoped where clause
   */
  scopeToCompany<T extends Record<string, any>>(where: T = {} as T): T & { companyId: string } {
    return createTenantWhere(this.companyId, where);
  }

  /**
   * Check if user can access a specific user's data
   */
  canAccessUserData(targetUserId: string): boolean {
    // Admin can access all users in company
    if (this.role === 'ADMIN') {
      return true;
    }
    
    // Users can access their own data
    if (this.userId === targetUserId) {
      return true;
    }
    
    // Managers can access their direct reports (would need DB check)
    // This is a simplified version - in practice, you'd query the database
    // to check the reporting relationship
    return false;
  }

  /**
   * Get accessible user IDs based on role
   */
  getAccessibleUserIds(): string[] {
    // This is a simplified version - in practice, you'd query the database
    if (this.role === 'ADMIN') {
      // Would return all user IDs in the company
      return [];
    } else if (this.role === 'MANAGER') {
      // Would return direct report IDs + own ID
      return [this.userId];
    } else {
      // Employee can only access their own data
      return [this.userId];
    }
  }

  /**
   * Create user-scoped where clause for expenses
   */
  scopeToAccessibleUsers<T extends Record<string, any>>(where: T = {} as T): T & { companyId: string } {
    const baseWhere = this.scopeToCompany(where);
    
    if (this.role === 'ADMIN') {
      // Admin can see all expenses in company
      return baseWhere;
    } else if (this.role === 'MANAGER') {
      // Manager can see their own expenses and their direct reports'
      // This would need a proper database query to get direct report IDs
      return {
        ...baseWhere,
        OR: [
          { userId: this.userId },
          // { userId: { in: directReportIds } } // Would be populated from DB
        ],
      } as any;
    } else {
      // Employee can only see their own expenses
      return {
        ...baseWhere,
        userId: this.userId,
      } as any;
    }
  }
}

/**
 * Factory function to create tenant database instance from request
 */
export function createTenantDatabase(request: NextRequest): TenantDatabase | null {
  const context = extractTenantContext(request);
  
  if (!context.companyId || !context.userId || !context.role) {
    return null;
  }
  
  return new TenantDatabase({
    companyId: context.companyId,
    userId: context.userId,
    role: context.role,
  });
}

/**
 * Higher-order function to add tenant context to API handlers
 */
export function withTenantContext<T extends any[]>(
  handler: (tenantDb: TenantDatabase, ...args: T) => Promise<any>
) {
  return async (request: NextRequest, ...args: T) => {
    const tenantDb = createTenantDatabase(request);
    
    if (!tenantDb) {
      throw new Error('Invalid tenant context');
    }
    
    return handler(tenantDb, ...args);
  };
}

/**
 * Tenant-aware error responses
 */
export const TenantErrors = {
  INVALID_COMPANY_ACCESS: {
    code: 'INVALID_COMPANY_ACCESS',
    message: 'You can only access resources from your own company',
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'You do not have permission to access this resource',
  },
  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    message: 'The requested resource was not found or you do not have access to it',
  },
} as const;