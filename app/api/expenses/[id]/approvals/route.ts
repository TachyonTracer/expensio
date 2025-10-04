import { NextRequest, NextResponse } from 'next/server';
import { approvalDecisionService } from '@/lib/services/approval-decision.service';
import { verifyToken } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = await verifyToken(request);
    if (!token) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        }),
        { status: 401 }
      );
    }

    const approvalHistory = await approvalDecisionService.getApprovalHistory(params.id);

    return NextResponse.json(createApiResponse(true, approvalHistory));
  } catch (error) {
    console.error('Error fetching approval history:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch approval history',
      }),
      { status: 500 }
    );
  }
}