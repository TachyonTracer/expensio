import { ConversionResult, Currency } from '../types';
import { API_ERROR_CODES } from '../constants';
import { currencyService } from './currency.service';
import { prisma } from '../db';

export class CurrencyConversionService {
  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    useRealTimeRates: boolean = true
  ): Promise<ConversionResult> {
    try {
      // Validate input
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      if (!fromCurrency || !toCurrency) {
        throw new Error('Both from and to currencies are required');
      }

      // Normalize currency codes
      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();

      // If same currency, return as-is
      if (from === to) {
        return {
          originalAmount: amount,
          originalCurrency: from,
          convertedAmount: amount,
          targetCurrency: to,
          exchangeRate: 1,
          timestamp: new Date()
        };
      }

      let exchangeRate: number;

      if (useRealTimeRates) {
        // Try to get real-time rates
        try {
          const rates = await currencyService.fetchExchangeRates(from);
          exchangeRate = rates.rates[to];
          
          if (!exchangeRate) {
            throw new Error(`Exchange rate not available for ${from} to ${to}`);
          }
        } catch (error) {
          console.warn('Failed to get real-time rates, falling back to database rates:', error);
          exchangeRate = await this.getExchangeRateFromDatabase(from, to);
        }
      } else {
        // Use database rates
        exchangeRate = await this.getExchangeRateFromDatabase(from, to);
      }

      const convertedAmount = amount * exchangeRate;

      return {
        originalAmount: amount,
        originalCurrency: from,
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        targetCurrency: to,
        exchangeRate,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      throw new Error(`${API_ERROR_CODES.CURRENCY_API_ERROR}: ${error instanceof Error ? error.message : 'Currency conversion failed'}`);
    }
  }

  /**
   * Get exchange rate from database
   */
  private async getExchangeRateFromDatabase(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      // Get both currencies from database
      const [fromCurrencyData, toCurrencyData] = await Promise.all([
        prisma.currency.findUnique({ where: { code: fromCurrency } }),
        prisma.currency.findUnique({ where: { code: toCurrency } })
      ]);

      if (!fromCurrencyData) {
        throw new Error(`Currency ${fromCurrency} not found in database`);
      }

      if (!toCurrencyData) {
        throw new Error(`Currency ${toCurrency} not found in database`);
      }

      // Calculate cross rate (assuming rates are relative to USD)
      const fromRate = Number(fromCurrencyData.exchangeRate);
      const toRate = Number(toCurrencyData.exchangeRate);

      if (fromRate === 0) {
        throw new Error(`Invalid exchange rate for ${fromCurrency}`);
      }

      // Cross rate calculation: (1 / fromRate) * toRate
      const exchangeRate = toRate / fromRate;

      return exchangeRate;
    } catch (error) {
      console.error('Error getting exchange rate from database:', error);
      throw new Error(`Failed to get exchange rate for ${fromCurrency} to ${toCurrency}`);
    }
  }

  /**
   * Convert multiple amounts at once
   */
  async convertMultipleAmounts(
    conversions: Array<{
      amount: number;
      fromCurrency: string;
      toCurrency: string;
    }>,
    useRealTimeRates: boolean = true
  ): Promise<ConversionResult[]> {
    try {
      const results = await Promise.all(
        conversions.map(({ amount, fromCurrency, toCurrency }) =>
          this.convertAmount(amount, fromCurrency, toCurrency, useRealTimeRates)
        )
      );

      return results;
    } catch (error) {
      console.error('Error converting multiple amounts:', error);
      throw new Error(`${API_ERROR_CODES.CURRENCY_API_ERROR}: Failed to convert multiple amounts`);
    }
  }

  /**
   * Get conversion rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    useRealTimeRates: boolean = true
  ): Promise<number> {
    try {
      const result = await this.convertAmount(1, fromCurrency, toCurrency, useRealTimeRates);
      return result.exchangeRate;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      throw new Error(`${API_ERROR_CODES.CURRENCY_API_ERROR}: Failed to get exchange rate`);
    }
  }

  /**
   * Convert expense amount to company base currency
   */
  async convertToBaseCurrency(
    amount: number,
    originalCurrency: string,
    baseCurrency: string,
    expenseDate?: Date
  ): Promise<ConversionResult> {
    try {
      // For historical accuracy, we might want to use rates from the expense date
      // For now, we'll use current rates but this can be enhanced later
      const result = await this.convertAmount(amount, originalCurrency, baseCurrency, true);

      // If expense date is provided and significantly old, log a warning
      if (expenseDate) {
        const daysDiff = Math.abs(Date.now() - expenseDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 30) {
          console.warn(`Converting expense from ${daysDiff.toFixed(0)} days ago. Consider using historical rates.`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error converting to base currency:', error);
      throw new Error(`${API_ERROR_CODES.CURRENCY_API_ERROR}: Failed to convert to base currency`);
    }
  }

  /**
   * Validate currency code
   */
  async validateCurrency(currencyCode: string): Promise<boolean> {
    try {
      const currency = await currencyService.getCurrency(currencyCode);
      return currency !== null;
    } catch (error) {
      console.error('Error validating currency:', error);
      return false;
    }
  }

  /**
   * Get supported currency pairs for conversion
   */
  async getSupportedCurrencyPairs(): Promise<Array<{ from: string; to: string }>> {
    try {
      const currencies = await currencyService.getAllCurrencies();
      const pairs: Array<{ from: string; to: string }> = [];

      // Generate all possible pairs
      currencies.forEach(fromCurrency => {
        currencies.forEach(toCurrency => {
          if (fromCurrency.code !== toCurrency.code) {
            pairs.push({
              from: fromCurrency.code,
              to: toCurrency.code
            });
          }
        });
      });

      return pairs;
    } catch (error) {
      console.error('Error getting supported currency pairs:', error);
      throw new Error(`${API_ERROR_CODES.DATABASE_ERROR}: Failed to get supported currency pairs`);
    }
  }

  /**
   * Format currency amount with proper symbol and formatting
   */
  formatCurrencyAmount(amount: number, currencyCode: string, locale: string = 'en-US'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Get conversion summary for display
   */
  async getConversionSummary(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    locale: string = 'en-US'
  ): Promise<{
    original: string;
    converted: string;
    rate: string;
    timestamp: string;
  }> {
    try {
      const result = await this.convertAmount(amount, fromCurrency, toCurrency);

      return {
        original: this.formatCurrencyAmount(result.originalAmount, result.originalCurrency, locale),
        converted: this.formatCurrencyAmount(result.convertedAmount, result.targetCurrency, locale),
        rate: `1 ${result.originalCurrency} = ${result.exchangeRate.toFixed(4)} ${result.targetCurrency}`,
        timestamp: result.timestamp.toISOString()
      };
    } catch (error) {
      console.error('Error getting conversion summary:', error);
      throw new Error(`${API_ERROR_CODES.CURRENCY_API_ERROR}: Failed to get conversion summary`);
    }
  }

  /**
   * Check if conversion rates are stale and need updating
   */
  async areRatesStale(maxAgeHours: number = 1): Promise<boolean> {
    try {
      return await currencyService.shouldUpdateRates(maxAgeHours * 3600);
    } catch (error) {
      console.error('Error checking if rates are stale:', error);
      return true; // Default to stale if we can't check
    }
  }

  /**
   * Refresh exchange rates if needed
   */
  async refreshRatesIfNeeded(baseCurrency: string = 'USD', forceRefresh: boolean = false): Promise<boolean> {
    try {
      if (forceRefresh || await this.areRatesStale()) {
        await currencyService.updateExchangeRates(baseCurrency);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing rates:', error);
      return false;
    }
  }
}

// Export singleton instance
export const currencyConversionService = new CurrencyConversionService();