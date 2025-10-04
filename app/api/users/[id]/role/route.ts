import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { adminOnly } from '@/lib/route-guards';
import { ApiResponse, UserRoleSchema } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

const UpdateRoleSchema = z.object({
  role: UserRoleSchema,
  managerId: z.string().uuid().optional().nullable(),
});

// PUT /api/users/[id]/role - Update user role and manager (Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return adminOnly(async (req: NextRequest, user: any) => {
    try {
      const userId = params.id;
      const body = await request.json();
      const { role, managerId } = UpdateRoleSchema.parse(body);

      // Prevent self-role modification to avoid lockout
      if (userId === user.userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CANNOT_MODIFY_SELF_ROLE',
              message: 'You cannot modify your own role',
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

      // Validate manager if provided
      if (managerId) {
        const manager = await prisma.user.findFirst({
          where: {
            id: managerId,
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
        if (managerId === userId) {
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

        // Check if the new manager would create a circular relationship
        const wouldCreateCircle = await checkCircularReporting(managerId, userId);
        if (wouldCreateCircle) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CIRCULAR_REPORTING',
                message: 'This manager assignment would create a circular reporting relationship',
              },
              timestamp: new Date().toISOString(),
            } as ApiResponse,
            { status: 400 }
          );
        }
      }

      // Handle role change implications
      const updateData: any = { role };
      
      // If changing to EMPLOYEE, ensure they have a manager (unless they're being assigned one)
      if (role === 'EMPLOYEE' && !targetUser.managerId && !managerId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMPLOYEE_NEEDS_MANAGER',
              message: 'Employees must have a manager assigned',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 400 }
        );
      }

      // If changing from MANAGER to EMPLOYEE, handle their direct reports
      if (targetUser.role === 'MANAGER' && role === 'EMPLOYEE' && targetUser.directReports.length > 0) {
        // Reassign direct reports to null (they'll need to be reassigned manually)
        await prisma.user.updateMany({
          where: {
            managerId: userId,
          },
          data: {
            managerId: null,
          },
        });
      }

      // Update manager if provided
      if (managerId !== undefined) {
        updateData.managerId = managerId;
      }

      // Update user role and manager
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
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

      // Return updated user data
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
            message: 'User role updated successfully',
            reassignedReports: targetUser.role === 'MANAGER' && role === 'EMPLOYEE' ? targetUser.directReports.length : 0,
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 200 }
      );
    } catch (error) {
      console.error('Update user role error:', error);

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
  })(request);
}

/**
 * Check if assigning a manager would create a circular reporting relationship
 */
async function checkCircularReporting(managerId: string, userId: string): Promise<boolean> {
  const visited = new Set<string>();
  let currentId = managerId;

  while (currentId && !visited.has(currentId)) {
    if (currentId === userId) {
      return true; // Circular relationship detected
    }

    visited.add(currentId);

    const manager = await prisma.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });

    currentId = manager?.managerId || '';
  }

  return false;
}