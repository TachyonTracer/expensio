import { NextRequest, NextResponse } from 'next/server';
import { currencyService } from '@/lib/services/currency.service';
import { ApiResponse } from '@/lib/types';
import { API_ERROR_CODES } from '@/lib/constants';

/**
 * GET /api/currencies/rates
 * Get exchange rates for a specific base currency
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = searchParams.get('base') || 'USD';
    const refresh = searchParams.get('refresh') === 'true';

    // Validate base currency format
    if (!/^[A-Z]{3}$/.test(baseCurrency)) {
      return NextResponse.json({
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Base currency must be a 3-letter currency code',
          details: { baseCurrency }
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    let exchangeRates;
    let isStale = false;

    try {
      // Try to get fresh rates from external API
      exchangeRates = await currencyService.fetchExchangeRates(baseCurrency);
    } catch (error) {
      console.warn('Failed to fetch fresh exchange rates, trying database:', error);
      
      // Fallback to database rates
      try {
        const currencies = await currencyService.getAllCurrencies();
        const baseCurrencyData = currencies.find(c => c.code === baseCurrency);
        
        if (!baseCurrencyData) {
          throw new Error(`Base currency ${baseCurrency} not found`);
        }

        // Convert all rates relative to the base currency
        const rates: Record<string, number> = {};
        const baseRate = Number(baseCurrencyData.exchangeRate);
        
        currencies.forEach(currency => {
          if (currency.code !== baseCurrency) {
            rates[currency.code] = Number(currency.exchangeRate) / baseRate;
          }
        });

        exchangeRates = {
          base: baseCurrency,
          rates,
          timestamp: baseCurrencyData.lastUpdated.getTime()
        };

        isStale = await currencyService.shouldUpdateRates();
      } catch (dbError) {
        throw new Error('Failed to get exchange rates from both API and database');
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...exchangeRates,
        isStale,
        ratesCount: Object.keys(exchangeRates.rates).length,
        lastUpdated: new Date(exchangeRates.timestamp).toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/currencies/rates:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.CURRENCY_API_ERROR,
        message: error instanceof Error ? error.message : 'Failed to fetch exchange rates',
        details: { endpoint: '/api/currencies/rates' }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}