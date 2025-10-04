import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
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

  return NextResponse.json(
    {
      success: true,
      data: authResult.user,
      timestamp: new Date().toISOString(),
    } as ApiResponse,
    { status: 200 }
  );
}
