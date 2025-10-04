import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';
import { UpdateCompanySchema } from '@/lib/types';

// GET /api/company/settings - Get company settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const user = authResult.user;

    // Only admins can access company settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Admin access required' }),
        { status: 403 }
      );
    }

    const company = await prisma.company.findUnique({
      where: {
        id: user.companyId,
      },
    });

    if (!company) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'NOT_FOUND', message: 'Company not found' }),
        { status: 404 }
      );
    }

    return NextResponse.json(createApiResponse(true, company));
  } catch (error) {
    return handleApiError(error, request);
  }
}

// PUT /api/company/settings - Update company settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401 }
      );
    }

    const user = authResult.user;

    // Only admins can update company settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        createApiResponse(false, null, { code: 'FORBIDDEN', message: 'Admin access required' }),
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate the request body
    const validationResult = UpdateCompanySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid company data',
          details: validationResult.error.errors,
        }),
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Update the company
    const updatedCompany = await prisma.company.update({
      where: {
        id: user.companyId,
      },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(createApiResponse(true, updatedCompany));
  } catch (error) {
    return handleApiError(error, request);
  }
}