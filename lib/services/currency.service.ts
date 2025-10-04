import { Currency, ExchangeRates, ConversionResult } from '../types';
import { EXTERNAL_APIS, CACHE_KEYS, CACHE_TTL, API_ERROR_CODES } from '../constants';
import { prisma } from '../db';

// In-memory cache for exchange rates and countries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CurrencyCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl * 1000)
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  isStale(key: string, maxAge: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    return (Date.now() - entry.timestamp) > (maxAge * 1000);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const currencyCache = new CurrencyCache();

// Country and Currency data interfaces
interface CountryData {
  name: {
    common: string;
    official: string;
  };
  currencies: Record<string, {
    name: string;
    symbol: string;
  }>;
}

interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export class CurrencyService {
  /**
   * Fetch country and currency data from REST Countries API
   */
  async fetchCountriesData(): Promise<CountryData[]> {
    try {
      // Check cache first
      const cached = currencyCache.get<CountryData[]>(CACHE_KEYS.COUNTRIES);
      if (cached) {
        return cached;
      }

      const response = await fetch(EXTERNAL_APIS.COUNTRIES, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Expensio-Currency-Service/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Countries API responded with status: ${response.status}`);
      }

      const data: CountryData[] = await response.json();
      
      // Cache the data
      currencyCache.set(CACHE_KEYS.COUNTRIES, data, CACHE_TTL.COUNTRIES);
      
      return data;
    } catch (error) {
      console.error('Error fetching countries data:', error);
      
      // Try to return stale cached data if available
      const staleData = currencyCache.get<CountryData[]>(CACHE_KEYS.COUNTRIES);
      if (staleData) {
        console.warn('Using stale countries data due to API failure');
        return staleData;
      }
      
      throw new Error(`${API_ERROR_CODES.EXTERNAL_SERVICE_ERROR}: Failed to fetch countries data`);
    }
  }

  /**
   * Fetch exchange rates from Exchange Rate API
   */
  async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    try {
      const cacheKey = `${CACHE_KEYS.EXCHANGE_RATES}_${baseCurrency}`;
      
      // Check cache first
      const cached = currencyCache.get<ExchangeRates>(cacheKey);
      if (cached && !currencyCache.isStale(cacheKey, CACHE_TTL.EXCHANGE_RATES / 2)) {
        return cached;
      }

      const response = await fetch(`${EXTERNAL_APIS.EXCHANGE_RATES}/${baseCurrency}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Expensio-Currency-Service/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Exchange Rate API responded with status: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();
      
      const exchangeRates: ExchangeRates = {
        base: data.base,
        rates: data.rates,
        timestamp: Date.now()
      };
      
      // Cache the data
      currencyCache.set(cacheKey, exchangeRates, CACHE_TTL.EXCHANGE_RATES);
      
      return exchangeRates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      
      // Try to return stale cached data if available
      const cacheKey = `${CACHE_KEYS.EXCHANGE_RATES}_${baseCurrency}`;
      const staleData = currencyCache.get<ExchangeRates>(cacheKey);
      if (staleData) {
        console.warn('Using stale exchange rates due to API failure');
        return staleData;
      }
      
      throw new Error(`${API_ERROR_CODES.CURRENCY_API_ERROR}: Failed to fetch exchange rates for ${baseCurrency}`);
    }
  }

  /**
   * Get supported currencies from countries data
   */
  async getSupportedCurrencies(): Promise<Currency[]> {
    try {
      const countriesData = await this.fetchCountriesData();
      const currencyMap = new Map<string, Currency>();
      
      // Extract unique currencies from countries data
      countriesData.forEach(country => {
        if (country.currencies) {
          Object.entries(country.currencies).forEach(([code, currencyInfo]) => {
            if (!currencyMap.has(code)) {
              currencyMap.set(code, {
                code,
                name: currencyInfo.name,
                symbol: currencyInfo.symbol || code,
                exchangeRate: 1, // Will be updated when fetching rates
                lastUpdated: new Date()
              });
            }
          });
        }
      });

      return Array.from(currencyMap.values()).sort((a, b) => a.code.localeCompare(b.code));
    } catch (error) {
      console.error('Error getting supported currencies:', error);
      throw new Error(`${API_ERROR_CODES.EXTERNAL_SERVICE_ERROR}: Failed to get supported currencies`);
    }
  }

  /**
   * Update exchange rates in database
   */
  async updateExchangeRates(baseCurrency: string = 'USD'): Promise<void> {
    try {
      const exchangeRates = await this.fetchExchangeRates(baseCurrency);
      const supportedCurrencies = await this.getSupportedCurrencies();
      
      // Prepare currency updates
      const currencyUpdates = supportedCurrencies.map(currency => {
        const rate = exchangeRates.rates[currency.code] || 1;
        return {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          exchangeRate: rate,
          lastUpdated: new Date()
        };
      });

      // Batch update currencies in database
      await Promise.all(
        currencyUpdates.map(currency =>
          prisma.currency.upsert({
            where: { code: currency.code },
            update: {
              exchangeRate: currency.exchangeRate,
              lastUpdated: currency.lastUpdated
            },
            create: currency
          })
        )
      );

      console.log(`Updated exchange rates for ${currencyUpdates.length} currencies`);
    } catch (error) {
      console.error('Error updating exchange rates in database:', error);
      throw new Error(`${API_ERROR_CODES.DATABASE_ERROR}: Failed to update exchange rates`);
    }
  }

  /**
   * Get currency by code from database
   */
  async getCurrency(code: string): Promise<Currency | null> {
    try {
      const currency = await prisma.currency.findUnique({
        where: { code: code.toUpperCase() }
      });

      return currency;
    } catch (error) {
      console.error('Error getting currency from database:', error);
      throw new Error(`${API_ERROR_CODES.DATABASE_ERROR}: Failed to get currency ${code}`);
    }
  }

  /**
   * Get all currencies from database
   */
  async getAllCurrencies(): Promise<Currency[]> {
    try {
      const currencies = await prisma.currency.findMany({
        orderBy: { code: 'asc' }
      });

      return currencies;
    } catch (error) {
      console.error('Error getting currencies from database:', error);
      throw new Error(`${API_ERROR_CODES.DATABASE_ERROR}: Failed to get currencies`);
    }
  }

  /**
   * Check if exchange rates need updating
   */
  async shouldUpdateRates(maxAge: number = CACHE_TTL.EXCHANGE_RATES): Promise<boolean> {
    try {
      const latestCurrency = await prisma.currency.findFirst({
        orderBy: { lastUpdated: 'desc' }
      });

      if (!latestCurrency) return true;

      const ageInSeconds = (Date.now() - latestCurrency.lastUpdated.getTime()) / 1000;
      return ageInSeconds > maxAge;
    } catch (error) {
      console.error('Error checking if rates need updating:', error);
      return true; // Default to updating if we can't check
    }
  }

  /**
   * Get country currency mapping
   */
  async getCountryCurrencyMapping(): Promise<Record<string, string[]>> {
    try {
      const countriesData = await this.fetchCountriesData();
      const mapping: Record<string, string[]> = {};

      countriesData.forEach(country => {
        const countryName = country.name.common;
        if (country.currencies) {
          mapping[countryName] = Object.keys(country.currencies);
        }
      });

      return mapping;
    } catch (error) {
      console.error('Error getting country currency mapping:', error);
      throw new Error(`${API_ERROR_CODES.EXTERNAL_SERVICE_ERROR}: Failed to get country currency mapping`);
    }
  }

  /**
   * Get primary currency for a country
   */
  async getPrimaryCurrencyForCountry(countryName: string): Promise<string | null> {
    try {
      const mapping = await this.getCountryCurrencyMapping();
      const currencies = mapping[countryName];
      
      if (!currencies || currencies.length === 0) {
        return null;
      }

      // Return the first currency (most countries have only one)
      return currencies[0];
    } catch (error) {
      console.error('Error getting primary currency for country:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    currencyCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: currencyCache['cache'].size,
      keys: Array.from(currencyCache['cache'].keys())
    };
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();