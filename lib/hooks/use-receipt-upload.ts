'use client';

import { useState, useCallback } from 'react';
import { Receipt } from '../types';

interface UseReceiptUploadOptions {
  onSuccess?: (receipt: Receipt) => void;
  onError?: (error: Error) => void;
}

interface UseReceiptUploadReturn {
  uploadReceipt: (file: File, expenseId?: string) => Promise<Receipt | null>;
  deleteReceipt: (receiptId: string) => Promise<boolean>;
  getReceipt: (receiptId: string) => Promise<Receipt | null>;
  getReceipts: (expenseId?: string) => Promise<Receipt[]>;
  isUploading: boolean;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useReceiptUpload(options: UseReceiptUploadOptions = {}): UseReceiptUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const uploadReceipt = useCallback(async (file: File, expenseId?: string): Promise<Receipt | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (expenseId) {
        formData.append('expenseId', expenseId);
      }

      const response = await fetch('/api/receipts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const result = await response.json();
      const receipt = result.data?.receipt;

      if (!receipt) {
        throw new Error('No receipt data received');
      }

      options.onSuccess?.(receipt);
      return receipt;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error.message);
      options.onError?.(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const deleteReceipt = useCallback(async (receiptId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Delete failed');
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error.message);
      options.onError?.(error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [options]);

  const getReceipt = useCallback(async (receiptId: string): Promise<Receipt | null> => {
    setError(null);

    try {
      const response = await fetch(`/api/receipts/${receiptId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch receipt');
      }

      const result = await response.json();
      return result.data?.receipt || null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error.message);
      options.onError?.(error);
      return null;
    }
  }, [options]);

  const getReceipts = useCallback(async (expenseId?: string): Promise<Receipt[]> => {
    setError(null);

    try {
      const url = expenseId ? `/api/receipts?expenseId=${expenseId}` : '/api/receipts';
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch receipts');
      }

      const result = await response.json();
      return result.data?.receipts || [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error.message);
      options.onError?.(error);
      return [];
    }
  }, [options]);

  return {
    uploadReceipt,
    deleteReceipt,
    getReceipt,
    getReceipts,
    isUploading,
    isDeleting,
    error,
    clearError,
  };
}