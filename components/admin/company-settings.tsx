'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { Company } from '@/lib/types';

const CompanySettingsSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  baseCurrency: z.string().length(3, 'Please select a currency'),
});

type CompanySettingsData = z.infer<typeof CompanySettingsSchema>;

interface Country {
  name: { common: string };
  currencies: Record<string, { name: string; symbol: string }>;
}

interface CompanySettingsProps {
  onUpdate?: (company: Company) => void;
}

export function CompanySettings({ onUpdate }: CompanySettingsProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanySettingsData>({
    name: '',
    country: '',
    baseCurrency: '',
  });
  const [errors, setErrors] = useState<Partial<CompanySettingsData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const fetchCompanySettings = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/company/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const companyData = result.data;
          setCompany(companyData);
          setFormData({
            name: companyData.name,
            country: companyData.country,
            baseCurrency: companyData.baseCurrency,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCountries = async () => {
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

  useEffect(() => {
    fetchCompanySettings();
    fetchCountries();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CompanySettingsData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear success message when user makes changes
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleCurrencyChange = (currency: string) => {
    setFormData(prev => ({ ...prev, baseCurrency: currency }));
    if (errors.baseCurrency) {
      setErrors(prev => ({ ...prev, baseCurrency: undefined }));
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const validateForm = (): boolean => {
    try {
      CompanySettingsSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<CompanySettingsData> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof CompanySettingsData] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/company/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const updatedCompany = result.data;
        setCompany(updatedCompany);
        setSuccessMessage('Company settings updated successfully');
        onUpdate?.(updatedCompany);
      } else {
        setErrors({ 
          name: result.error?.message || 'Update failed. Please try again.' 
        });
      }
    } catch (error) {
      setErrors({ 
        name: 'Network error. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Company Settings</h3>
          <p className="mt-1 text-sm text-gray-600">
            Manage your company information and preferences.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Info Display */}
          {company && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company ID
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {company.id}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Created
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {new Date(company.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* Editable Fields */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Company Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country *
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.country ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting || loadingCountries}
            >
              <option value="">Select your country</option>
              {countries && countries.map((country) => (
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
              disabled={isSubmitting}
              error={errors.baseCurrency}
              placeholder="Select your base currency"
            />
          </div>

          {/* Currency Impact Warning */}
          {company && formData.baseCurrency !== company.baseCurrency && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Currency Change Warning
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Changing the base currency will affect how future expenses are converted and displayed. 
                      Existing expenses will retain their original conversion rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Settings'
              )}
            </Button>
          </div>
        </form>

        {/* Additional Settings Sections */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Additional Settings</h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Email Notifications</h5>
                <p className="text-sm text-gray-600">Configure email notifications for expense approvals</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement email settings modal
                  alert('Email settings coming soon!');
                }}
              >
                Configure
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Expense Categories</h5>
                <p className="text-sm text-gray-600">Manage custom expense categories</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement category management modal
                  alert('Category management coming soon!');
                }}
              >
                Manage
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Data Export</h5>
                <p className="text-sm text-gray-600">Export company expense data</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement data export functionality
                  alert('Data export coming soon!');
                }}
              >
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}