import { currencyService } from '../services/currency.service';
import { prisma } from '../db';

/**
 * Initialize currency data in the database
 * This should be called during application startup or setup
 */
export async function initializeCurrencyData(baseCurrency: string = 'USD'): Promise<void> {
  try {
    console.log('Initializing currency data...');

    // Check if we already have currency data
    const existingCurrencies = await prisma.currency.count();
    
    if (existingCurrencies > 0) {
      console.log(`Found ${existingCurrencies} existing currencies in database`);
      
      // Check if rates are stale and update if needed
      const shouldUpdate = await currencyService.shouldUpdateRates();
      if (shouldUpdate) {
        console.log('Exchange rates are stale, updating...');
        await currencyService.updateExchangeRates(baseCurrency);
        console.log('Exchange rates updated successfully');
      } else {
        console.log('Exchange rates are up to date');
      }
      return;
    }

    // Initialize currency data for the first time
    console.log('No existing currency data found, initializing...');
    
    // Get supported currencies from countries API
    const supportedCurrencies = await currencyService.getSupportedCurrencies();
    console.log(`Found ${supportedCurrencies.length} supported currencies`);

    // Fetch exchange rates
    const exchangeRates = await currencyService.fetchExchangeRates(baseCurrency);
    console.log(`Fetched exchange rates for base currency: ${baseCurrency}`);

    // Prepare currency data with exchange rates
    const currencyData = supportedCurrencies.map(currency => ({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: exchangeRates.rates[currency.code] || 1,
      lastUpdated: new Date()
    }));

    // Ensure base currency has rate of 1
    const baseCurrencyIndex = currencyData.findIndex(c => c.code === baseCurrency);
    if (baseCurrencyIndex >= 0) {
      currencyData[baseCurrencyIndex].exchangeRate = 1;
    } else {
      // Add base currency if not found
      currencyData.push({
        code: baseCurrency,
        name: baseCurrency,
        symbol: baseCurrency,
        exchangeRate: 1,
        lastUpdated: new Date()
      });
    }

    // Batch insert currencies
    await prisma.currency.createMany({
      data: currencyData,
      skipDuplicates: true
    });

    console.log(`Successfully initialized ${currencyData.length} currencies`);

  } catch (error) {
    console.error('Error initializing currency data:', error);
    throw new Error(`Failed to initialize currency data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update exchange rates for all currencies
 */
export async function updateAllExchangeRates(baseCurrency: string = 'USD'): Promise<void> {
  try {
    console.log(`Updating exchange rates with base currency: ${baseCurrency}`);
    await currencyService.updateExchangeRates(baseCurrency);
    console.log('Exchange rates updated successfully');
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    throw new Error(`Failed to update exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get currency statistics
 */
export async function getCurrencyStats(): Promise<{
  totalCurrencies: number;
  lastUpdated: Date | null;
  oldestUpdate: Date | null;
  baseCurrencies: string[];
}> {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { lastUpdated: 'desc' }
    });

    const stats = {
      totalCurrencies: currencies.length,
      lastUpdated: currencies.length > 0 ? currencies[0].lastUpdated : null,
      oldestUpdate: currencies.length > 0 ? currencies[currencies.length - 1].lastUpdated : null,
      baseCurrencies: currencies.filter((c: any) => Number(c.exchangeRate) === 1).map((c: any) => c.code)
    };

    return stats;
  } catch (error) {
    console.error('Error getting currency stats:', error);
    throw new Error(`Failed to get currency stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate and sanitize currency code
 */
export function sanitizeCurrencyCode(code: string): string {
  return code.toUpperCase().trim();
}

/**
 * Check if currency code is valid format
 */
export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

/**
 * Get popular currency codes
 */
export function getPopularCurrencies(): string[] {
  return [
    'USD', // US Dollar
    'EUR', // Euro
    'GBP', // British Pound
    'JPY', // Japanese Yen
    'AUD', // Australian Dollar
    'CAD', // Canadian Dollar
    'CHF', // Swiss Franc
    'CNY', // Chinese Yuan
    'INR', // Indian Rupee
    'BRL', // Brazilian Real
    'RUB', // Russian Ruble
    'KRW', // South Korean Won
    'SGD', // Singapore Dollar
    'HKD', // Hong Kong Dollar
    'SEK', // Swedish Krona
    'NOK', // Norwegian Krone
    'NZD', // New Zealand Dollar
    'MXN', // Mexican Peso
    'ZAR', // South African Rand
    'TRY'  // Turkish Lira
  ];
}

/**
 * Format currency for display
 */
export function formatCurrencyDisplay(
  amount: number,
  currencyCode: string,
  options: {
    locale?: string;
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    locale = 'en-US',
    showCode = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount);

    return showCode ? `${formatted} (${currencyCode})` : formatted;
  } catch (error) {
    // Fallback formatting
    return `${currencyCode} ${amount.toFixed(maximumFractionDigits)}`;
  }
}