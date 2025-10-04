'use client';

import { useState, useCallback } from 'react';
import { OCRResult, ExtractedExpenseData } from '../types';

interface UseOCROptions {
  onSuccess?: (result: OCRResult) => void;
  onError?: (error: Error) => void;
}

interface UseOCRReturn {
  processReceipt: (file: File) => Promise<OCRResult | null>;
  reprocessReceipt: (receiptId: string) => Promise<OCRResult | null>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useOCR(options: UseOCROptions = {}): UseOCRReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const processReceipt = useCallback(async (file: File): Promise<OCRResult | null> => {
    if (!file.type.startsWith('image/')) {
      const error = new Error('OCR processing is only available for image files');
      setError(error.message);
      options.onError?.(error);
      return null;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'OCR processing failed');
      }

      const result = await response.json();
      const ocrResult = result.data?.ocrResult;

      if (!ocrResult) {
        throw new Error('No OCR result received');
      }

      options.onSuccess?.(ocrResult);
      return ocrResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error.message);
      options.onError?.(error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  const reprocessReceipt = useCallback(async (receiptId: string): Promise<OCRResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'OCR reprocessing failed');
      }

      const result = await response.json();
      const ocrResult = result.data?.ocrResult;

      if (!ocrResult) {
        throw new Error('No OCR result received');
      }

      options.onSuccess?.(ocrResult);
      return ocrResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error.message);
      options.onError?.(error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  return {
    processReceipt,
    reprocessReceipt,
    isProcessing,
    error,
    clearError,
  };
}