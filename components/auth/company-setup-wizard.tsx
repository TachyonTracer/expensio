'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { CurrencySelector } from '@/components/ui/currency-selector';

const CompanySetupSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  baseCurrency: z.string().length(3, 'Please select a currency'),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  timeZone: z.string().optional(),
});

type CompanySetupData = z.infer<typeof CompanySetupSchema>;

interface Country {
  name: { common: string };
  currencies: Record<string, { name: string; symbol: string }>;
  timezones: string[];
}

interface WizardStep {
  id: number;
  title: string;
  description: string;
}

const wizardSteps: WizardStep[] = [
  {
    id: 1,
    title: 'Company Information',
    description: 'Tell us about your company',
  },
  {
    id: 2,
    title: 'Currency & Location',
    description: 'Set your default currency and location',
  },
  {
    id: 3,
    title: 'Additional Details',
    description: 'Optional information to customize your experience',
  },
  {
    id: 4,
    title: 'Review & Complete',
    description: 'Review your settings and complete setup',
  },
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Real Estate',
  'Media & Entertainment',
  'Non-profit',
  'Other',
];

const employeeCounts = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

export function CompanySetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CompanySetupData>({
    companyName: '',
    country: '',
    baseCurrency: '',
    industry: '',
    employeeCount: '',
    timeZone: '',
  });
  const [errors, setErrors] = useState<Partial<CompanySetupData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [availableTimeZones, setAvailableTimeZones] = useState<string[]>([]);
  const router = useRouter();

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/api/countries');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setCountries(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to load countries:', error);
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  // Update available currencies and timezones when country changes
  useEffect(() => {
    const selectedCountry = countries.find(c => c.name.common === formData.country);
    if (selectedCountry) {
      const currencies = Object.keys(selectedCountry.currencies || {});
      setAvailableCurrencies(currencies);
      setAvailableTimeZones(selectedCountry.timezones || []);
      
      // Auto-select first currency if only one available
      if (currencies.length === 1) {
        setFormData(prev => ({ ...prev, baseCurrency: currencies[0] }));
      }
      
      // Auto-select first timezone if only one available
      if (selectedCountry.timezones?.length === 1) {
        setFormData(prev => ({ ...prev, timeZone: selectedCountry.timezones[0] }));
      }
    }
  }, [formData.country, countries]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CompanySetupData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCurrencyChange = (currency: string) => {
    setFormData(prev => ({ ...prev, baseCurrency: currency }));
    if (errors.baseCurrency) {
      setErrors(prev => ({ ...prev, baseCurrency: undefined }));
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepErrors: Partial<CompanySetupData> = {};
    
    switch (currentStep) {
      case 1:
        if (!formData.companyName.trim()) {
          stepErrors.companyName = 'Company name is required';
        }
        break;
      case 2:
        if (!formData.country) {
          stepErrors.country = 'Country is required';
        }
        if (!formData.baseCurrency) {
          stepErrors.baseCurrency = 'Currency is required';
        }
        break;
      case 3:
        // Optional step, no validation required
        break;
      case 4:
        // Final validation
        try {
          CompanySetupSchema.parse(formData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach((err) => {
              if (err.path[0]) {
                stepErrors[err.path[0] as keyof CompanySetupData] = err.message;
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
      setCurrentStep(prev => Math.min(prev + 1, wizardSteps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/company/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        router.push('/dashboard');
      } else {
        setErrors({ 
          companyName: result.error?.message || 'Setup failed. Please try again.' 
        });
      }
    } catch (error) {
      setErrors({ 
        companyName: 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.companyName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your company name"
                disabled={isLoading}
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.country ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading || loadingCountries}
              >
                <option value="">Select your country</option>
                {countries.map((country) => (
                  <option key={country.name.common} value={country.name.common}>
                    {country.name.common}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country}</p>
              )}
            </div>

            <div>
              <CurrencySelector
                label="Base Currency"
                required
                value={formData.baseCurrency}
                onChange={handleCurrencyChange}
                disabled={isLoading || !formData.country}
                error={errors.baseCurrency}
                placeholder="Select your base currency"
              />
            </div>

            {availableTimeZones.length > 1 && (
              <div>
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <select
                  id="timeZone"
                  name="timeZone"
                  value={formData.timeZone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Select time zone</option>
                  {availableTimeZones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="">Select industry (optional)</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <select
                id="employeeCount"
                name="employeeCount"
                value={formData.employeeCount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="">Select company size (optional)</option>
                {employeeCounts.map((count) => (
                  <option key={count} value={count}>
                    {count} employees
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Settings</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Company Name:</span>
                  <span className="font-medium">{formData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Country:</span>
                  <span className="font-medium">{formData.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Currency:</span>
                  <span className="font-medium">{formData.baseCurrency}</span>
                </div>
                {formData.industry && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Industry:</span>
                    <span className="font-medium">{formData.industry}</span>
                  </div>
                )}
                {formData.employeeCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company Size:</span>
                    <span className="font-medium">{formData.employeeCount} employees</span>
                  </div>
                )}
                {formData.timeZone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Zone:</span>
                    <span className="font-medium">{formData.timeZone}</span>
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Company Setup</h2>
          <p className="mt-2 text-sm text-gray-600">
            Let's get your company set up for expense management
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {wizardSteps.map((step, index) => (
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
                  {index < wizardSteps.length - 1 && (
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
                {wizardSteps[currentStep - 1].title}
              </h3>
              <p className="text-sm text-gray-600">
                {wizardSteps[currentStep - 1].description}
              </p>
            </div>
          </div>

          {/* Step content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
            >
              Previous
            </Button>

            {currentStep < wizardSteps.length ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Completing Setup...
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}