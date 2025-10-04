import { prisma } from '@/lib/db';
import { JWTPayload } from '@/lib/types';
import { 
  PaginationOptions, 
  SortOptions, 
  PaginatedResult,
  DatabaseTransaction 
} from '@/lib/database-types';

/**
 * Tenant context for multi-tenant operations
 */
export interface TenantContext {
  companyId: string;
  userId: string;
  role: string;
}

/**
 * Multi-tenant database service that ensures all operations are scoped to the user's company
 */
export class TenantService {
  private context: TenantContext;

  constructor(user: JWTPayload) {
    this.context = {
      companyId: user.companyId,
      userId: user.userId,
      role: user.role,
    };
  }

  /**
   * Get the tenant context
   */
  getContext(): TenantContext {
    return this.context;
  }

  /**
   * Create a company-scoped where clause
   */
  private createCompanyScope<T extends Record<string, any>>(
    where: T = {} as T
  ): T & { companyId: string } {
    return {
      ...where,
      companyId: this.context.companyId,
    };
  }

  /**
   * User operations with company scoping
   */
  async getUsers(options: {
    where?: any;
    include?: any;
    orderBy?: any;
    pagination?: PaginationOptions;
  } = {}) {
    const { where = {}, include, orderBy, pagination } = options;
    
    const scopedWhere = this.createCompanyScope(where);
    
    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: scopedWhere,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.user.count({ where: scopedWhere }),
      ]);
      
      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      } as PaginatedResult<typeof users[0]>;
    }
    
    return prisma.user.findMany({
      where: scopedWhere,
      include,
      orderBy,
    });
  }

  async getUserById(userId: string, include?: any) {
    return prisma.user.findFirst({
      where: this.createCompanyScope({ id: userId }),
      include,
    });
  }

  async createUser(data: any) {
    return prisma.user.create({
      data: {
        ...data,
        companyId: this.context.companyId,
      },
    });
  }

  async updateUser(userId: string, data: any) {
    return prisma.user.updateMany({
      where: this.createCompanyScope({ id: userId }),
      data,
    });
  }

  async deleteUser(userId: string) {
    return prisma.user.deleteMany({
      where: this.createCompanyScope({ id: userId }),
    });
  }

  /**
   * Expense operations with company scoping
   */
  async getExpenses(options: {
    where?: any;
    include?: any;
    orderBy?: any;
    pagination?: PaginationOptions;
  } = {}) {
    const { where = {}, include, orderBy, pagination } = options;
    
    const scopedWhere = this.createCompanyScope(where);
    
    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      
      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where: scopedWhere,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.expense.count({ where: scopedWhere }),
      ]);
      
      return {
        data: expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      } as PaginatedResult<typeof expenses[0]>;
    }
    
    return prisma.expense.findMany({
      where: scopedWhere,
      include,
      orderBy,
    });
  }

  async getExpenseById(expenseId: string, include?: any) {
    return prisma.expense.findFirst({
      where: this.createCompanyScope({ id: expenseId }),
      include,
    });
  }

  async createExpense(data: any) {
    return prisma.expense.create({
      data: {
        ...data,
        companyId: this.context.companyId,
        userId: data.userId || this.context.userId,
      },
    });
  }

  async updateExpense(expenseId: string, data: any) {
    return prisma.expense.updateMany({
      where: this.createCompanyScope({ id: expenseId }),
      data,
    });
  }

  async deleteExpense(expenseId: string) {
    return prisma.expense.deleteMany({
      where: this.createCompanyScope({ id: expenseId }),
    });
  }

  /**
   * Approval Rule operations with company scoping
   */
  async getApprovalRules(options: {
    where?: any;
    include?: any;
    orderBy?: any;
    pagination?: PaginationOptions;
  } = {}) {
    const { where = {}, include, orderBy, pagination } = options;
    
    const scopedWhere = this.createCompanyScope(where);
    
    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      
      const [rules, total] = await Promise.all([
        prisma.approvalRule.findMany({
          where: scopedWhere,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.approvalRule.count({ where: scopedWhere }),
      ]);
      
      return {
        data: rules,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      } as PaginatedResult<typeof rules[0]>;
    }
    
    return prisma.approvalRule.findMany({
      where: scopedWhere,
      include,
      orderBy,
    });
  }

  async getApprovalRuleById(ruleId: string, include?: any) {
    return prisma.approvalRule.findFirst({
      where: this.createCompanyScope({ id: ruleId }),
      include,
    });
  }

  async createApprovalRule(data: any) {
    return prisma.approvalRule.create({
      data: {
        ...data,
        companyId: this.context.companyId,
      },
    });
  }

  async updateApprovalRule(ruleId: string, data: any) {
    return prisma.approvalRule.updateMany({
      where: this.createCompanyScope({ id: ruleId }),
      data,
    });
  }

  async deleteApprovalRule(ruleId: string) {
    return prisma.approvalRule.deleteMany({
      where: this.createCompanyScope({ id: ruleId }),
    });
  }

  /**
   * Approval operations with company scoping
   */
  async getApprovals(options: {
    where?: any;
    include?: any;
    orderBy?: any;
    pagination?: PaginationOptions;
  } = {}) {
    const { where = {}, include, orderBy, pagination } = options;
    
    // For approvals, we need to scope through the expense relationship
    const scopedWhere = {
      ...where,
      expense: {
        companyId: this.context.companyId,
        ...(where.expense || {}),
      },
    };
    
    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      
      const [approvals, total] = await Promise.all([
        prisma.approval.findMany({
          where: scopedWhere,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.approval.count({ where: scopedWhere }),
      ]);
      
      return {
        data: approvals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      } as PaginatedResult<typeof approvals[0]>;
    }
    
    return prisma.approval.findMany({
      where: scopedWhere,
      include,
      orderBy,
    });
  }

  async getApprovalById(approvalId: string, include?: any) {
    return prisma.approval.findFirst({
      where: {
        id: approvalId,
        expense: {
          companyId: this.context.companyId,
        },
      },
      include,
    });
  }

  /**
   * Company statistics and aggregations
   */
  async getCompanyStats() {
    const [
      userCount,
      expenseCount,
      approvalRuleCount,
      expenseStats,
      expensesByStatus,
      expensesByCategory,
    ] = await Promise.all([
      prisma.user.count({
        where: { companyId: this.context.companyId },
      }),
      prisma.expense.count({
        where: { companyId: this.context.companyId },
      }),
      prisma.approvalRule.count({
        where: { companyId: this.context.companyId },
      }),
      prisma.expense.aggregate({
        where: { companyId: this.context.companyId },
        _sum: { convertedAmount: true },
        _avg: { convertedAmount: true },
        _max: { convertedAmount: true },
        _min: { convertedAmount: true },
      }),
      prisma.expense.groupBy({
        by: ['status'],
        where: { companyId: this.context.companyId },
        _count: { id: true },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { companyId: this.context.companyId },
        _sum: { convertedAmount: true },
        _count: { id: true },
      }),
    ]);

    return {
      users: userCount,
      expenses: expenseCount,
      approvalRules: approvalRuleCount,
      expenseStats: {
        total: expenseStats._sum.convertedAmount || 0,
        average: expenseStats._avg.convertedAmount || 0,
        highest: expenseStats._max.convertedAmount || 0,
        lowest: expenseStats._min.convertedAmount || 0,
      },
      expensesByStatus: expensesByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      expensesByCategory: expensesByCategory.map(item => ({
        category: item.category,
        total: item._sum.convertedAmount || 0,
        count: item._count.id,
      })),
    };
  }

  /**
   * Transaction support with company scoping
   */
  async transaction<T>(
    callback: (tx: DatabaseTransaction, tenantService: TenantService) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      // Create a new tenant service instance that uses the transaction client
      const txTenantService = new TenantService({
        companyId: this.context.companyId,
        userId: this.context.userId,
        role: this.context.role,
      } as JWTPayload);
      
      // Override the prisma client with the transaction client
      (txTenantService as any).prisma = tx;
      
      return callback(tx, txTenantService);
    });
  }

  /**
   * Validate that a resource belongs to the current company
   */
  async validateCompanyAccess(resourceType: 'user' | 'expense' | 'approvalRule', resourceId: string): Promise<boolean> {
    try {
      let resource;
      
      switch (resourceType) {
        case 'user':
          resource = await prisma.user.findFirst({
            where: { id: resourceId, companyId: this.context.companyId },
            select: { id: true },
          });
          break;
        case 'expense':
          resource = await prisma.expense.findFirst({
            where: { id: resourceId, companyId: this.context.companyId },
            select: { id: true },
          });
          break;
        case 'approvalRule':
          resource = await prisma.approvalRule.findFirst({
            where: { id: resourceId, companyId: this.context.companyId },
            select: { id: true },
          });
          break;
        default:
          return false;
      }
      
      return !!resource;
    } catch (error) {
      console.error('Error validating company access:', error);
      return false;
    }
  }

  /**
   * Get user's accessible resources based on role
   */
  async getAccessibleUserIds(): Promise<string[]> {
    if (this.context.role === 'ADMIN') {
      // Admins can access all users in their company
      const users = await prisma.user.findMany({
        where: { companyId: this.context.companyId },
        select: { id: true },
      });
      return users.map(user => user.id);
    } else if (this.context.role === 'MANAGER') {
      // Managers can access their direct reports and themselves
      const manager = await prisma.user.findUnique({
        where: { id: this.context.userId },
        include: {
          directReports: {
            select: { id: true },
          },
        },
      });
      
      const accessibleIds = [this.context.userId];
      if (manager?.directReports) {
        accessibleIds.push(...manager.directReports.map(report => report.id));
      }
      return accessibleIds;
    } else {
      // Employees can only access themselves
      return [this.context.userId];
    }
  }

  /**
   * Check if user can access another user's data
   */
  async canAccessUser(targetUserId: string): Promise<boolean> {
    const accessibleIds = await this.getAccessibleUserIds();
    return accessibleIds.includes(targetUserId);
  }
}

/**
 * Factory function to create a tenant service instance
 */
export function createTenantService(user: JWTPayload): TenantService {
  return new TenantService(user);
}

/**
 * Middleware function to add tenant service to request
 */
export function withTenantService<T extends { user: JWTPayload }>(
  handler: (request: T, tenantService: TenantService) => Promise<any>
) {
  return async (request: T) => {
    const tenantService = createTenantService(request.user);
    return handler(request, tenantService);
  };
}