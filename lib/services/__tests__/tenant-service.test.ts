import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TenantService } from '../tenant-service';
import { JWTPayload, UserRole } from '@/lib/types';

// Mock Prisma
const mockPrisma = {
  user: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  expense: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  approvalRule: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  approval: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

describe('TenantService', () => {
  let tenantService: TenantService;
  let mockUser: JWTPayload;

  beforeEach(() => {
    mockUser = {
      userId: 'user-123',
      companyId: 'company-456',
      role: UserRole.ADMIN,
      email: 'admin@company.com',
    };
    tenantService = new TenantService(mockUser);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getContext', () => {
    it('should return the tenant context', () => {
      const context = tenantService.getContext();
      expect(context).toEqual({
        companyId: 'company-456',
        userId: 'user-123',
        role: 'ADMIN',
      });
    });
  });

  describe('getUsers', () => {
    it('should scope users to company', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@company.com', companyId: 'company-456' },
        { id: 'user-2', email: 'user2@company.com', companyId: 'company-456' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await tenantService.getUsers();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-456' },
        include: undefined,
        orderBy: undefined,
      });
      expect(result).toEqual(mockUsers);
    });

    it('should apply additional where conditions while maintaining company scope', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@company.com', role: 'MANAGER', companyId: 'company-456' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      await tenantService.getUsers({
        where: { role: 'MANAGER' },
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { 
          companyId: 'company-456',
          role: 'MANAGER',
        },
        include: undefined,
        orderBy: undefined,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@company.com', companyId: 'company-456' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(10);

      const result = await tenantService.getUsers({
        pagination: { page: 2, limit: 5 },
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-456' },
        include: undefined,
        orderBy: undefined,
        skip: 5,
        take: 5,
      });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { companyId: 'company-456' },
      });

      expect(result).toEqual({
        data: mockUsers,
        pagination: {
          page: 2,
          limit: 5,
          total: 10,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should scope user lookup to company', async () => {
      const mockUser = { id: 'user-1', email: 'user1@company.com', companyId: 'company-456' };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await tenantService.getUserById('user-1');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { 
          id: 'user-1',
          companyId: 'company-456',
        },
        include: undefined,
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('should automatically add company ID when creating user', async () => {
      const userData = {
        email: 'newuser@company.com',
        password: 'hashedpassword',
        role: 'EMPLOYEE',
      };

      const mockCreatedUser = {
        id: 'user-new',
        ...userData,
        companyId: 'company-456',
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await tenantService.createUser(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          ...userData,
          companyId: 'company-456',
        },
      });
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('getExpenses', () => {
    it('should scope expenses to company', async () => {
      const mockExpenses = [
        { id: 'expense-1', companyId: 'company-456', userId: 'user-1' },
        { id: 'expense-2', companyId: 'company-456', userId: 'user-2' },
      ];

      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await tenantService.getExpenses();

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-456' },
        include: undefined,
        orderBy: undefined,
      });
      expect(result).toEqual(mockExpenses);
    });
  });

  describe('createExpense', () => {
    it('should automatically add company ID and user ID when creating expense', async () => {
      const expenseData = {
        originalAmount: 100,
        originalCurrency: 'USD',
        category: 'Travel',
        description: 'Business trip',
      };

      const mockCreatedExpense = {
        id: 'expense-new',
        ...expenseData,
        companyId: 'company-456',
        userId: 'user-123',
      };

      mockPrisma.expense.create.mockResolvedValue(mockCreatedExpense);

      const result = await tenantService.createExpense(expenseData);

      expect(mockPrisma.expense.create).toHaveBeenCalledWith({
        data: {
          ...expenseData,
          companyId: 'company-456',
          userId: 'user-123',
        },
      });
      expect(result).toEqual(mockCreatedExpense);
    });

    it('should use provided userId if specified', async () => {
      const expenseData = {
        originalAmount: 100,
        originalCurrency: 'USD',
        category: 'Travel',
        description: 'Business trip',
        userId: 'other-user-456',
      };

      const mockCreatedExpense = {
        id: 'expense-new',
        ...expenseData,
        companyId: 'company-456',
      };

      mockPrisma.expense.create.mockResolvedValue(mockCreatedExpense);

      await tenantService.createExpense(expenseData);

      expect(mockPrisma.expense.create).toHaveBeenCalledWith({
        data: {
          ...expenseData,
          companyId: 'company-456',
          userId: 'other-user-456',
        },
      });
    });
  });

  describe('getApprovals', () => {
    it('should scope approvals through expense relationship', async () => {
      const mockApprovals = [
        { id: 'approval-1', expenseId: 'expense-1' },
        { id: 'approval-2', expenseId: 'expense-2' },
      ];

      mockPrisma.approval.findMany.mockResolvedValue(mockApprovals);

      const result = await tenantService.getApprovals();

      expect(mockPrisma.approval.findMany).toHaveBeenCalledWith({
        where: {
          expense: {
            companyId: 'company-456',
          },
        },
        include: undefined,
        orderBy: undefined,
      });
      expect(result).toEqual(mockApprovals);
    });

    it('should merge expense conditions correctly', async () => {
      const mockApprovals = [
        { id: 'approval-1', expenseId: 'expense-1' },
      ];

      mockPrisma.approval.findMany.mockResolvedValue(mockApprovals);

      await tenantService.getApprovals({
        where: {
          status: 'PENDING',
          expense: {
            userId: 'user-123',
          },
        },
      });

      expect(mockPrisma.approval.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expense: {
            companyId: 'company-456',
            userId: 'user-123',
          },
        },
        include: undefined,
        orderBy: undefined,
      });
    });
  });

  describe('validateCompanyAccess', () => {
    it('should validate user access correctly', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const result = await tenantService.validateCompanyAccess('user', 'user-1');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { 
          id: 'user-1',
          companyId: 'company-456',
        },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false for user from different company', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await tenantService.validateCompanyAccess('user', 'user-1');

      expect(result).toBe(false);
    });

    it('should validate expense access correctly', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({ id: 'expense-1' });

      const result = await tenantService.validateCompanyAccess('expense', 'expense-1');

      expect(mockPrisma.expense.findFirst).toHaveBeenCalledWith({
        where: { 
          id: 'expense-1',
          companyId: 'company-456',
        },
        select: { id: true },
      });
      expect(result).toBe(true);
    });
  });

  describe('getAccessibleUserIds', () => {
    it('should return all user IDs for admin', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await tenantService.getAccessibleUserIds();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-456' },
        select: { id: true },
      });
      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should return manager and direct reports for manager role', async () => {
      const managerTenantService = new TenantService({
        ...mockUser,
        role: UserRole.MANAGER,
      });

      const mockManager = {
        id: 'user-123',
        directReports: [
          { id: 'user-456' },
          { id: 'user-789' },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockManager);

      const result = await managerTenantService.getAccessibleUserIds();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: {
          directReports: {
            select: { id: true },
          },
        },
      });
      expect(result).toEqual(['user-123', 'user-456', 'user-789']);
    });

    it('should return only self for employee role', async () => {
      const employeeTenantService = new TenantService({
        ...mockUser,
        role: UserRole.EMPLOYEE,
      });

      const result = await employeeTenantService.getAccessibleUserIds();

      expect(result).toEqual(['user-123']);
    });
  });

  describe('transaction', () => {
    it('should execute callback with transaction client', async () => {
      const mockTx = { user: { create: vi.fn() } };
      const mockCallback = vi.fn().mockResolvedValue('result');

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await tenantService.transaction(mockCallback);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(mockTx, expect.any(TenantService));
      expect(result).toBe('result');
    });
  });
});