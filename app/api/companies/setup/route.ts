import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiResponse, createErrorResponse } from '@/lib/api-response';
import { createCompanyWithAdmin, getSupportedCountries } from '@/lib/services/company-service';
import { CreateCompanySchema } from '@/lib/types';

// Schema for company setup request
const CompanySetupSchema = z.object({
  company: CreateCompanySchema,
  adminUser: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

// POST /api/companies/setup - Complete company setup with admin user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CompanySetupSchema.parse(body);

    const result = await createCompanyWithAdmin(validatedData);

    return NextResponse.json(createApiResponse(result), { status: 201 });
  } catch (error) {
    console.error('Error setting up company:', error);
    
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', 'Invalid setup data', error),
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
      createErrorResponse('INTERNAL_ERROR', 'Failed to setup company'),
      { status: 500 }
    );
  }
}

// GET /api/companies/setup - Get supported countries and currencies for setup
export async function GET() {
  try {
    const countries = await getSupportedCountries();
    
    return NextResponse.json(createApiResponse(countries));
  } catch (error) {
    console.error('Error fetching countries:', error);
    
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to fetch countries data'),
      { status: 500 }
    );
  }
}