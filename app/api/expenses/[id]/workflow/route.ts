import { NextRequest, NextResponse } from 'next/server';
import { approvalWorkflowService } from '@/lib/services/approval-workflow.service';
import { verifyToken } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { BusinessRuleError } from '@/lib/types';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const workflow = await approvalWorkflowService.initiateWorkflow(params.id);

    return NextResponse.json(createApiResponse(true, workflow), { status: 201 });
  } catch (error) {
    console.error('Error initiating approval workflow:', error);

    if (error instanceof BusinessRuleError) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: error.rule,
          message: error.message,
          details: error.context,
        }),
        { status: 422 }
      );
    }

    if (error instanceof Error && error.message === 'Expense not found') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'Expense not found',
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to initiate approval workflow',
      }),
      { status: 500 }
    );
  }
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

    const workflow = await approvalWorkflowService.getWorkflowState(params.id);
    if (!workflow) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'Workflow not found for this expense',
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(createApiResponse(true, workflow));
  } catch (error) {
    console.error('Error fetching approval workflow:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch approval workflow',
      }),
      { status: 500 }
    );
  }
}