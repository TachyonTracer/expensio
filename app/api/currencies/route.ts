import { NextRequest, NextResponse } from 'next/server';
import { currencyService } from '@/lib/services/currency.service';
import { ApiResponse } from '@/lib/types';
import { API_ERROR_CODES } from '@/lib/constants';

/**
 * GET /api/currencies
 * Get all supported currencies
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const baseCurrency = searchParams.get('baseCurrency') || 'USD';

    // Refresh rates if requested or if they're stale
    if (refresh || await currencyService.shouldUpdateRates()) {
      try {
        await currencyService.updateExchangeRates(baseCurrency);
      } catch (error) {
        console.warn('Failed to update exchange rates, using cached data:', error);
      }
    }

    // Get all currencies from database
    const currencies = await currencyService.getAllCurrencies();

    return NextResponse.json({
      success: true,
      data: {
        currencies,
        baseCurrency,
        lastUpdated: currencies.length > 0 ? currencies[0].lastUpdated : null,
        count: currencies.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/currencies:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        message: error instanceof Error ? error.message : 'Failed to fetch currencies',
        details: { endpoint: '/api/currencies' }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST /api/currencies/refresh
 * Manually refresh exchange rates
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json().catch(() => ({}));
    const baseCurrency = body.baseCurrency || 'USD';

    // Force refresh exchange rates
    await currencyService.updateExchangeRates(baseCurrency);

    // Get updated currencies
    const currencies = await currencyService.getAllCurrencies();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Exchange rates updated successfully',
        baseCurrency,
        updatedCount: currencies.length,
        lastUpdated: currencies.length > 0 ? currencies[0].lastUpdated : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in POST /api/currencies:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.CURRENCY_API_ERROR,
        message: error instanceof Error ? error.message : 'Failed to refresh exchange rates',
        details: { endpoint: '/api/currencies', action: 'refresh' }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}