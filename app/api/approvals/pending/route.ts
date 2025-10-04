import { NextRequest, NextResponse } from 'next/server';
import { approvalDecisionService } from '@/lib/services/approval-decision.service';
import { verifyToken } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
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

    // Only managers and admins can view pending approvals
    if (token.role === 'EMPLOYEE') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'Only managers and administrators can view pending approvals',
        }),
        { status: 403 }
      );
    }

    const pendingApprovals = await approvalDecisionService.getPendingApprovalsForUser(
      token.userId,
      token.companyId
    );

    return NextResponse.json(createApiResponse(true, pendingApprovals));
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch pending approvals',
      }),
      { status: 500 }
    );
  }
}