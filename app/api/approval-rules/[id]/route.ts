import { NextRequest, NextResponse } from 'next/server';
import { approvalRuleService } from '@/lib/services/approval-rule.service';
import { UpdateApprovalRuleSchema, ValidationError, BusinessRuleError } from '@/lib/types';
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

    const rule = await approvalRuleService.getApprovalRuleById(params.id, token.companyId);
    if (!rule) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'Approval rule not found',
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(createApiResponse(true, rule));
  } catch (error) {
    console.error('Error fetching approval rule:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch approval rule',
      }),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Only admins can update approval rules
    if (token.role !== 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'Only administrators can update approval rules',
        }),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = UpdateApprovalRuleSchema.safeParse(body);

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

    const rule = await approvalRuleService.updateApprovalRule(
      params.id,
      token.companyId,
      validationResult.data
    );

    return NextResponse.json(createApiResponse(true, rule));
  } catch (error) {
    console.error('Error updating approval rule:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.errors,
        }),
        { status: 400 }
      );
    }

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

    if (error instanceof Error && error.message === 'Approval rule not found') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'Approval rule not found',
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update approval rule',
      }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Only admins can delete approval rules
    if (token.role !== 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'Only administrators can delete approval rules',
        }),
        { status: 403 }
      );
    }

    await approvalRuleService.deleteApprovalRule(params.id, token.companyId);

    return NextResponse.json(createApiResponse(true, null));
  } catch (error) {
    console.error('Error deleting approval rule:', error);

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

    if (error instanceof Error && error.message === 'Approval rule not found') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'Approval rule not found',
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete approval rule',
      }),
      { status: 500 }
    );
  }
}