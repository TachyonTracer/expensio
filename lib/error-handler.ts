import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { 
  createErrorResponse, 
  createValidationErrorResponse,
  createInternalServerErrorResponse 
} from './api-response';

export function handleApiError(error: unknown, request: NextRequest) {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!validationErrors[path]) {
        validationErrors[path] = [];
      }
      validationErrors[path].push(err.message);
    });
    return createValidationErrorResponse(validationErrors);
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return createErrorResponse(
          'DUPLICATE_ENTRY',
          'A record with this information already exists',
          409
        );
      case 'P2025':
        return createErrorResponse(
          'NOT_FOUND',
          'The requested record was not found',
          404
        );
      case 'P2003':
        return createErrorResponse(
          'FOREIGN_KEY_CONSTRAINT',
          'This operation violates a data relationship constraint',
          400
        );
      default:
        return createErrorResponse(
          'DATABASE_ERROR',
          'A database error occurred',
          500
        );
    }
  }

  // Custom application errors
  if (error instanceof AppError) {
    return createErrorResponse(
      error.code,
      error.message,
      error.statusCode,
      error.details
    );
  }

  // Generic errors
  if (error instanceof Error) {
    return createErrorResponse(
      'APPLICATION_ERROR',
      error.message,
      500
    );
  }

  // Unknown errors
  return createInternalServerErrorResponse();
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}