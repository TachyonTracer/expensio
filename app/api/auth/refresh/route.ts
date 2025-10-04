import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { ApiResponse, JWTPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or request body
    const refreshTokenFromCookie = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    const refreshTokenFromBody = body.refreshToken;
    
    const refreshToken = refreshTokenFromCookie || refreshTokenFromBody;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      );
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        company: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 401 }
      );
    }

    // Create new JWT payload with updated user data
    const jwtPayload: JWTPayload = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    };

    // Generate new tokens
    const newAccessToken = generateAccessToken(jwtPayload);
    const newRefreshToken = generateRefreshToken(jwtPayload);

    // Create response with user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      company: {
        id: user.company.id,
        name: user.company.name,
        country: user.company.country,
        baseCurrency: user.company.baseCurrency,
      },
      managerId: user.managerId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: userData,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 200 }
    );

    // Set new access token cookie
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    });

    // Set new refresh token as httpOnly cookie
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);

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