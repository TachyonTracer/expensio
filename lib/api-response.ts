import { NextResponse } from 'next/server';
import { ApiResponse } from './types';

export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function createValidationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiResponse> {
  return createErrorResponse(
    'VALIDATION_ERROR',
    'Validation failed',
    422,
    { validationErrors: errors }
  );
}

export function createUnauthorizedResponse(): NextResponse<ApiResponse> {
  return createErrorResponse(
    'UNAUTHORIZED',
    'Authentication required',
    401
  );
}

export function createForbiddenResponse(): NextResponse<ApiResponse> {
  return createErrorResponse(
    'FORBIDDEN',
    'Insufficient permissions',
    403
  );
}

export function createNotFoundResponse(resource: string = 'Resource'): NextResponse<ApiResponse> {
  return createErrorResponse(
    'NOT_FOUND',
    `${resource} not found`,
    404
  );
}

export function createInternalServerErrorResponse(): NextResponse<ApiResponse> {
  return createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred',
    500
  );
}