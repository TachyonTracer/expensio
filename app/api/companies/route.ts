import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateCompanySchema, UpdateCompanySchema } from '@/lib/types';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { authenticateRequest } from '@/lib/middleware';
import { UserRole } from '@prisma/client';

// GET /api/companies - Get company details (Admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    // Only admins can view company details
    if (authResult.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', 'Admin access required'),
        { status: 403 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: authResult.user.companyId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            expenses: true,
            approvalRules: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Company not found'),
        { status: 404 }
      );
    }

    return NextResponse.json(createApiResponse(company));
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to fetch company details'),
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company (Public endpoint for signup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateCompanySchema.parse(body);

    // Check if company with same name already exists
    const existingCompany = await prisma.company.findFirst({
      where: { name: validatedData.name },
    });

    if (existingCompany) {
      return NextResponse.json(
        createErrorResponse('CONFLICT', 'Company with this name already exists'),
        { status: 409 }
      );
    }

    // Fetch currency data for the selected country
    let detectedCurrency = validatedData.baseCurrency;
    
    try {
      const countryResponse = await fetch(
        `https://restcountries.com/v3.1/name/${validatedData.country}?fields=name,currencies`
      );
      
      if (countryResponse.ok) {
        const countryData = await countryResponse.json();
        if (countryData && countryData[0] && countryData[0].currencies) {
          const currencies = Object.keys(countryData[0].currencies);
          if (currencies.length > 0) {
            detectedCurrency = currencies[0];
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch country currency data:', error);
      // Continue with provided currency
    }

    // Create the company
    const company = await prisma.company.create({
      data: {
        name: validatedData.name,
        country: validatedData.country,
        baseCurrency: detectedCurrency,
      },
    });

    return NextResponse.json(createApiResponse(company), { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid company data', error),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to create company'),
      { status: 500 }
    );
  }
}

// PUT /api/companies - Update company settings (Admin only)
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
    if (authResult.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', 'Admin access required'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateCompanySchema.parse(body);

    // Check if another company with the same name exists (if name is being updated)
    if (validatedData.name) {
      const existingCompany = await prisma.company.findFirst({
        where: {
          name: validatedData.name,
          id: { not: authResult.user.companyId },
        },
      });

      if (existingCompany) {
        return NextResponse.json(
          createErrorResponse('CONFLICT', 'Company with this name already exists'),
          { status: 409 }
        );
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id: authResult.user.companyId },
      data: validatedData,
    });

    return NextResponse.json(createApiResponse(updatedCompany));
  } catch (error) {
    console.error('Error updating company:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid company data', error),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to update company'),
      { status: 500 }
    );
  }
}