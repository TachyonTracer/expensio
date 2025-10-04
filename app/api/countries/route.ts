import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse } from '@/lib/api-response';
import { currencyService } from '@/lib/services/currency.service';

type CountryData = Awaited<ReturnType<typeof currencyService.fetchCountriesData>>[number];

interface CountryCurrency {
  code: string;
  name: string;
  symbol: string;
}

interface CountrySummary {
  name: {
    common: string;
    official?: string;
  };
  currencies: CountryCurrency[];
}

function toCountrySummaries(countries: CountryData[]): CountrySummary[] {
  return countries
    .filter(country => country?.name?.common)
    .map<CountrySummary>(country => ({
      name: {
        common: country.name.common,
        official: country.name.official,
      },
      currencies: country.currencies
        ? Object.entries(country.currencies).map(([code, info]) => ({
            code,
            name: info.name,
            symbol: info.symbol ?? code,
          }))
        : [],
    }))
    .filter(country => country.currencies.length > 0)
    .sort((a, b) => a.name.common.localeCompare(b.name.common));
}

function buildCurrencyMapping(countries: CountrySummary[]): Record<string, string[]> {
  return countries.reduce<Record<string, string[]>>((mapping, country) => {
    mapping[country.name.common] = country.currencies.map(currency => currency.code);
    return mapping;
  }, {});
}

const FALLBACK_COUNTRIES: CountrySummary[] = [
  {
    name: { common: 'United States' },
    currencies: [
      { code: 'USD', name: 'United States Dollar', symbol: '$' },
    ],
  },
  {
    name: { common: 'United Kingdom' },
    currencies: [
      { code: 'GBP', name: 'British Pound Sterling', symbol: '£' },
    ],
  },
  {
    name: { common: 'Canada' },
    currencies: [
      { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
    ],
  },
  {
    name: { common: 'Australia' },
    currencies: [
      { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    ],
  },
  {
    name: { common: 'Germany' },
    currencies: [
      { code: 'EUR', name: 'Euro', symbol: '€' },
    ],
  },
  {
    name: { common: 'France' },
    currencies: [
      { code: 'EUR', name: 'Euro', symbol: '€' },
    ],
  },
  {
    name: { common: 'Japan' },
    currencies: [
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    ],
  },
  {
    name: { common: 'India' },
    currencies: [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    ],
  },
];

const FALLBACK_MAPPING = buildCurrencyMapping(FALLBACK_COUNTRIES);

// GET /api/countries - Get list of countries with currencies
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeMapping = searchParams.get('includeMapping') === 'true';

  try {
    const countriesData = await currencyService.fetchCountriesData();
    const countries = toCountrySummaries(countriesData);

    let mapping: Record<string, string[]> | undefined;

    if (includeMapping) {
      try {
        mapping = await currencyService.getCountryCurrencyMapping();
      } catch (mappingError) {
        console.warn('Failed to fetch country currency mapping, deriving from country list instead.', mappingError);
        mapping = buildCurrencyMapping(countries);
      }
    }

    const payload = includeMapping ? { countries, mapping } : countries;

    return NextResponse.json(createApiResponse(true, payload));
  } catch (error) {
    console.error('Failed to fetch countries data, serving fallback list.', error);

    const payload = includeMapping
      ? { countries: FALLBACK_COUNTRIES, mapping: FALLBACK_MAPPING }
      : FALLBACK_COUNTRIES;

    return NextResponse.json(createApiResponse(true, payload));
  }
}