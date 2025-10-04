import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { authenticated } from '@/lib/route-guards';
import { ApiResponse } from '@/lib/types';

const UpdateProfileSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // If changing password, require current password
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  // If changing password, require password confirmation
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: 'Password change requires current password and matching confirmation',
  path: ['newPassword'],
});

// GET /api/users/profile - Get current user profile
export const GET = authenticated(async (request: NextRequest, user: any) => {
  try {
    // Get user with detailed information
    const userProfile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        managerId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            country: true,
            baseCurrency: true,
          },
        },
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
          where: {
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

    if (!userProfile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
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
          user: userProfile,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user profile error:', error);

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
});

// PUT /api/users/profile - Update current user profile
export const PUT = authenticated(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    const profileData = UpdateProfileSchema.parse(body);

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!currentUser) {
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

    const updateData: any = {};

    // Handle email update
    if (profileData.email && profileData.email !== currentUser.email) {
      // Check if email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email: profileData.email },
      });

      if (existingUser && existingUser.id !== user.userId) {
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

      updateData.email = profileData.email;
    }

    // Handle password update
    if (profileData.newPassword && profileData.currentPassword) {
      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(
        profileData.currentPassword,
        currentUser.password
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_CURRENT_PASSWORD',
              message: 'Current password is incorrect',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 400 }
        );
      }

      // Hash new password
      updateData.password = await hashPassword(profileData.newPassword);
    }

    // If no updates, return current data
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            message: 'No changes to update',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 200 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
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
        company: {
          select: {
            id: true,
            name: true,
            country: true,
            baseCurrency: true,
          },
        },
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

    return NextResponse.json(
      {
        success: true,
        data: {
          user: updatedUser,
          message: 'Profile updated successfully',
          updatedFields: Object.keys(updateData),
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user profile error:', error);

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
});