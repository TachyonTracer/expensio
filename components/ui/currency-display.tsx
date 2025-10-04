'use client';

import React from 'react';
import { useCurrency } from '@/lib/hooks/useCurrency';

interface CurrencyDisplayProps {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount?: number;
  convertedCurrency?: string;
  exchangeRate?: number;
  showBothAmounts?: boolean;
  showExchangeRate?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  emphasize?: 'original' | 'converted' | 'none';
}

export function CurrencyDisplay({
  originalAmount,
  originalCurrency,
  convertedAmount,
  convertedCurrency,
  exchangeRate,
  showBothAmounts = true,
  showExchangeRate = false,
  className = '',
  size = 'md',
  layout = 'vertical',
  emphasize = 'converted'
}: CurrencyDisplayProps) {
  const { formatCurrency } = useCurrency();

  // Size classes
  const sizeClasses = {
    sm: {
      primary: 'text-sm font-medium',
      secondary: 'text-xs',
      rate: 'text-xs'
    },
    md: {
      primary: 'text-base font-semibold',
      secondary: 'text-sm',
      rate: 'text-xs'
    },
    lg: {
      primary: 'text-lg font-bold',
      secondary: 'text-base',
      rate: 'text-sm'
    }
  };

  const classes = sizeClasses[size];

  // Format amounts
  const formattedOriginal = formatCurrency(originalAmount, originalCurrency);
  const formattedConverted = convertedAmount && convertedCurrency 
    ? formatCurrency(convertedAmount, convertedCurrency)
    : null;

  // Determine which amount to emphasize
  const primaryAmount = emphasize === 'original' ? formattedOriginal : formattedConverted || formattedOriginal;
  const secondaryAmount = emphasize === 'original' ? formattedConverted : formattedOriginal;

  // Layout classes
  const layoutClasses = layout === 'horizontal' 
    ? 'flex items-center space-x-2' 
    : 'space-y-1';

  return (
    <div className={`${layoutClasses} ${className}`}>
      {/* Primary amount (emphasized) */}
      <div className={`${classes.primary} text-gray-900`}>
        {primaryAmount}
      </div>

      {/* Secondary amount and exchange rate */}
      {showBothAmounts && secondaryAmount && (
        <div className="flex flex-col space-y-1">
          {/* Secondary amount */}
          <div className={`${classes.secondary} text-gray-600`}>
            {layout === 'horizontal' ? `(${secondaryAmount})` : secondaryAmount}
          </div>

          {/* Exchange rate */}
          {showExchangeRate && exchangeRate && (
            <div className={`${classes.rate} text-gray-500`}>
              {emphasize === 'original' ? (
                <>1 {originalCurrency} = {exchangeRate.toFixed(4)} {convertedCurrency}</>
              ) : (
                <>1 {convertedCurrency} = {(1 / exchangeRate).toFixed(4)} {originalCurrency}</>
              )}
            </div>
          )}
        </div>
      )}

      {/* Show only exchange rate if not showing both amounts */}
      {!showBothAmounts && showExchangeRate && exchangeRate && convertedCurrency && (
        <div className={`${classes.rate} text-gray-500`}>
          Rate: 1 {originalCurrency} = {exchangeRate.toFixed(4)} {convertedCurrency}
        </div>
      )}
    </div>
  );
}

interface CurrencyComparisonProps {
  amounts: Array<{
    amount: number;
    currency: string;
    label?: string;
  }>;
  baseCurrency?: string;
  className?: string;
  showRates?: boolean;
}

export function CurrencyComparison({
  amounts,
  baseCurrency = 'USD',
  className = '',
  showRates = false
}: CurrencyComparisonProps) {
  const { formatCurrency, getExchangeRate } = useCurrency();
  const [rates, setRates] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);

  // Fetch exchange rates for all currencies
  React.useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const ratePromises = amounts.map(async ({ currency }) => {
          if (currency === baseCurrency) return { currency, rate: 1 };
          const rate = await getExchangeRate(currency, baseCurrency);
          return { currency, rate };
        });

        const rateResults = await Promise.all(ratePromises);
        const rateMap = rateResults.reduce((acc, { currency, rate }) => {
          acc[currency] = rate;
          return acc;
        }, {} as Record<string, number>);

        setRates(rateMap);
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      } finally {
        setLoading(false);
      }
    };

    if (amounts.length > 0) {
      fetchRates();
    }
  }, [amounts, baseCurrency, getExchangeRate]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {amounts.map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {amounts.map(({ amount, currency, label }, index) => {
        const rate = rates[currency] || 1;
        const convertedAmount = amount * rate;

        return (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              {label && (
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {label}
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="font-semibold text-gray-900">
                  {formatCurrency(amount, currency)}
                </div>
                {currency !== baseCurrency && (
                  <>
                    <span className="text-gray-400">→</span>
                    <div className="text-gray-600">
                      {formatCurrency(convertedAmount, baseCurrency)}
                    </div>
                  </>
                )}
              </div>
              {showRates && currency !== baseCurrency && (
                <div className="text-xs text-gray-500 mt-1">
                  1 {currency} = {rate.toFixed(4)} {baseCurrency}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Total in base currency */}
      {amounts.length > 1 && (
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between font-semibold text-gray-900">
            <span>Total ({baseCurrency})</span>
            <span>
              {formatCurrency(
                amounts.reduce((total, { amount, currency }) => {
                  const rate = rates[currency] || 1;
                  return total + (amount * rate);
                }, 0),
                baseCurrency
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CurrencyDisplay;