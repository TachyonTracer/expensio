import { NextRequest, NextResponse } from 'next/server';
import { currencyService } from '@/lib/services/currency.service';
import { ApiResponse } from '@/lib/types';
import { API_ERROR_CODES } from '@/lib/constants';

/**
 * GET /api/countries
 * Get countries and their currencies
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const includeMapping = searchParams.get('mapping') === 'true';
    const country = searchParams.get('country');

    if (country) {
      // Get primary currency for a specific country
      const primaryCurrency = await currencyService.getPrimaryCurrencyForCountry(country);
      
      if (!primaryCurrency) {
        return NextResponse.json({
          success: false,
          error: {
            code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
            message: `Country '${country}' not found or has no currency data`,
            details: { country }
          },
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          country,
          primaryCurrency,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get all countries data
    const countriesData = await currencyService.fetchCountriesData();
    
    // Keep the original structure that frontend components expect
    const countries = countriesData.map(country => ({
      name: {
        common: country.name.common,
        official: country.name.official
      },
      currencies: country.currencies ? Object.entries(country.currencies).map(([code, info]) => ({
        code,
        name: info.name,
        symbol: info.symbol
      })) : []
    })).sort((a, b) => a.name.common.localeCompare(b.name.common));

    let responseData: any = countries;

    // Include country-currency mapping if requested
    if (includeMapping) {
      const mapping = await currencyService.getCountryCurrencyMapping();
      responseData.mapping = mapping;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/countries:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        message: error instanceof Error ? error.message : 'Failed to fetch countries data',
        details: { endpoint: '/api/countries' }
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}