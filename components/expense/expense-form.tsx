'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { ReceiptUpload } from '@/components/expense/receipt-upload';
import { OCRDataValidator } from '@/components/expense/ocr-data-validator';
import { CreateExpenseDto, ExtractedExpenseData, OCRResult } from '@/lib/types';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

const ExpenseFormSchema = z.object({
  originalAmount: z.number().positive('Amount must be positive'),
  originalCurrency: z.string().length(3, 'Please select a currency'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  expenseDate: z.string().min(1, 'Date is required'),
});

type ExpenseFormData = z.infer<typeof ExpenseFormSchema>;

interface ExpenseFormProps {
  onSubmit?: (data: CreateExpenseDto) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<ExpenseFormData>;
}

export function ExpenseForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData 
}: ExpenseFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ExpenseFormData>({
    originalAmount: initialData?.originalAmount || 0,
    originalCurrency: initialData?.originalCurrency || '',
    category: initialData?.category || '',
    description: initialData?.description || '',
    expenseDate: initialData?.expenseDate || new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedExpenseData | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [useOCRData, setUseOCRData] = useState(false);

  const steps = [
    { id: 1, title: 'Receipt Upload', description: 'Upload your receipt (optional)' },
    { id: 2, title: 'OCR Review', description: 'Review extracted data' },
    { id: 3, title: 'Expense Details', description: 'Enter expense information' },
    { id: 4, title: 'Review & Submit', description: 'Review and submit expense' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? parseFloat(value) || 0 : value;
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ExpenseFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCurrencyChange = (currency: string) => {
    setFormData(prev => ({ ...prev, originalCurrency: currency }));
    if (errors.originalCurrency) {
      setErrors(prev => ({ ...prev, originalCurrency: undefined }));
    }
  };

  const handleReceiptUpload = async (file: File) => {
    setReceiptFile(file);
    setIsProcessingOCR(true);
    
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOcrResult(result.data);
          setExtractedData(result.data.extractedData);
          if (result.data.extractedData && result.data.confidence > 0.7) {
            setCurrentStep(2); // Move to OCR review step
          } else {
            setCurrentStep(3); // Skip OCR review if confidence is low
          }
        }
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      setCurrentStep(3); // Skip to manual entry
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleOCRDataAccept = (data: ExtractedExpenseData) => {
    setFormData(prev => ({
      ...prev,
      originalAmount: data.amount || prev.originalAmount,
      originalCurrency: data.currency || prev.originalCurrency,
      category: data.category || prev.category,
      description: data.vendor || prev.description,
      expenseDate: data.date ? data.date.toISOString().split('T')[0] : prev.expenseDate,
    }));
    setUseOCRData(true);
    setCurrentStep(3);
  };

  const handleOCRDataReject = () => {
    setUseOCRData(false);
    setCurrentStep(3);
  };

  const validateCurrentStep = (): boolean => {
    const stepErrors: Partial<ExpenseFormData> = {};
    
    switch (currentStep) {
      case 1:
        // Receipt upload is optional
        return true;
      case 2:
        // OCR review step
        return true;
      case 3:
        // Validate expense details
        if (!formData.originalAmount || formData.originalAmount <= 0) {
          stepErrors.originalAmount = 'Amount must be positive';
        }
        if (!formData.originalCurrency) {
          stepErrors.originalCurrency = 'Currency is required';
        }
        if (!formData.category) {
          stepErrors.category = 'Category is required';
        }
        if (!formData.description.trim()) {
          stepErrors.description = 'Description is required';
        }
        if (!formData.expenseDate) {
          stepErrors.expenseDate = 'Date is required';
        }
        break;
      case 4:
        // Final validation
        try {
          ExpenseFormSchema.parse(formData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach((err) => {
              if (err.path[0]) {
                stepErrors[err.path[0] as keyof ExpenseFormData] = err.message;
              }
            });
          }
        }
        break;
    }
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep === 1 && !receiptFile) {
        setCurrentStep(3); // Skip OCR steps if no receipt
      } else {
        setCurrentStep(prev => Math.min(prev + 1, steps.length));
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep === 3 && !receiptFile) {
      setCurrentStep(1); // Skip OCR steps if no receipt
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = () => {
    if (!validateCurrentStep()) return;

    const expenseData: CreateExpenseDto = {
      originalAmount: formData.originalAmount,
      originalCurrency: formData.originalCurrency,
      category: formData.category,
      description: formData.description,
      expenseDate: new Date(formData.expenseDate),
    };

    onSubmit?.(expenseData);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Receipt</h3>
              <p className="text-gray-600 mb-6">
                Upload a receipt to automatically extract expense details, or skip to enter manually.
              </p>
            </div>
            
            <ReceiptUpload
              onFileSelect={handleReceiptUpload}
              isProcessing={isProcessingOCR}
              maxSize={5 * 1024 * 1024} // 5MB
              acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'application/pdf']}
            />
            
            {isProcessingOCR && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Processing receipt...</p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Review Extracted Data</h3>
              <p className="text-gray-600 mb-6">
                We've extracted the following information from your receipt. Please review and correct if needed.
              </p>
            </div>
            
            {extractedData && (
              <OCRDataValidator
                extractedData={extractedData}
                ocrResult={ocrResult}
                onAccept={handleOCRDataAccept}
                onReject={handleOCRDataReject}
              />
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Expense Details</h3>
              <p className="text-gray-600">
                {useOCRData ? 'Review and adjust the extracted information' : 'Enter your expense information'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="originalAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  id="originalAmount"
                  name="originalAmount"
                  value={formData.originalAmount || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.originalAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.originalAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.originalAmount}</p>
                )}
              </div>

              <div>
                <CurrencySelector
                  label="Currency"
                  required
                  value={formData.originalCurrency}
                  onChange={handleCurrencyChange}
                  disabled={isLoading}
                  error={errors.originalCurrency}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              <div>
                <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  id="expenseDate"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.expenseDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.expenseDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expenseDate}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter expense description"
                disabled={isLoading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Review & Submit</h3>
              <p className="text-gray-600">Please review your expense details before submitting</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    {formData.originalAmount.toFixed(2)} {formData.originalCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{formData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(formData.expenseDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium">{formData.description}</span>
                </div>
                {receiptFile && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipt:</span>
                    <span className="font-medium">{receiptFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Please fix the following errors:
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {Object.entries(errors).map(([field, error]) => (
                          <li key={field}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      currentStep >= step.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 ml-2 ${
                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900">
                {steps[currentStep - 1].title}
              </h3>
              <p className="text-sm text-gray-600">
                {steps[currentStep - 1].description}
              </p>
            </div>
          </div>

          {/* Step content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isLoading || isProcessingOCR}
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading || isProcessingOCR}
                >
                  Cancel
                </Button>
              )}

              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading || isProcessingOCR}
                >
                  {currentStep === 1 && !receiptFile ? 'Skip Receipt' : 'Next'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || isProcessingOCR}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Expense'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}