import { NextRequest, NextResponse } from 'next/server';
import { approvalWorkflowService } from '@/lib/services/approval-workflow.service';
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

    const nextApprovers = await approvalWorkflowService.getNextApprovers(params.id);

    return NextResponse.json(createApiResponse(true, nextApprovers));
  } catch (error) {
    console.error('Error fetching next approvers:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch next approvers',
      }),
      { status: 500 }
    );
  }
}