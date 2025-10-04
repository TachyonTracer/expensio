'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCurrency } from '@/lib/hooks/useCurrency';
import CurrencySelector from './currency-selector';

interface CurrencyConverterProps {
  initialAmount?: number;
  initialFromCurrency?: string;
  initialToCurrency?: string;
  onConversionChange?: (result: {
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    targetCurrency: string;
    exchangeRate: number;
  }) => void;
  className?: string;
  showRealTimeToggle?: boolean;
  disabled?: boolean;
}

export function CurrencyConverter({
  initialAmount = 0,
  initialFromCurrency = 'USD',
  initialToCurrency = 'EUR',
  onConversionChange,
  className = '',
  showRealTimeToggle = true,
  disabled = false
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [fromCurrency, setFromCurrency] = useState(initialFromCurrency);
  const [toCurrency, setToCurrency] = useState(initialToCurrency);
  const [useRealTimeRates, setUseRealTimeRates] = useState(true);
  const [lastConversion, setLastConversion] = useState<Date | null>(null);

  const {
    convertCurrency,
    conversionResult,
    conversionLoading,
    conversionError,
    formatCurrency,
    clearConversionResult
  } = useCurrency();

  // Perform conversion
  const performConversion = useCallback(async () => {
    if (amount <= 0 || !fromCurrency || !toCurrency || fromCurrency === toCurrency) {
      clearConversionResult();
      return;
    }

    try {
      const result = await convertCurrency(amount, fromCurrency, toCurrency, useRealTimeRates);
      setLastConversion(new Date());
      
      if (onConversionChange) {
        onConversionChange({
          originalAmount: result.originalAmount,
          originalCurrency: result.originalCurrency,
          convertedAmount: result.convertedAmount,
          targetCurrency: result.targetCurrency,
          exchangeRate: result.exchangeRate
        });
      }
    } catch (error) {
      console.error('Conversion failed:', error);
    }
  }, [amount, fromCurrency, toCurrency, useRealTimeRates, convertCurrency, onConversionChange, clearConversionResult]);

  // Auto-convert when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performConversion();
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [performConversion]);

  // Swap currencies
  const swapCurrencies = () => {
    if (disabled) return;
    
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <input
          type="number"
          value={amount || ''}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          placeholder="Enter amount"
          min="0"
          step="0.01"
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${conversionError ? 'border-red-300' : 'border-gray-300'}
          `}
        />
      </div>

      {/* Currency Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* From Currency */}
        <div>
          <CurrencySelector
            label="From"
            value={fromCurrency}
            onChange={setFromCurrency}
            disabled={disabled}
            placeholder="Select source currency"
          />
        </div>

        {/* Swap Button */}
        <div className="flex items-end justify-center md:absolute md:left-1/2 md:transform md:-translate-x-1/2 md:z-10">
          <button
            type="button"
            onClick={swapCurrencies}
            disabled={disabled}
            className={`
              p-2 rounded-full border-2 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            title="Swap currencies"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>

        {/* To Currency */}
        <div>
          <CurrencySelector
            label="To"
            value={toCurrency}
            onChange={setToCurrency}
            disabled={disabled}
            placeholder="Select target currency"
          />
        </div>
      </div>

      {/* Real-time rates toggle */}
      {showRealTimeToggle && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="realtime-rates"
            checked={useRealTimeRates}
            onChange={(e) => setUseRealTimeRates(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="realtime-rates" className="ml-2 text-sm text-gray-700">
            Use real-time exchange rates
          </label>
        </div>
      )}

      {/* Conversion Result */}
      <div className="bg-gray-50 rounded-lg p-4">
        {conversionLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Converting...</span>
          </div>
        )}

        {conversionError && (
          <div className="text-red-600 text-sm">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {conversionError}
            </div>
          </div>
        )}

        {conversionResult && !conversionLoading && !conversionError && (
          <div className="space-y-3">
            {/* Conversion Display */}
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900">
                {formatCurrency(conversionResult.originalAmount, conversionResult.originalCurrency)}
              </div>
              <div className="text-sm text-gray-500 my-1">equals</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(conversionResult.convertedAmount, conversionResult.targetCurrency)}
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="text-center text-sm text-gray-600 border-t pt-3">
              <div>
                1 {conversionResult.originalCurrency} = {conversionResult.exchangeRate.toFixed(4)} {conversionResult.targetCurrency}
              </div>
              {lastConversion && (
                <div className="text-xs text-gray-500 mt-1">
                  Updated: {lastConversion.toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Rate Source */}
            <div className="text-xs text-gray-500 text-center">
              {useRealTimeRates ? 'Real-time rates' : 'Cached rates'}
            </div>
          </div>
        )}

        {/* Same Currency Message */}
        {fromCurrency === toCurrency && amount > 0 && (
          <div className="text-center text-gray-600">
            <div className="text-lg font-medium">
              {formatCurrency(amount, fromCurrency)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Same currency selected
            </div>
          </div>
        )}

        {/* No Amount Message */}
        {amount <= 0 && (
          <div className="text-center text-gray-500 py-4">
            Enter an amount to see conversion
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrencyConverter;