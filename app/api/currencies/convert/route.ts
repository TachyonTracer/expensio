import { NextRequest, NextResponse } from 'next/server';
import { currencyConversionService } from '@/lib/services/currency-conversion.service';
import { ApiResponse } from '@/lib/types';
import { API_ERROR_CODES } from '@/lib/constants';
import { z } from 'zod';

// Validation schema for conversion request
const ConversionRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  fromCurrency: z.string().length(3, 'Currency code must be 3 characters').transform(s => s.toUpperCase()),
  toCurrency: z.string().length(3, 'Currency code must be 3 characters').transform(s => s.toUpperCase()),
  useRealTimeRates: z.boolean().optional().default(true)
});

const MultipleConversionRequestSchema = z.object({
  conversions: z.array(z.object({
    amount: z.number().positive('Amount must be positive'),
    fromCurrency: z.string().length(3, 'Currency code must be 3 characters').transform(s => s.toUpperCase()),
    toCurrency: z.string().length(3, 'Currency code must be 3 characters').transform(s => s.toUpperCase())
  })).min(1, 'At least one conversion is required').max(10, 'Maximum 10 conversions allowed'),
  useRealTimeRates: z.boolean().optional().default(true)
});

/**
 * POST /api/currencies/convert
 * Convert currency amounts
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();

    // Check if it's a multiple conversion request
    if (body.conversions && Array.isArray(body.conversions)) {
      return await handleMultipleConversions(body);
    } else {
      return await handleSingleConversion(body);
    }

  } catch (error) {
    console.error('Error in POST /api/currencies/convert:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: { errors: error.errors }
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.CURRENCY_API_ERROR,
        message: error instanceof Error ? error.message : 'Currency conversion failed',
        details: { endpoint: '/api/currencies/convert' }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Handle single currency conversion
 */
async function handleSingleConversion(body: any): Promise<NextResponse<ApiResponse>> {
  const validatedData = ConversionRequestSchema.parse(body);
  
  const result = await currencyConversionService.convertAmount(
    validatedData.amount,
    validatedData.fromCurrency,
    validatedData.toCurrency,
    validatedData.useRealTimeRates
  );

  // Get formatted summary
  const summary = await currencyConversionService.getConversionSummary(
    validatedData.amount,
    validatedData.fromCurrency,
    validatedData.toCurrency
  );

  return NextResponse.json({
    success: true,
    data: {
      conversion: result,
      summary,
      ratesUsed: validatedData.useRealTimeRates ? 'real-time' : 'cached'
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle multiple currency conversions
 */
async function handleMultipleConversions(body: any): Promise<NextResponse<ApiResponse>> {
  const validatedData = MultipleConversionRequestSchema.parse(body);
  
  const results = await currencyConversionService.convertMultipleAmounts(
    validatedData.conversions,
    validatedData.useRealTimeRates
  );

  return NextResponse.json({
    success: true,
    data: {
      conversions: results,
      count: results.length,
      ratesUsed: validatedData.useRealTimeRates ? 'real-time' : 'cached'
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * GET /api/currencies/convert
 * Get conversion rate between two currencies (query params)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from')?.toUpperCase();
    const toCurrency = searchParams.get('to')?.toUpperCase();
    const amountStr = searchParams.get('amount');
    const useRealTimeRates = searchParams.get('realtime') !== 'false';

    // Validate required parameters
    if (!fromCurrency || !toCurrency) {
      return NextResponse.json({
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Both from and to currency parameters are required',
          details: { fromCurrency, toCurrency }
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate currency code format
    if (!/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency)) {
      return NextResponse.json({
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Currency codes must be 3-letter codes',
          details: { fromCurrency, toCurrency }
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const amount = amountStr ? parseFloat(amountStr) : 1;

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Amount must be a positive number',
          details: { amount: amountStr }
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const result = await currencyConversionService.convertAmount(
      amount,
      fromCurrency,
      toCurrency,
      useRealTimeRates
    );

    // Get formatted summary
    const summary = await currencyConversionService.getConversionSummary(
      amount,
      fromCurrency,
      toCurrency
    );

    return NextResponse.json({
      success: true,
      data: {
        conversion: result,
        summary,
        ratesUsed: useRealTimeRates ? 'real-time' : 'cached'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/currencies/convert:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.CURRENCY_API_ERROR,
        message: error instanceof Error ? error.message : 'Currency conversion failed',
        details: { endpoint: '/api/currencies/convert' }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}