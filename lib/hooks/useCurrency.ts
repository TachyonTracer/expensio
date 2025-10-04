'use client';

import { useState, useEffect, useCallback } from 'react';
import { Currency, ConversionResult, ApiResponse } from '../types';

interface UseCurrencyOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface CurrencyState {
  currencies: Currency[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface ConversionState {
  result: ConversionResult | null;
  loading: boolean;
  error: string | null;
}

export function useCurrency(options: UseCurrencyOptions = {}) {
  const { autoRefresh = false, refreshInterval = 300000 } = options; // 5 minutes default

  const [state, setState] = useState<CurrencyState>({
    currencies: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const [conversionState, setConversionState] = useState<ConversionState>({
    result: null,
    loading: false,
    error: null
  });

  /**
   * Fetch all currencies
   */
  const fetchCurrencies = useCallback(async (refresh: boolean = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const url = new URL('/api/currencies', window.location.origin);
      if (refresh) {
        url.searchParams.set('refresh', 'true');
      }

      const response = await fetch(url.toString());
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch currencies');
      }

      setState({
        currencies: data.data.currencies,
        loading: false,
        error: null,
        lastUpdated: data.data.lastUpdated ? new Date(data.data.lastUpdated) : null
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch currencies'
      }));
    }
  }, []);

  /**
   * Refresh exchange rates
   */
  const refreshRates = useCallback(async (baseCurrency: string = 'USD') => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/currencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ baseCurrency })
      });

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to refresh rates');
      }

      // Refetch currencies to get updated data
      await fetchCurrencies();

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh rates'
      }));
    }
  }, [fetchCurrencies]);

  /**
   * Convert currency amount
   */
  const convertCurrency = useCallback(async (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    useRealTimeRates: boolean = true
  ) => {
    try {
      setConversionState({ result: null, loading: true, error: null });

      const response = await fetch('/api/currencies/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          fromCurrency,
          toCurrency,
          useRealTimeRates
        })
      });

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Currency conversion failed');
      }

      setConversionState({
        result: data.data.conversion,
        loading: false,
        error: null
      });

      return data.data.conversion;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Currency conversion failed';
      setConversionState({
        result: null,
        loading: false,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Get exchange rate between two currencies
   */
  const getExchangeRate = useCallback(async (
    fromCurrency: string,
    toCurrency: string,
    useRealTimeRates: boolean = true
  ): Promise<number> => {
    try {
      const url = new URL('/api/currencies/convert', window.location.origin);
      url.searchParams.set('from', fromCurrency);
      url.searchParams.set('to', toCurrency);
      url.searchParams.set('amount', '1');
      url.searchParams.set('realtime', useRealTimeRates.toString());

      const response = await fetch(url.toString());
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to get exchange rate');
      }

      return data.data.conversion.exchangeRate;

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get exchange rate');
    }
  }, []);

  /**
   * Format currency amount
   */
  const formatCurrency = useCallback((
    amount: number,
    currencyCode: string,
    locale: string = 'en-US'
  ): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  }, []);

  /**
   * Get currency by code
   */
  const getCurrency = useCallback((code: string): Currency | undefined => {
    return state.currencies.find(currency => currency.code === code.toUpperCase());
  }, [state.currencies]);

  /**
   * Check if rates are stale
   */
  const areRatesStale = useCallback((maxAgeMinutes: number = 60): boolean => {
    if (!state.lastUpdated) return true;
    
    const ageInMinutes = (Date.now() - state.lastUpdated.getTime()) / (1000 * 60);
    return ageInMinutes > maxAgeMinutes;
  }, [state.lastUpdated]);

  // Initial fetch
  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (areRatesStale(refreshInterval / 60000)) {
        fetchCurrencies(true);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, areRatesStale, fetchCurrencies]);

  return {
    // State
    currencies: state.currencies,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Conversion state
    conversionResult: conversionState.result,
    conversionLoading: conversionState.loading,
    conversionError: conversionState.error,
    
    // Actions
    fetchCurrencies,
    refreshRates,
    convertCurrency,
    getExchangeRate,
    formatCurrency,
    getCurrency,
    areRatesStale,
    
    // Utilities
    clearConversionResult: () => setConversionState({ result: null, loading: false, error: null })
  };
}

/**
 * Hook for getting countries and their currencies
 */
export function useCountries() {
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = useCallback(async (includeMapping: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL('/api/countries', window.location.origin);
      if (includeMapping) {
        url.searchParams.set('mapping', 'true');
      }

      const response = await fetch(url.toString());
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch countries');
      }

      setCountries(data.data.countries);
      setLoading(false);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch countries');
      setLoading(false);
    }
  }, []);

  const getPrimaryCurrency = useCallback(async (countryName: string): Promise<string | null> => {
    try {
      const url = new URL('/api/countries', window.location.origin);
      url.searchParams.set('country', countryName);

      const response = await fetch(url.toString());
      const data: ApiResponse = await response.json();

      if (!data.success) {
        return null;
      }

      return data.data.primaryCurrency;

    } catch (error) {
      console.error('Error getting primary currency:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    loading,
    error,
    fetchCountries,
    getPrimaryCurrency
  };
}