'use client';

import React, { useState } from 'react';
import { Receipt } from '@/lib/types';

interface ReceiptViewerProps {
  receipt: Receipt;
  onDelete?: (receiptId: string) => void;
  onReprocess?: (receiptId: string) => void;
  showActions?: boolean;
  className?: string;
}

export function ReceiptViewer({
  receipt,
  onDelete,
  onReprocess,
  showActions = true,
  className = ''
}: ReceiptViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this receipt?');
    if (confirmed) {
      setIsLoading(true);
      try {
        await onDelete(receipt.id);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleReprocess = async () => {
    if (!onReprocess) return;
    
    setIsLoading(true);
    try {
      await onReprocess(receipt.id);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    } else if (mimeType === 'application/pdf') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getOCRConfidence = () => {
    if (!receipt.ocrData || typeof receipt.ocrData !== 'object') return null;
    return 'confidence' in receipt.ocrData ? receipt.ocrData.confidence as number : null;
  };

  const getOCRConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-600 bg-green-50';
    if (confidence > 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 text-gray-400">
            {getFileIcon(receipt.mimeType)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {receipt.fileName}
            </h4>
            <div className="mt-1 text-xs text-gray-500 space-y-1">
              <div>Type: {receipt.mimeType}</div>
              <div>Uploaded: {new Date(receipt.createdAt).toLocaleDateString()}</div>
              {receipt.ocrData && (
                <div className="flex items-center space-x-2">
                  <span>OCR:</span>
                  {getOCRConfidence() !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOCRConfidenceColor(getOCRConfidence()!)}`}
                    >
                      {Math.round(getOCRConfidence()! * 100)}% confidence
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center space-x-2">
            <a
              href={`/api/receipts/${receipt.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View
            </a>
            {receipt.mimeType.startsWith('image/') && onReprocess && (
              <button
                onClick={handleReprocess}
                disabled={isLoading}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Reprocess OCR'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* OCR Data Preview */}
      {receipt.ocrData && typeof receipt.ocrData === 'object' && 'extractedData' in receipt.ocrData && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="text-xs font-medium text-gray-700 mb-2">Extracted Data</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {receipt.ocrData.extractedData && typeof receipt.ocrData.extractedData === 'object' && (
              <>
                {'amount' in receipt.ocrData.extractedData && receipt.ocrData.extractedData.amount && (
                  <div>
                    <span className="text-gray-500">Amount:</span>{' '}
                    <span className="text-gray-900">
                      {receipt.ocrData.extractedData.currency} {receipt.ocrData.extractedData.amount}
                    </span>
                  </div>
                )}
                {'date' in receipt.ocrData.extractedData && receipt.ocrData.extractedData.date && (
                  <div>
                    <span className="text-gray-500">Date:</span>{' '}
                    <span className="text-gray-900">
                      {new Date(receipt.ocrData.extractedData.date as string).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {'vendor' in receipt.ocrData.extractedData && receipt.ocrData.extractedData.vendor && (
                  <div>
                    <span className="text-gray-500">Vendor:</span>{' '}
                    <span className="text-gray-900">{receipt.ocrData.extractedData.vendor as string}</span>
                  </div>
                )}
                {'category' in receipt.ocrData.extractedData && receipt.ocrData.extractedData.category && (
                  <div>
                    <span className="text-gray-500">Category:</span>{' '}
                    <span className="text-gray-900">{receipt.ocrData.extractedData.category as string}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Preview for images */}
      {receipt.mimeType.startsWith('image/') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowFullImage(!showFullImage)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showFullImage ? 'Hide Preview' : 'Show Preview'}
          </button>
          {showFullImage && (
            <div className="mt-2">
              <img
                src={`/api/receipts/${receipt.id}/file`}
                alt={receipt.fileName}
                className="max-w-full h-auto rounded-lg shadow-md"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}