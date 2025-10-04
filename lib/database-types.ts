import { Prisma } from '@prisma/client';

// Prisma-generated types with relations
export type CompanyWithRelations = Prisma.CompanyGetPayload<{
  include: {
    users: true;
    expenses: true;
    approvalRules: true;
  };
}>;

export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    company: true;
    manager: true;
    directReports: true;
    expenses: true;
    approvals: true;
    approvalSteps: true;
  };
}>;

export type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: {
    company: true;
    user: true;
    receipt: true;
    approvals: {
      include: {
        step: true;
        approver: true;
      };
    };
  };
}>;

export type ApprovalRuleWithRelations = Prisma.ApprovalRuleGetPayload<{
  include: {
    company: true;
    approvalSteps: {
      include: {
        approver: true;
        approvals: true;
      };
    };
  };
}>;

export type ApprovalWithRelations = Prisma.ApprovalGetPayload<{
  include: {
    expense: {
      include: {
        user: true;
        company: true;
      };
    };
    step: {
      include: {
        rule: true;
      };
    };
    approver: true;
  };
}>;

// Database query options
export type CompanyInclude = Prisma.CompanyInclude;
export type UserInclude = Prisma.UserInclude;
export type ExpenseInclude = Prisma.ExpenseInclude;
export type ApprovalRuleInclude = Prisma.ApprovalRuleInclude;
export type ApprovalInclude = Prisma.ApprovalInclude;

// Where clauses for complex queries
export type CompanyWhereInput = Prisma.CompanyWhereInput;
export type UserWhereInput = Prisma.UserWhereInput;
export type ExpenseWhereInput = Prisma.ExpenseWhereInput;
export type ApprovalRuleWhereInput = Prisma.ApprovalRuleWhereInput;
export type ApprovalWhereInput = Prisma.ApprovalWhereInput;

// Order by clauses
export type CompanyOrderByInput = Prisma.CompanyOrderByWithRelationInput;
export type UserOrderByInput = Prisma.UserOrderByWithRelationInput;
export type ExpenseOrderByInput = Prisma.ExpenseOrderByWithRelationInput;
export type ApprovalRuleOrderByInput = Prisma.ApprovalRuleOrderByWithRelationInput;
export type ApprovalOrderByInput = Prisma.ApprovalOrderByWithRelationInput;

// Create and update inputs
export type CompanyCreateInput = Prisma.CompanyCreateInput;
export type CompanyUpdateInput = Prisma.CompanyUpdateInput;
export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;
export type ExpenseCreateInput = Prisma.ExpenseCreateInput;
export type ExpenseUpdateInput = Prisma.ExpenseUpdateInput;
export type ApprovalRuleCreateInput = Prisma.ApprovalRuleCreateInput;
export type ApprovalRuleUpdateInput = Prisma.ApprovalRuleUpdateInput;
export type ApprovalCreateInput = Prisma.ApprovalCreateInput;
export type ApprovalUpdateInput = Prisma.ApprovalUpdateInput;

// Utility types for database operations
export interface PaginationOptions {
  page: number;
  limit: number;
  skip?: number;
}

export interface SortOptions<T> {
  sortBy: keyof T;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Database transaction types
export type DatabaseTransaction = Prisma.TransactionClient;

// Aggregate result types
export type ExpenseAggregateResult = Prisma.ExpenseAggregateArgs;
export type UserAggregateResult = Prisma.UserAggregateArgs;

// Database connection types
export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
}

// Migration types
export interface MigrationInfo {
  id: string;
  checksum: string;
  finished_at: Date | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date;
  applied_steps_count: number;
}