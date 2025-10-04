import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { authenticated, adminOnly } from '@/lib/route-guards';
import { permissions } from '@/lib/middleware';
import { ApiResponse, UpdateUserSchema } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/users/[id] - Get user by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  return authenticated(async (req: NextRequest, user: any) => {
    try {
      const userId = params.id;

      // Check if user can view this user
      if (!permissions.canViewUser(user, userId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to view this user',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      // Get user with related data
      const targetUser = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: user.companyId, // Company-scoped access
        },
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
              isActive: true,
            },
          },
          _count: {
            select: {
              expenses: true,
              directReports: true,
              approvals: true,
            },
          },
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            user: targetUser,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 200 }
      );
    } catch (error) {
      console.error('Get user error:', error);

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
  })(request);
}

// PUT /api/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return authenticated(async (req: NextRequest, user: any) => {
    try {
      const userId = params.id;
      const body = await request.json();

      // Check if user can update this user
      if (!permissions.canUpdateUser(user, userId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You do not have permission to update this user',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      // Extend schema for password updates
      const UpdateUserWithPasswordSchema = UpdateUserSchema.extend({
        password: z.string().min(8).optional(),
      });

      const updateData = UpdateUserWithPasswordSchema.parse(body);

      // Verify target user exists and belongs to same company
      const targetUser = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: user.companyId,
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 404 }
        );
      }

      // Validate manager if being updated
      if (updateData.managerId) {
        const manager = await prisma.user.findFirst({
          where: {
            id: updateData.managerId,
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

        // Prevent circular reporting relationships
        if (updateData.managerId === userId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CIRCULAR_REPORTING',
                message: 'User cannot be their own manager',
              },
              timestamp: new Date().toISOString(),
            } as ApiResponse,
            { status: 400 }
          );
        }
      }

      // Only admins can change roles and active status
      if ((updateData.role || typeof updateData.isActive === 'boolean') && user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only administrators can change user roles or active status',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      // Prepare update data
      const updatePayload: any = {};
      
      if (updateData.email) updatePayload.email = updateData.email;
      if (updateData.role) updatePayload.role = updateData.role;
      if (updateData.managerId !== undefined) updatePayload.managerId = updateData.managerId;
      if (typeof updateData.isActive === 'boolean') updatePayload.isActive = updateData.isActive;
      
      // Hash password if provided
      if (updateData.password) {
        updatePayload.password = await hashPassword(updateData.password);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updatePayload,
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
        },
      });

      // Return updated user data (excluding password)
      const responseData = {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        companyId: updatedUser.companyId,
        managerId: updatedUser.managerId,
        manager: updatedUser.manager,
        directReports: updatedUser.directReports,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };

      return NextResponse.json(
        {
          success: true,
          data: {
            user: responseData,
            message: 'User updated successfully',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 200 }
      );
    } catch (error) {
      console.error('Update user error:', error);

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

      // Handle unique constraint violations (email already exists)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email address is already in use',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 409 }
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
  })(request);
}

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return adminOnly(async (req: NextRequest, user: any) => {
    try {
      const userId = params.id;

      // Prevent self-deletion
      if (userId === user.userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CANNOT_DELETE_SELF',
              message: 'You cannot delete your own account',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 400 }
        );
      }

      // Verify target user exists and belongs to same company
      const targetUser = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: user.companyId,
        },
        include: {
          directReports: true,
          expenses: {
            where: {
              status: { in: ['SUBMITTED', 'PENDING_APPROVAL'] },
            },
          },
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 404 }
        );
      }

      // Check for pending expenses
      if (targetUser.expenses.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_HAS_PENDING_EXPENSES',
              message: 'Cannot delete user with pending expenses. Please resolve all expenses first.',
              details: {
                pendingExpensesCount: targetUser.expenses.length,
              },
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 400 }
        );
      }

      // Handle direct reports - reassign to null or another manager
      if (targetUser.directReports.length > 0) {
        await prisma.user.updateMany({
          where: {
            managerId: userId,
          },
          data: {
            managerId: null,
          },
        });
      }

      // Soft delete by setting isActive to false instead of hard delete
      // This preserves data integrity for historical records
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${targetUser.email}`, // Prevent email conflicts
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            message: 'User deleted successfully',
            reassignedReports: targetUser.directReports.length,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 200 }
      );
    } catch (error) {
      console.error('Delete user error:', error);

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
  })(request);
}