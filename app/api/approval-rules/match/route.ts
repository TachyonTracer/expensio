import { NextRequest, NextResponse } from 'next/server';
import { approvalRuleService } from '@/lib/services/approval-rule.service';
import { verifyToken } from '@/lib/auth';
import { createApiResponse } from '@/lib/api-response';
import { z } from 'zod';

const MatchRulesSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
});

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

    const body = await request.json();
    const validationResult = MatchRulesSchema.safeParse(body);

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

    const { amount, category } = validationResult.data;
    const matchingRules = await approvalRuleService.findMatchingRules(
      token.companyId,
      amount,
      category
    );

    return NextResponse.json(createApiResponse(true, matchingRules));
  } catch (error) {
    console.error('Error finding matching approval rules:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to find matching approval rules',
      }),
      { status: 500 }
    );
  }
}