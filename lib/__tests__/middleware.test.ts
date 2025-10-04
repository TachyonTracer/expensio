import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  authenticate,
  authorize,
  authorizeResourceAccess,
  authorizeCompanyAccess,
  permissions,
  withAuth,
  authenticateRequest,
} from '@/lib/middleware';
import { JWTPayload, UserRole } from '@/lib/types';
import * as auth from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    expense: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth');

describe('Authentication and Authorization Middleware', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    companyId: '123e4567-e89b-12d3-a456-426614174001',
    email: 'test@example.com',
    role: 'EMPLOYEE' as UserRole,
    isActive: true,
    company: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Test Company',
      country: 'US',
      baseCurrency: 'USD',
    },
    manager: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      email: 'manager@example.com',
      role: 'MANAGER',
    },
    directReports: [],
  };

  const mockJWTPayload: JWTPayload = {
    userId: mockUser.id,
    companyId: mockUser.companyId,
    role: mockUser.role,
    email: mockUser.email,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticate function', () => {
    it('should authenticate valid token successfully', async () => {
      // Mock auth functions
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      // Mock database call
      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await authenticate(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.userId).toBe(mockUser.id);
      expect(result.user?.company).toBeDefined();
    });

    it('should fail authentication when token is missing', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/test');
      const result = await authenticate(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.user).toBeUndefined();
    });

    it('should fail authentication when token is invalid', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('invalid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer invalid-token' },
      });

      const result = await authenticate(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should fail authentication when user is not found', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await authenticate(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should fail authentication when user is inactive', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await authenticate(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await authenticate(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });
  });

  describe('authorize function', () => {
    it('should authorize user with correct role', async () => {
      // Mock successful authentication
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const authorizeMiddleware = authorize(['EMPLOYEE', 'MANAGER']);
      const result = await authorizeMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should reject user with insufficient role', async () => {
      // Mock successful authentication
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const authorizeMiddleware = authorize(['ADMIN']);
      const result = await authorizeMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should fail authorization when authentication fails', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/test');
      const authorizeMiddleware = authorize(['EMPLOYEE']);
      const result = await authorizeMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });
  });

  describe('authorizeResourceAccess function', () => {
    const adminUser = {
      ...mockUser,
      role: 'ADMIN' as UserRole,
    };

    const managerUser = {
      ...mockUser,
      role: 'MANAGER' as UserRole,
      directReports: [
        { id: 'employee-1', email: 'emp1@example.com', role: 'EMPLOYEE' },
        { id: 'employee-2', email: 'emp2@example.com', role: 'EMPLOYEE' },
      ],
    };

    it('should allow admin to access any resource', async () => {
      const result = await authorizeResourceAccess(
        adminUser,
        'any-user-id',
        'user'
      );

      expect(result.success).toBe(true);
    });

    it('should allow user to access their own resource', async () => {
      const result = await authorizeResourceAccess(
        mockUser,
        mockUser.id,
        'user'
      );

      expect(result.success).toBe(true);
    });

    it('should allow manager to access direct report resource', async () => {
      const result = await authorizeResourceAccess(
        managerUser,
        'employee-1',
        'user'
      );

      expect(result.success).toBe(true);
    });

    it('should deny manager access to non-direct report resource', async () => {
      const result = await authorizeResourceAccess(
        managerUser,
        'other-employee',
        'user'
      );

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should deny employee access to other user resource', async () => {
      const result = await authorizeResourceAccess(
        mockUser,
        'other-user-id',
        'user'
      );

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should handle expense resource access for managers', async () => {
      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.expense.findFirst).mockResolvedValue({
        id: 'expense-1',
        userId: 'employee-1',
      } as any);

      const result = await authorizeResourceAccess(
        managerUser,
        'employee-1',
        'expense'
      );

      expect(result.success).toBe(true);
    });

    it('should handle database errors in resource access', async () => {
      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.expense.findFirst).mockRejectedValue(new Error('Database error'));

      const result = await authorizeResourceAccess(
        managerUser,
        'employee-1',
        'expense'
      );

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });
  });

  describe('authorizeCompanyAccess function', () => {
    it('should allow access to same company resource', () => {
      const result = authorizeCompanyAccess(mockUser, mockUser.companyId);

      expect(result.success).toBe(true);
    });

    it('should deny access to different company resource', () => {
      const result = authorizeCompanyAccess(mockUser, 'different-company-id');

      expect(result.success).toBe(false);
      expect(result.response).toBeDefined();
    });
  });

  describe('permissions object', () => {
    const adminUser = { ...mockUser, role: 'ADMIN' as UserRole };
    const managerUser = { 
      ...mockUser, 
      role: 'MANAGER' as UserRole,
      directReports: [{ id: 'employee-1' }],
    };
    const employeeUser = { ...mockUser, role: 'EMPLOYEE' as UserRole };

    describe('canManageUsers', () => {
      it('should allow admin to manage users', () => {
        expect(permissions.canManageUsers(adminUser)).toBe(true);
      });

      it('should not allow manager to manage users', () => {
        expect(permissions.canManageUsers(managerUser)).toBe(false);
      });

      it('should not allow employee to manage users', () => {
        expect(permissions.canManageUsers(employeeUser)).toBe(false);
      });
    });

    describe('canViewUser', () => {
      it('should allow admin to view any user', () => {
        expect(permissions.canViewUser(adminUser, 'any-user-id')).toBe(true);
      });

      it('should allow user to view themselves', () => {
        expect(permissions.canViewUser(employeeUser, employeeUser.userId)).toBe(true);
      });

      it('should allow manager to view direct reports', () => {
        expect(permissions.canViewUser(managerUser, 'employee-1')).toBe(true);
      });

      it('should not allow manager to view non-direct reports', () => {
        expect(permissions.canViewUser(managerUser, 'other-employee')).toBe(false);
      });

      it('should not allow employee to view other users', () => {
        expect(permissions.canViewUser(employeeUser, 'other-user-id')).toBe(false);
      });
    });

    describe('canUpdateUser', () => {
      it('should allow admin to update any user', () => {
        expect(permissions.canUpdateUser(adminUser, 'any-user-id')).toBe(true);
      });

      it('should allow user to update themselves', () => {
        expect(permissions.canUpdateUser(employeeUser, employeeUser.userId)).toBe(true);
      });

      it('should not allow user to update others', () => {
        expect(permissions.canUpdateUser(employeeUser, 'other-user-id')).toBe(false);
      });
    });

    describe('canDeleteUser', () => {
      it('should allow admin to delete users', () => {
        expect(permissions.canDeleteUser(adminUser)).toBe(true);
      });

      it('should not allow manager to delete users', () => {
        expect(permissions.canDeleteUser(managerUser)).toBe(false);
      });

      it('should not allow employee to delete users', () => {
        expect(permissions.canDeleteUser(employeeUser)).toBe(false);
      });
    });

    describe('canCreateExpense', () => {
      it('should allow all roles to create expenses', () => {
        expect(permissions.canCreateExpense(adminUser)).toBe(true);
        expect(permissions.canCreateExpense(managerUser)).toBe(true);
        expect(permissions.canCreateExpense(employeeUser)).toBe(true);
      });
    });

    describe('canApproveExpense', () => {
      it('should allow admin to approve expenses', () => {
        expect(permissions.canApproveExpense(adminUser)).toBe(true);
      });

      it('should allow manager to approve expenses', () => {
        expect(permissions.canApproveExpense(managerUser)).toBe(true);
      });

      it('should not allow employee to approve expenses', () => {
        expect(permissions.canApproveExpense(employeeUser)).toBe(false);
      });
    });

    describe('canManageCompany', () => {
      it('should allow admin to manage company', () => {
        expect(permissions.canManageCompany(adminUser)).toBe(true);
      });

      it('should not allow manager to manage company', () => {
        expect(permissions.canManageCompany(managerUser)).toBe(false);
      });

      it('should not allow employee to manage company', () => {
        expect(permissions.canManageCompany(employeeUser)).toBe(false);
      });
    });

    describe('canViewCompanyData', () => {
      it('should allow admin to view company data', () => {
        expect(permissions.canViewCompanyData(adminUser)).toBe(true);
      });

      it('should allow manager to view company data', () => {
        expect(permissions.canViewCompanyData(managerUser)).toBe(true);
      });

      it('should not allow employee to view company data', () => {
        expect(permissions.canViewCompanyData(employeeUser)).toBe(false);
      });
    });
  });

  describe('withAuth higher-order function', () => {
    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('should call handler with authenticated user', async () => {
      // Mock successful authentication
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const protectedHandler = withAuth(mockHandler);
      await protectedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.any(NextRequest),
        expect.objectContaining({
          userId: mockUser.id,
          companyId: mockUser.companyId,
        })
      );
    });

    it('should return error response when authentication fails', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/test');
      const protectedHandler = withAuth(mockHandler);
      const response = await protectedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should enforce role requirements', async () => {
      // Mock successful authentication with employee role
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const protectedHandler = withAuth(mockHandler, { roles: ['ADMIN'] });
      const response = await protectedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should handle handler errors gracefully', async () => {
      // Mock successful authentication
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const protectedHandler = withAuth(errorHandler);
      const response = await protectedHandler(request);

      expect(response.status).toBe(500);
    });
  });

  describe('authenticateRequest function', () => {
    it('should return success for valid authentication', async () => {
      // Mock successful authentication
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(auth.verifyAccessToken).mockReturnValue(mockJWTPayload);

      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await authenticateRequest(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return error for failed authentication', async () => {
      vi.mocked(auth.extractTokenFromHeader).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/test');
      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Authentication failed');
    });
  });
});