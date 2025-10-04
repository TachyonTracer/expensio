'use client';

import React, { useState, useMemo } from 'react';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { Currency } from '@/lib/types';
import { getPopularCurrencies } from '@/lib/utils/currency-init';

interface CurrencySelectorProps {
  value?: string;
  onChange: (currencyCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showPopularFirst?: boolean;
  className?: string;
  error?: string;
  label?: string;
  required?: boolean;
}

export function CurrencySelector({
  value,
  onChange,
  placeholder = 'Select currency',
  disabled = false,
  showPopularFirst = true,
  className = '',
  error,
  label,
  required = false
}: CurrencySelectorProps) {
  const { currencies, loading, error: currencyError } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Organize currencies with popular ones first
  const organizedCurrencies = useMemo(() => {
    if (!currencies.length) return { popular: [], others: [] };

    const popularCodes = getPopularCurrencies();
    const popular: Currency[] = [];
    const others: Currency[] = [];

    currencies.forEach(currency => {
      if (popularCodes.includes(currency.code)) {
        popular.push(currency);
      } else {
        others.push(currency);
      }
    });

    // Sort popular currencies by the order in popularCodes
    popular.sort((a, b) => {
      const aIndex = popularCodes.indexOf(a.code);
      const bIndex = popularCodes.indexOf(b.code);
      return aIndex - bIndex;
    });

    // Sort others alphabetically
    others.sort((a, b) => a.code.localeCompare(b.code));

    return { popular, others };
  }, [currencies]);

  // Filter currencies based on search term
  const filteredCurrencies = useMemo(() => {
    if (!searchTerm) return organizedCurrencies;

    const searchLower = searchTerm.toLowerCase();
    const filterCurrencies = (currencyList: Currency[]) =>
      currencyList.filter(currency =>
        currency.code.toLowerCase().includes(searchLower) ||
        currency.name.toLowerCase().includes(searchLower)
      );

    return {
      popular: filterCurrencies(organizedCurrencies.popular),
      others: filterCurrencies(organizedCurrencies.others)
    };
  }, [organizedCurrencies, searchTerm]);

  const selectedCurrency = currencies.find(c => c.code === value);

  const handleSelect = (currencyCode: string) => {
    onChange(currencyCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 animate-pulse">
          <div className="h-5 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (currencyError) {
    return (
      <div className={`relative ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
          Error loading currencies
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Selected value display / trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {selectedCurrency ? (
              <>
                <span className="font-medium">{selectedCurrency.code}</span>
                <span className="ml-2 text-gray-500 truncate">
                  {selectedCurrency.name}
                </span>
                <span className="ml-2 text-gray-400">
                  {selectedCurrency.symbol}
                </span>
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search currencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Currency list */}
          <div className="overflow-y-auto max-h-48">
            {/* Popular currencies */}
            {showPopularFirst && filteredCurrencies.popular.length > 0 && (
              <>
                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
                  Popular Currencies
                </div>
                {filteredCurrencies.popular.map((currency) => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => handleSelect(currency.code)}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50
                      ${value === currency.code ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium">{currency.code}</span>
                        <span className="ml-2 text-sm text-gray-600 truncate">
                          {currency.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {currency.symbol}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Other currencies */}
            {filteredCurrencies.others.length > 0 && (
              <>
                {showPopularFirst && filteredCurrencies.popular.length > 0 && (
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
                    Other Currencies
                  </div>
                )}
                {filteredCurrencies.others.map((currency) => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => handleSelect(currency.code)}
                    className={`
                      w-full px-3 py-2 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50
                      ${value === currency.code ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium">{currency.code}</span>
                        <span className="ml-2 text-sm text-gray-600 truncate">
                          {currency.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {currency.symbol}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* No results */}
            {filteredCurrencies.popular.length === 0 && filteredCurrencies.others.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No currencies found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default CurrencySelector;