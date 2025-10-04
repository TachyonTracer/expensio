'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ExtractedExpenseData, OCRResult } from '@/lib/types';

interface ReceiptUploadProps {
  onUpload: (file: File, ocrResult?: OCRResult) => void;
  onOCRDataExtracted?: (data: ExtractedExpenseData) => void;
  isLoading?: boolean;
  className?: string;
}

export function ReceiptUpload({ 
  onUpload, 
  onOCRDataExtracted, 
  isLoading = false,
  className = '' 
}: ReceiptUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 5MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Only JPEG, PNG, GIF, and PDF files are allowed' };
    }

    return { isValid: true };
  };

  const processOCR = async (file: File): Promise<OCRResult | null> => {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      return result.data?.ocrResult || null;
    } catch (error) {
      console.error('OCR processing error:', error);
      return null;
    }
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setProcessing(true);

    // Create preview URL
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    // Process OCR for images
    let ocrData: OCRResult | null = null;
    if (file.type.startsWith('image/')) {
      ocrData = await processOCR(file);
      setOcrResult(ocrData);
      
      if (ocrData?.extractedData && onOCRDataExtracted) {
        onOCRDataExtracted(ocrData.extractedData);
      }
    }

    setProcessing(false);
    onUpload(file, ocrData || undefined);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isLoading || processing ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleChange}
          disabled={isLoading || processing}
        />

        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-w-full max-h-64 rounded-lg shadow-md"
              />
              <button
                onClick={clearPreview}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                type="button"
              >
                ×
              </button>
            </div>
            
            {processing && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Processing OCR...</span>
              </div>
            )}

            {ocrResult && (
              <div className="text-left bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">OCR Results</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Confidence:</span>{' '}
                    <span className={`${ocrResult.confidence > 0.7 ? 'text-green-600' : ocrResult.confidence > 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {Math.round(ocrResult.confidence * 100)}%
                    </span>
                  </div>
                  {ocrResult.extractedData && (
                    <div className="space-y-1">
                      {ocrResult.extractedData.amount && (
                        <div>
                          <span className="font-medium">Amount:</span> {ocrResult.extractedData.currency || ''} {ocrResult.extractedData.amount}
                        </div>
                      )}
                      {ocrResult.extractedData.date && (
                        <div>
                          <span className="font-medium">Date:</span> {ocrResult.extractedData.date.toLocaleDateString()}
                        </div>
                      )}
                      {ocrResult.extractedData.vendor && (
                        <div>
                          <span className="font-medium">Vendor:</span> {ocrResult.extractedData.vendor}
                        </div>
                      )}
                      {ocrResult.extractedData.category && (
                        <div>
                          <span className="font-medium">Category:</span> {ocrResult.extractedData.category}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {processing ? 'Processing...' : 'Upload Receipt'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Drag and drop your receipt here, or{' '}
                <button
                  type="button"
                  onClick={onButtonClick}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                  disabled={isLoading || processing}
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Supports JPEG, PNG, GIF, and PDF files up to 5MB
              </p>
            </div>

            {processing && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}