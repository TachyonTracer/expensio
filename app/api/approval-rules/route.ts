import { NextRequest, NextResponse } from 'next/server';
import { approvalRuleService } from '@/lib/services/approval-rule.service';
import { CreateApprovalRuleSchema, ValidationError, BusinessRuleError } from '@/lib/types';
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

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const rules = await approvalRuleService.getApprovalRulesByCompany(
      token.companyId,
      includeInactive
    );

    return NextResponse.json(createApiResponse(true, rules));
  } catch (error) {
    console.error('Error fetching approval rules:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch approval rules',
      }),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Only admins can create approval rules
    if (token.role !== 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'Only administrators can create approval rules',
        }),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = CreateApprovalRuleSchema.safeParse(body);

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

    const rule = await approvalRuleService.createApprovalRule(
      token.companyId,
      validationResult.data
    );

    return NextResponse.json(createApiResponse(true, rule), { status: 201 });
  } catch (error) {
    console.error('Error creating approval rule:', error);

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

    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create approval rule',
      }),
      { status: 500 }
    );
  }
}