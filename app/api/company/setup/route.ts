import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { ApiResponse } from '@/lib/types';
import type { Company } from '@prisma/client';

const CompanySetupRequestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  baseCurrency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .transform((value) => value.toUpperCase()),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  timeZone: z.string().optional(),
});

const mapCompanyToResponse = (company: Company) => ({
  id: company.id,
  name: company.name,
  country: company.country,
  baseCurrency: company.baseCurrency,
  industry: company.industry,
  employeeCount: company.employeeCount,
  timeZone: company.timeZone,
  updatedAt: company.updatedAt,
  createdAt: company.createdAt,
});

export const GET = withAuth(async (_request, user) => {
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
  });

  if (!company) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found for current user',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        company: mapCompanyToResponse(company),
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse,
    { status: 200 }
  );
}, { roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] });

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const payload = CompanySetupRequestSchema.parse(body);

    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: {
        name: payload.companyName,
        country: payload.country,
        baseCurrency: payload.baseCurrency,
        industry: payload.industry ?? null,
        employeeCount: payload.employeeCount ?? null,
        timeZone: payload.timeZone ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          company: mapCompanyToResponse(updatedCompany),
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid company setup data',
            details: error.flatten(),
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 400 }
      );
    }

    console.error('Company setup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to complete company setup',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse,
      { status: 500 }
    );
  }
}, { roles: ['ADMIN'] });
