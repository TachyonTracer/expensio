import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { ApiResponse, JWTPayload, CreateCompanySchema } from '@/lib/types';
import { createCompanyWithAdmin } from '@/lib/services/company-service';

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  company: CreateCompanySchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, company } = SignupSchema.parse(body);

    // Create company and admin user using the service
    const result = await createCompanyWithAdmin({
      company,
      adminUser: { email, password },
    });

    // Create JWT payload
    const jwtPayload: JWTPayload = {
      userId: result.adminUser.id,
      companyId: result.company.id,
      role: result.adminUser.role,
      email: result.adminUser.email,
    };

    // Generate tokens
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    // Create response with user data
    const userData = {
      id: result.adminUser.id,
      email: result.adminUser.email,
      role: result.adminUser.role,
      companyId: result.company.id,
      company: {
        id: result.company.id,
        name: result.company.name,
        country: result.company.country,
        baseCurrency: result.company.baseCurrency,
      },
      managerId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
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

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: error.message,
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
}