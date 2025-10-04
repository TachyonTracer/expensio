import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse } from '@/lib/api-response';
import { handleApiError } from '@/lib/error-handler';

interface Country {
  name: { common: string };
  currencies: Record<string, { name: string; symbol: string }>;
}

// GET /api/countries - Get list of countries with currencies
export async function GET(request: NextRequest) {
  try {
    // Fetch countries data from REST Countries API
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies');
    
    if (!response.ok) {
      throw new Error('Failed to fetch countries data');
    }

    const countries: Country[] = await response.json();
    
    // Sort countries by name for better UX
    const sortedCountries = countries
      .filter(country => country.name?.common && country.currencies)
      .sort((a, b) => a.name.common.localeCompare(b.name.common));

    return NextResponse.json(createApiResponse(true, sortedCountries));
  } catch (error) {
    // Return a fallback list of common countries if the API fails
    const fallbackCountries = [
      {
        name: { common: 'United States' },
        currencies: { USD: { name: 'United States Dollar', symbol: '$' } }
      },
      {
        name: { common: 'United Kingdom' },
        currencies: { GBP: { name: 'British Pound Sterling', symbol: '£' } }
      },
      {
        name: { common: 'Canada' },
        currencies: { CAD: { name: 'Canadian Dollar', symbol: '$' } }
      },
      {
        name: { common: 'Australia' },
        currencies: { AUD: { name: 'Australian Dollar', symbol: '$' } }
      },
      {
        name: { common: 'Germany' },
        currencies: { EUR: { name: 'Euro', symbol: '€' } }
      },
      {
        name: { common: 'France' },
        currencies: { EUR: { name: 'Euro', symbol: '€' } }
      },
      {
        name: { common: 'Japan' },
        currencies: { JPY: { name: 'Japanese Yen', symbol: '¥' } }
      },
      {
        name: { common: 'India' },
        currencies: { INR: { name: 'Indian Rupee', symbol: '₹' } }
      },
    ];

    return NextResponse.json(createApiResponse(true, fallbackCountries));
  }
}