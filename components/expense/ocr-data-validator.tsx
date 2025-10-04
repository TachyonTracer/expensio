'use client';

import React, { useState, useEffect } from 'react';
import { ExtractedExpenseData } from '@/lib/types';

interface OCRDataValidatorProps {
  extractedData: ExtractedExpenseData | null;
  onDataCorrected: (correctedData: Partial<ExtractedExpenseData>) => void;
  onManualEntry: () => void;
  className?: string;
}

interface ValidationErrors {
  amount?: string;
  currency?: string;
  date?: string;
  vendor?: string;
  category?: string;
}

export function OCRDataValidator({
  extractedData,
  onDataCorrected,
  onManualEntry,
  className = ''
}: OCRDataValidatorProps) {
  const [correctedData, setCorrectedData] = useState<Partial<ExtractedExpenseData>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (extractedData) {
      setCorrectedData({
        amount: extractedData.amount,
        currency: extractedData.currency,
        date: extractedData.date,
        vendor: extractedData.vendor,
        category: extractedData.category,
      });
    }
  }, [extractedData]);

  const validateData = (data: Partial<ExtractedExpenseData>): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!data.amount || data.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (data.amount > 10000) {
      newErrors.amount = 'Amount seems unusually high. Please verify.';
    }

    if (data.currency && data.currency.length !== 3) {
      newErrors.currency = 'Currency code must be 3 characters (e.g., USD, EUR)';
    }

    if (data.date) {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      if (data.date > now) {
        newErrors.date = 'Date cannot be in the future';
      } else if (data.date < oneYearAgo) {
        newErrors.date = 'Date seems too old. Please verify.';
      }
    }

    if (data.vendor && data.vendor.length < 2) {
      newErrors.vendor = 'Vendor name seems too short';
    }

    return newErrors;
  };

  const handleInputChange = (field: keyof ExtractedExpenseData, value: any) => {
    const newData = { ...correctedData, [field]: value };
    setCorrectedData(newData);
    
    // Validate and update errors
    const newErrors = validateData(newData);
    setErrors(newErrors);
  };

  const handleSaveCorrections = () => {
    const validationErrors = validateData(correctedData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      onDataCorrected(correctedData);
      setIsEditing(false);
    }
  };

  const handleCancelEditing = () => {
    if (extractedData) {
      setCorrectedData({
        amount: extractedData.amount,
        currency: extractedData.currency,
        date: extractedData.date,
        vendor: extractedData.vendor,
        category: extractedData.category,
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-600 bg-green-50';
    if (confidence > 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence > 0.7) return 'High';
    if (confidence > 0.4) return 'Medium';
    return 'Low';
  };

  if (!extractedData) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No OCR Data Available</h3>
          <p className="text-gray-600 mb-4">
            OCR processing failed or no data was extracted from the receipt.
          </p>
          <button
            onClick={onManualEntry}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Enter Data Manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">OCR Extracted Data</h3>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(extractedData.confidence)}`}
          >
            {getConfidenceText(extractedData.confidence)} Confidence ({Math.round(extractedData.confidence * 100)}%)
          </span>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {extractedData.confidence < 0.5 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                Low confidence OCR results. Please review and correct the extracted data below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          {isEditing ? (
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={correctedData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className={`flex-1 border rounded-md px-3 py-2 text-sm ${
                  errors.amount ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="0.00"
              />
              <input
                type="text"
                value={correctedData.currency || ''}
                onChange={(e) => handleInputChange('currency', e.target.value.toUpperCase())}
                className={`w-20 border rounded-md px-3 py-2 text-sm ${
                  errors.currency ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="USD"
                maxLength={3}
              />
            </div>
          ) : (
            <div className="text-sm text-gray-900">
              {correctedData.currency} {correctedData.amount?.toFixed(2) || 'Not detected'}
            </div>
          )}
          {errors.amount && <p className="text-red-600 text-xs mt-1">{errors.amount}</p>}
          {errors.currency && <p className="text-red-600 text-xs mt-1">{errors.currency}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          {isEditing ? (
            <input
              type="date"
              value={correctedData.date ? correctedData.date.toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('date', e.target.value ? new Date(e.target.value) : null)}
              className={`w-full border rounded-md px-3 py-2 text-sm ${
                errors.date ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            />
          ) : (
            <div className="text-sm text-gray-900">
              {correctedData.date ? correctedData.date.toLocaleDateString() : 'Not detected'}
            </div>
          )}
          {errors.date && <p className="text-red-600 text-xs mt-1">{errors.date}</p>}
        </div>

        {/* Vendor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor
          </label>
          {isEditing ? (
            <input
              type="text"
              value={correctedData.vendor || ''}
              onChange={(e) => handleInputChange('vendor', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm ${
                errors.vendor ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="Vendor name"
            />
          ) : (
            <div className="text-sm text-gray-900">
              {correctedData.vendor || 'Not detected'}
            </div>
          )}
          {errors.vendor && <p className="text-red-600 text-xs mt-1">{errors.vendor}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          {isEditing ? (
            <select
              value={correctedData.category || ''}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select category</option>
              <option value="Food & Dining">Food & Dining</option>
              <option value="Transportation">Transportation</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Utilities">Utilities</option>
              <option value="Other">Other</option>
            </select>
          ) : (
            <div className="text-sm text-gray-900">
              {correctedData.category || 'Not detected'}
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancelEditing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCorrections}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Corrections
          </button>
        </div>
      )}

      {!isEditing && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onManualEntry}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Enter manually instead
          </button>
          <button
            onClick={() => onDataCorrected(correctedData)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors"
          >
            Use This Data
          </button>
        </div>
      )}
    </div>
  );
}