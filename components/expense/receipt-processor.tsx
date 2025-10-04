'use client';

import React, { useState } from 'react';
import { ReceiptUpload } from './receipt-upload';
import { OCRDataValidator } from './ocr-data-validator';
import { ExtractedExpenseData, OCRResult } from '@/lib/types';

interface ReceiptProcessorProps {
  onReceiptProcessed: (file: File, extractedData?: ExtractedExpenseData) => void;
  onManualEntry: () => void;
  className?: string;
}

interface ProcessingState {
  file: File | null;
  ocrResult: OCRResult | null;
  step: 'upload' | 'validate' | 'complete';
}

export function ReceiptProcessor({
  onReceiptProcessed,
  onManualEntry,
  className = ''
}: ReceiptProcessorProps) {
  const [state, setState] = useState<ProcessingState>({
    file: null,
    ocrResult: null,
    step: 'upload',
  });

  const handleFileUpload = (file: File, ocrResult?: OCRResult) => {
    setState({
      file,
      ocrResult: ocrResult || null,
      step: ocrResult?.extractedData ? 'validate' : 'complete',
    });

    // If no OCR data, proceed directly to completion
    if (!ocrResult?.extractedData) {
      onReceiptProcessed(file);
    }
  };

  const handleDataCorrected = (correctedData: Partial<ExtractedExpenseData>) => {
    if (state.file) {
      const finalData: ExtractedExpenseData = {
        amount: correctedData.amount || 0,
        currency: correctedData.currency,
        date: correctedData.date,
        vendor: correctedData.vendor,
        category: correctedData.category,
        confidence: state.ocrResult?.confidence || 0,
      };

      setState(prev => ({ ...prev, step: 'complete' }));
      onReceiptProcessed(state.file, finalData);
    }
  };

  const handleStartOver = () => {
    setState({
      file: null,
      ocrResult: null,
      step: 'upload',
    });
  };

  const handleManualEntry = () => {
    onManualEntry();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            state.step === 'upload' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {state.step === 'upload' ? '1' : '✓'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-900">Upload Receipt</span>
        </div>
        
        <div className={`w-8 h-0.5 ${state.step === 'validate' || state.step === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
        
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            state.step === 'validate' ? 'bg-blue-600 text-white' : 
            state.step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {state.step === 'complete' ? '✓' : '2'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-900">Validate Data</span>
        </div>
        
        <div className={`w-8 h-0.5 ${state.step === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`} />
        
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            state.step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {state.step === 'complete' ? '✓' : '3'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-900">Complete</span>
        </div>
      </div>

      {/* Content based on current step */}
      {state.step === 'upload' && (
        <ReceiptUpload
          onUpload={handleFileUpload}
          onOCRDataExtracted={(data) => {
            // This is handled in handleFileUpload
          }}
        />
      )}

      {state.step === 'validate' && state.ocrResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Review Extracted Data</h3>
            <button
              onClick={handleStartOver}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Upload Different Receipt
            </button>
          </div>
          
          <OCRDataValidator
            extractedData={state.ocrResult.extractedData || null}
            onDataCorrected={handleDataCorrected}
            onManualEntry={handleManualEntry}
          />
        </div>
      )}

      {state.step === 'complete' && (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Receipt Processed Successfully</h3>
          <p className="text-gray-600 mb-6">
            Your receipt has been uploaded and processed. The extracted data has been applied to your expense form.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleStartOver}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Upload Another Receipt
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Option */}
      {state.step === 'upload' && (
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Having trouble with your receipt?
          </p>
          <button
            onClick={handleManualEntry}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Enter expense details manually
          </button>
        </div>
      )}
    </div>
  );
}