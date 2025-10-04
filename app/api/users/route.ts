import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { ApiResponse } from '@/lib/types';

// GET /api/users - Get all users in the company
export const GET = withAuth(
  async (request, user) => {
    try {
      // Only admins and managers can view users
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only admins and managers can view users',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      // Get all users in the same company
      const users = await prisma.user.findMany({
        where: {
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: users,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 200 }
      );
    } catch (error) {
      console.error('Get users error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch users',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      );
    }
  },
  { roles: ['ADMIN', 'MANAGER'] }
);

// POST /api/users - Create a new user
export const POST = withAuth(
  async (request, user) => {
    try {
      // Only admins can create users
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only admins can create users',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 403 }
        );
      }

      const body = await request.json();
      const { email, role, managerId } = body;

      // Validate required fields
      if (!email || !role) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Email and role are required',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_EXISTS',
              message: 'A user with this email already exists',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: 409 }
        );
      }

      // Generate a temporary password (in production, send email with reset link)
      const bcrypt = require('bcryptjs');
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create the user
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          companyId: user.companyId,
          managerId: managerId || null,
          isActive: true,
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

      return NextResponse.json(
        {
          success: true,
          data: {
            user: newUser,
            tempPassword, // In production, don't return this - send via email
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 201 }
      );
    } catch (error) {
      console.error('Create user error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      );
    }
  },
  { roles: ['ADMIN'] }
);
