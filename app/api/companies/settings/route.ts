import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/lib/types';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { authenticateRequest } from '@/lib/middleware';
import { updateCompanySettings, getCompanyOverview } from '@/lib/services/company-service';
import { UpdateCompanySchema } from '@/lib/types';

// GET /api/companies/settings - Get company settings and overview
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    // Only admins can view company settings
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', 'Admin access required'),
        { status: 403 }
      );
    }

    const overview = await getCompanyOverview(authResult.user.companyId);

    return NextResponse.json(createApiResponse(overview));
  } catch (error) {
    console.error('Error fetching company settings:', error);
    
    if (error instanceof Error && error.message === 'Company not found') {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Company not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to fetch company settings'),
      { status: 500 }
    );
  }
}

// PUT /api/companies/settings - Update company settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    // Only admins can update company settings
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', 'Admin access required'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateCompanySchema.parse(body);

    const updatedCompany = await updateCompanySettings(
      authResult.user.companyId,
      validatedData
    );

    return NextResponse.json(createApiResponse(updatedCompany));
  } catch (error) {
    console.error('Error updating company settings:', error);
    
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', 'Invalid settings data', error),
          { status: 400 }
        );
      }
      
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          createErrorResponse('CONFLICT', error.message),
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to update company settings'),
      { status: 500 }
    );
  }
}