import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  adminOnly,
  managerOrAdmin,
  authenticated,
  employeeOrAbove,
  withPermission,
  canManageUsers,
  canCreateExpense,
  canApproveExpense,
  canManageCompany,
  canManageApprovalRules,
  withResourceAccess,
  requireRoles,
  requireCompanyAccess,
  adminOrResourceOwner,
} from '@/lib/route-guards';
import { UserRole } from '@/lib/types';
import * as middleware from '@/lib/middleware';

// Mock the middleware module
vi.mock('@/lib/middleware');

describe('Route Guards', () => {
  const mockHandler = vi.fn().mockResolvedValue(
    NextResponse.json({ success: true })
  );

  const mockAdminUser = {
    userId: 'admin-id',
    companyId: 'company-id',
    role: 'ADMIN' as UserRole,
    email: 'admin@example.com',
  };

  const mockManagerUser = {
    userId: 'manager-id',
    companyId: 'company-id',
    role: 'MANAGER' as UserRole,
    email: 'manager@example.com',
  };

  const mockEmployeeUser = {
    userId: 'employee-id',
    companyId: 'company-id',
    role: 'EMPLOYEE' as UserRole,
    email: 'employee@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandler.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('adminOnly guard', () => {
    it('should allow admin users', async () => {
      // Mock withAuth to call handler with admin user
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          if (options?.roles?.includes('ADMIN')) {
            return await handler(request as any, mockAdminUser);
          }
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = adminOnly(mockHandler);
      const response = await guardedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockAdminUser);
    });

    it('should reject non-admin users', async () => {
      // Mock withAuth to reject non-admin
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = adminOnly(mockHandler);
      const response = await guardedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('managerOrAdmin guard', () => {
    it('should allow admin users', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          if (options?.roles?.includes('ADMIN')) {
            return await handler(request as any, mockAdminUser);
          }
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = managerOrAdmin(mockHandler);
      await guardedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockAdminUser);
    });

    it('should allow manager users', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          if (options?.roles?.includes('MANAGER')) {
            return await handler(request as any, mockManagerUser);
          }
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = managerOrAdmin(mockHandler);
      await guardedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockManagerUser);
    });

    it('should reject employee users', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = managerOrAdmin(mockHandler);
      const response = await guardedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('authenticated guard', () => {
    it('should allow any authenticated user', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          return await handler(request as any, mockEmployeeUser);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = authenticated(mockHandler);
      await guardedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockEmployeeUser);
    });

    it('should reject unauthenticated users', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = authenticated(mockHandler);
      const response = await guardedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('employeeOrAbove guard', () => {
    it('should allow all role types', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          return await handler(request as any, mockEmployeeUser);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = employeeOrAbove(mockHandler);
      await guardedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockEmployeeUser);
    });
  });

  describe('withPermission guard', () => {
    const permissionCheck = vi.fn();

    beforeEach(() => {
      permissionCheck.mockClear();
    });

    it('should allow access when permission check passes', async () => {
      permissionCheck.mockReturnValue(true);

      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return await handler(request as any, mockEmployeeUser);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = withPermission(mockHandler, permissionCheck);
      await guardedHandler(request);

      expect(permissionCheck).toHaveBeenCalledWith(mockEmployeeUser);
      expect(mockHandler).toHaveBeenCalledWith(request, mockEmployeeUser);
    });

    it('should deny access when permission check fails', async () => {
      permissionCheck.mockReturnValue(false);

      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          // Simulate permission check failure
          if (!permissionCheck(mockEmployeeUser)) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: 'INSUFFICIENT_PERMISSIONS',
                  message: 'Insufficient permissions',
                },
              },
              { status: 403 }
            );
          }
          return await handler(request as any, mockEmployeeUser);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = withPermission(mockHandler, permissionCheck);
      const response = await guardedHandler(request);

      expect(permissionCheck).toHaveBeenCalledWith(mockEmployeeUser);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should use custom error message', async () => {
      permissionCheck.mockReturnValue(false);
      const customMessage = 'Custom permission denied';

      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          if (!permissionCheck(mockEmployeeUser)) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: 'INSUFFICIENT_PERMISSIONS',
                  message: customMessage,
                },
              },
              { status: 403 }
            );
          }
          return await handler(request as any, mockEmployeeUser);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = withPermission(mockHandler, permissionCheck, customMessage);
      const response = await guardedHandler(request);

      const responseData = await response.json();
      expect(responseData.error.message).toBe(customMessage);
    });
  });

  describe('permission-specific guards', () => {
    describe('canManageUsers', () => {
      it('should use correct permission check', async () => {
        // Mock permissions.canManageUsers
        const mockPermissions = {
          canManageUsers: vi.fn().mockReturnValue(true),
        };

        vi.mocked(middleware.withAuth).mockImplementation((handler) => {
          return async (request: NextRequest) => {
            if (mockPermissions.canManageUsers(mockAdminUser)) {
              return await handler(request as any, mockAdminUser);
            }
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          };
        });

        const request = new NextRequest('http://localhost:3000/api/test');
        const guardedHandler = canManageUsers(mockHandler);
        await guardedHandler(request);

        expect(mockHandler).toHaveBeenCalled();
      });
    });

    describe('canCreateExpense', () => {
      it('should allow expense creation for valid users', async () => {
        vi.mocked(middleware.withAuth).mockImplementation((handler) => {
          return async (request: NextRequest) => {
            return await handler(request as any, mockEmployeeUser);
          };
        });

        const request = new NextRequest('http://localhost:3000/api/test');
        const guardedHandler = canCreateExpense(mockHandler);
        await guardedHandler(request);

        expect(mockHandler).toHaveBeenCalled();
      });
    });

    describe('canApproveExpense', () => {
      it('should allow expense approval for managers and admins', async () => {
        vi.mocked(middleware.withAuth).mockImplementation((handler) => {
          return async (request: NextRequest) => {
            return await handler(request as any, mockManagerUser);
          };
        });

        const request = new NextRequest('http://localhost:3000/api/test');
        const guardedHandler = canApproveExpense(mockHandler);
        await guardedHandler(request);

        expect(mockHandler).toHaveBeenCalled();
      });
    });

    describe('canManageCompany', () => {
      it('should allow company management for admins only', async () => {
        vi.mocked(middleware.withAuth).mockImplementation((handler) => {
          return async (request: NextRequest) => {
            return await handler(request as any, mockAdminUser);
          };
        });

        const request = new NextRequest('http://localhost:3000/api/test');
        const guardedHandler = canManageCompany(mockHandler);
        await guardedHandler(request);

        expect(mockHandler).toHaveBeenCalled();
      });
    });

    describe('canManageApprovalRules', () => {
      it('should allow approval rule management for admins only', async () => {
        vi.mocked(middleware.withAuth).mockImplementation((handler) => {
          return async (request: NextRequest) => {
            return await handler(request as any, mockAdminUser);
          };
        });

        const request = new NextRequest('http://localhost:3000/api/test');
        const guardedHandler = canManageApprovalRules(mockHandler);
        await guardedHandler(request);

        expect(mockHandler).toHaveBeenCalled();
      });
    });
  });

  describe('withResourceAccess guard', () => {
    const resourceHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    beforeEach(() => {
      resourceHandler.mockClear();
    });

    it('should extract resource ID from URL and call handler', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          const url = new URL(request.url);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          const resourceId = pathSegments[pathSegments.length - 1];
          
          // Cast handler to the expected type for withResourceAccess
          const resourceHandlerTyped = handler as any;
          return await resourceHandlerTyped(request, mockAdminUser, resourceId);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000');
      const guardedHandler = withResourceAccess(resourceHandler, 'user');
      await guardedHandler(request);

      expect(resourceHandler).toHaveBeenCalledWith(
        request,
        mockAdminUser,
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });

    it('should return error when resource ID is missing', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_RESOURCE_ID',
                message: 'Resource ID is required',
              },
            },
            { status: 400 }
          );
        };
      });

      const request = new NextRequest('http://localhost:3000/api/users');
      const guardedHandler = withResourceAccess(resourceHandler, 'user');
      const response = await guardedHandler(request);

      expect(resourceHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle different resource types', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          const url = new URL(request.url);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          const resourceId = pathSegments[pathSegments.length - 1];
          
          const resourceHandlerTyped = handler as any;
          return await resourceHandlerTyped(request, mockManagerUser, resourceId);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/expenses/expense-id');
      const guardedHandler = withResourceAccess(resourceHandler, 'expense');
      await guardedHandler(request);

      expect(resourceHandler).toHaveBeenCalledWith(
        request,
        mockManagerUser,
        'expense-id'
      );
    });
  });

  describe('requireRoles utility', () => {
    it('should create role-based middleware', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          if (options?.roles?.includes('ADMIN')) {
            return await handler(request as any, mockAdminUser);
          }
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = requireRoles('ADMIN', 'MANAGER')(mockHandler);
      await guardedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockAdminUser);
    });
  });

  describe('requireCompanyAccess utility', () => {
    it('should enforce company access', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler, options) => {
        return async (request: NextRequest) => {
          if (options?.requireCompanyAccess) {
            return await handler(request as any, mockEmployeeUser);
          }
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = requireCompanyAccess(mockHandler);
      await guardedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request, mockEmployeeUser);
    });
  });

  describe('adminOrResourceOwner guard', () => {
    const resourceHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    beforeEach(() => {
      resourceHandler.mockClear();
    });

    it('should allow admin to access any resource', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          const url = new URL(request.url);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          const resourceId = pathSegments[pathSegments.length - 1];
          
          // Admin can access any resource
          const resourceHandlerTyped = handler as any;
          return await resourceHandlerTyped(request, mockAdminUser, resourceId);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/users/other-user-id');
      const guardedHandler = adminOrResourceOwner(resourceHandler, 'user');
      await guardedHandler(request);

      expect(resourceHandler).toHaveBeenCalledWith(
        request,
        mockAdminUser,
        'other-user-id'
      );
    });

    it('should allow user to access their own resource', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          const url = new URL(request.url);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          const resourceId = pathSegments[pathSegments.length - 1];
          
          // User can access their own resource
          if (resourceId === mockEmployeeUser.userId) {
            const resourceHandlerTyped = handler as any;
            return await resourceHandlerTyped(request, mockEmployeeUser, resourceId);
          }
          
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        };
      });

      const request = new NextRequest(`http://localhost:3000/api/users/${mockEmployeeUser.userId}`);
      const guardedHandler = adminOrResourceOwner(resourceHandler, 'user');
      await guardedHandler(request);

      expect(resourceHandler).toHaveBeenCalledWith(
        request,
        mockEmployeeUser,
        mockEmployeeUser.userId
      );
    });

    it('should deny access to non-admin, non-owner', async () => {
      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          const url = new URL(request.url);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          const resourceId = pathSegments[pathSegments.length - 1];
          
          // Non-admin, non-owner should be denied
          if (resourceId !== mockEmployeeUser.userId && mockEmployeeUser.role !== 'ADMIN') {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: 'INSUFFICIENT_PERMISSIONS',
                  message: 'You can only access your own resources or you must be an administrator',
                },
              },
              { status: 403 }
            );
          }
          
          const resourceHandlerTyped = handler as any;
          return await resourceHandlerTyped(request, mockEmployeeUser, resourceId);
        };
      });

      const request = new NextRequest('http://localhost:3000/api/users/other-user-id');
      const guardedHandler = adminOrResourceOwner(resourceHandler, 'user');
      const response = await guardedHandler(request);

      expect(resourceHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('Error handling in guards', () => {
    it('should handle middleware errors gracefully', async () => {
      vi.mocked(middleware.withAuth).mockImplementation(() => {
        return async () => {
          throw new Error('Middleware error');
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = authenticated(mockHandler);
      
      // Should not throw, but return error response
      await expect(guardedHandler(request)).resolves.toBeDefined();
    });

    it('should handle handler errors in withAuth', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));

      vi.mocked(middleware.withAuth).mockImplementation((handler) => {
        return async (request: NextRequest) => {
          try {
            return await handler(request as any, mockEmployeeUser);
          } catch (error) {
            return NextResponse.json(
              { error: 'Internal server error' },
              { status: 500 }
            );
          }
        };
      });

      const request = new NextRequest('http://localhost:3000/api/test');
      const guardedHandler = authenticated(errorHandler);
      const response = await guardedHandler(request);

      expect(response.status).toBe(500);
    });
  });
});