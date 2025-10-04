import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { ApiResponse } from '@/lib/types';

// GET /api/users/[id] - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      );
    }

    const user = authResult.user;
    try {
      const userId = params.id;

      // Check permissions
      if (user.role !== 'ADMIN' && user.userId !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'You can only view your own profile',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: {
          id: userId,
          companyId: user.companyId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          companyId: true,
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
          data: targetUser,
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
            message: 'Failed to fetch user',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      );
    }

    const user = authResult.user;
    try {
      const userId = params.id;

      // Only admins can update other users
      if (user.role !== 'ADMIN' && user.userId !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only admins can update other users',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      const body = await request.json();
      const { role, managerId, isActive } = body;

      // Verify user exists and is in the same company
      const existingUser = await prisma.user.findUnique({
        where: {
          id: userId,
          companyId: user.companyId,
        },
      });

      if (!existingUser) {
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

      // Build update data
      const updateData: any = {};
      if (role !== undefined) updateData.role = role;
      if (managerId !== undefined) updateData.managerId = managerId || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update the user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          role: true,
          companyId: true,
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
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: updatedUser,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 200 }
      );
    } catch (error) {
      console.error('Update user error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update user',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      );
    }

    const user = authResult.user;
    try {
      const userId = params.id;

      // Only admins can delete users
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only admins can delete users',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      // Prevent self-deletion
      if (user.userId === userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_OPERATION',
              message: 'You cannot delete your own account',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 400 }
        );
      }

      // Verify user exists and is in the same company
      const existingUser = await prisma.user.findUnique({
        where: {
          id: userId,
          companyId: user.companyId,
        },
      });

      if (!existingUser) {
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

      // Soft delete by setting isActive to false
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      return NextResponse.json(
        {
          success: true,
          data: { message: 'User deleted successfully' },
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
            message: 'Failed to delete user',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete user',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    );
  }
}
