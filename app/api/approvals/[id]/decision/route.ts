import { NextRequest, NextResponse } from 'next/server';
import { approvalDecisionService } from '@/lib/services/approval-decision.service';
import { ApprovalDecisionSchema, ValidationError, BusinessRuleError } from '@/lib/types';
import { verifyToken } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';

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

    // Only managers and admins can make approval decisions
    if (token.role === 'EMPLOYEE') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'Only managers and administrators can make approval decisions',
        }),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = ApprovalDecisionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.errors,
        }),
        { status: 400 }
      );
    }

    const result = await approvalDecisionService.processApprovalDecision(
      params.id,
      token.userId,
      validationResult.data
    );

    return NextResponse.json(createApiResponse(true, result));
  } catch (error) {
    console.error('Error processing approval decision:', error);

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

    if (error instanceof Error && error.message === 'Approval not found') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'Approval not found',
        }),
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === 'Workflow not found') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process approval decision',
      }),
      { status: 500 }
    );
  }
}