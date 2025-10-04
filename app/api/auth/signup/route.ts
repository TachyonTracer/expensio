import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { ApiResponse, JWTPayload, CreateCompanySchema } from '@/lib/types';

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  company: CreateCompanySchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, company } = SignupSchema.parse(body);

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
            message: 'User with this email already exists',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create company and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const newCompany = await tx.company.create({
        data: {
          name: company.name,
          country: company.country,
          baseCurrency: company.baseCurrency,
        },
      });

      // Create admin user
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          companyId: newCompany.id,
        },
        include: {
          company: true,
        },
      });

      return { company: newCompany, user: newUser };
    });

    // Create JWT payload
    const jwtPayload: JWTPayload = {
      userId: result.user.id,
      companyId: result.user.companyId,
      role: result.user.role,
      email: result.user.email,
    };

    // Generate tokens
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    // Create response with user data (excluding password)
    const userData = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      companyId: result.user.companyId,
      company: {
        id: result.user.company.id,
        name: result.user.company.name,
        country: result.user.company.country,
        baseCurrency: result.user.company.baseCurrency,
      },
      managerId: result.user.managerId,
      isActive: result.user.isActive,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
    };

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: userData,
          accessToken,
          refreshToken,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 201 }
    );

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);

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
}