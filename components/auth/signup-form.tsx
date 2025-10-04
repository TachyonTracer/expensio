'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Circle, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  companyName: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required'),
  baseCurrency: z
    .string()
    .length(3, 'Base currency is required')
    .transform((value) => value.toUpperCase()),
  acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof SignupSchema>;

interface CountryCurrency {
  code: string;
  name: string;
  symbol: string;
}

interface Country {
  name: { common: string };
  currencies: CountryCurrency[];
}

interface SignupFormProps {
  className?: string;
  cardClassName?: string;
  appearance?: 'light' | 'dark';
}

function evaluatePasswordStrength(password: string) {
  const rules = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Includes a lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Includes an uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Includes a number',
      met: /\d/.test(password),
    },
    {
      label: 'Includes a symbol',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const metCount = rules.filter((rule) => rule.met).length;
  const percentage = password ? Math.round((metCount / rules.length) * 100) : 0;

  let label = 'Create a strong password';
  let indicator = 'bg-red-500';

  if (percentage >= 20 && percentage < 60) {
    label = 'Password strength: Fair';
    indicator = 'bg-amber-500';
  } else if (percentage >= 60 && percentage < 80) {
    label = 'Password strength: Good';
    indicator = 'bg-sky-500';
  } else if (percentage >= 80) {
    label = 'Password strength: Great';
    indicator = 'bg-emerald-500';
  } else if (password && percentage < 20) {
    label = 'Password strength: Weak';
  }

  return {
    rules,
    percentage,
    label,
    indicator,
  };
}

export function SignupForm({ className, cardClassName, appearance = 'light' }: SignupFormProps) {
  const isDark = appearance === 'dark';

  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    country: '',
    baseCurrency: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<CountryCurrency[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/api/countries');
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const normalizedCountries = result.data.map((country: any) => {
            const currencyArray: CountryCurrency[] = Array.isArray(country.currencies)
              ? country.currencies
              : country.currencies
                ? Object.entries(country.currencies).map(([code, info]: [string, any]) => ({
                    code,
                    name: info.name,
                    symbol: info.symbol ?? code,
                  }))
                : [];

            return {
              ...country,
              currencies: currencyArray,
            } as Country;
          });

          const sortedCountries = normalizedCountries.sort((a: Country, b: Country) =>
            a.name.common.localeCompare(b.name.common)
          );

          setCountries(sortedCountries);
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (error) {
        console.error('Failed to load countries:', error);
        setCountriesError('We were unable to load the country list. You can type it manually.');
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(formData.password), [formData.password]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    const nextValue = type === 'checkbox' ? checked : value;
    const normalizedValue =
      name === 'baseCurrency' && typeof nextValue === 'string'
        ? nextValue.toUpperCase()
        : nextValue;

    setFormData(prev => ({ 
      ...prev, 
      [name]: normalizedValue,
    } as SignupFormData));
    
    // Clear error when user starts typing
    if (errors[name as keyof SignupFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    if (formMessage) {
      setFormMessage(null);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    const countryEntry = countries.find((country) => country.name.common === selectedCountry);
    const currencies = countryEntry?.currencies ?? [];
    const detectedCurrency = currencies[0]?.code ?? '';

    setAvailableCurrencies(currencies);

    setFormData((prev) => ({
      ...prev,
      country: selectedCountry,
      baseCurrency: detectedCurrency,
    }));

    if (errors.country || errors.baseCurrency) {
      setErrors((prev) => ({
        ...prev,
        country: undefined,
        baseCurrency: undefined,
      }));
    }

    if (formMessage) {
      setFormMessage(null);
    }
  };

  const validateForm = (): boolean => {
    try {
      SignupSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof SignupFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof SignupFormData] = err.message;
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

    setIsLoading(true);
    setFormMessage(null);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          company: {
            name: formData.companyName,
            country: formData.country,
            baseCurrency: formData.baseCurrency,
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store tokens in localStorage
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        
        setFormMessage({ type: 'success', text: 'Account created! Redirecting you to onboarding...' });
        router.push('/onboarding/company-setup');
      } else {
        const message = result.error?.message || 'Signup failed. Please try again.';
        setFormMessage({ type: 'error', text: message });

        const fieldErrors: Partial<Record<keyof SignupFormData, string>> = {};

        if (Array.isArray(result.error?.details)) {
          result.error.details.forEach((detail: { path?: Array<string | number>; message: string }) => {
            const [first, second] = detail.path || [];

            if (typeof first === 'string') {
              if (first === 'company' && typeof second === 'string') {
                if (second === 'name') fieldErrors.companyName = detail.message;
                if (second === 'country') fieldErrors.country = detail.message;
                if (second === 'baseCurrency') fieldErrors.baseCurrency = detail.message;
              } else if (first in formData) {
                fieldErrors[first as keyof SignupFormData] = detail.message;
              }
            }
          });
        }

        if (Object.keys(fieldErrors).length === 0) {
          fieldErrors.email = message;
        }

        setErrors(prev => ({ ...prev, ...fieldErrors }));
      }
    } catch (error) {
      setFormMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    // TODO: Implement Google OAuth integration
    setFormMessage({ type: 'error', text: 'Google signup is coming soon. Please use email signup for now.' });
  };

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      <div
        className={cn(
          'rounded-2xl p-8',
          isDark
            ? 'border border-white/10 bg-slate-900/70 shadow-[0_25px_70px_-35px_rgba(8,47,73,0.65)] backdrop-blur'
            : 'bg-white shadow-xl ring-1 ring-slate-100',
          cardClassName
        )}
      >
        <div className="text-center mb-8 space-y-2">
          <h1 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>Create Account</h1>
          <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>
            Start managing expenses with Expensio
          </p>
        </div>

        {formMessage && (
          <div
            className={cn(
              'mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
              formMessage.type === 'error'
                ? isDark
                  ? 'border-red-400/40 bg-red-500/10 text-red-200'
                  : 'border-red-200 bg-red-50 text-red-700'
                : isDark
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            )}
            role={formMessage.type === 'error' ? 'alert' : 'status'}
          >
            {formMessage.type === 'error' ? (
              <AlertCircle className={cn('h-4 w-4 flex-none mt-0.5', isDark ? 'text-red-200' : '')} />
            ) : (
              <ShieldCheck className={cn('h-4 w-4 flex-none mt-0.5', isDark ? 'text-emerald-200' : '')} />
            )}
            <span className={cn(isDark ? 'text-slate-100' : '')}>{formMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-200' : 'text-gray-700')}
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2',
                isDark
                  ? 'border border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:ring-emerald-300 focus:border-emerald-300'
                  : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-slate-900 focus:border-slate-900',
                errors.email && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
              )}
              placeholder="Enter your email"
              disabled={isLoading}
            />
            {errors.email && (
              <p className={cn('mt-1 text-sm', isDark ? 'text-red-300' : 'text-red-600')}>{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="companyName"
              className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-200' : 'text-gray-700')}
            >
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2',
                isDark
                  ? 'border border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:ring-emerald-300 focus:border-emerald-300'
                  : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-slate-900 focus:border-slate-900',
                errors.companyName && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
              )}
              placeholder="Enter your company name"
              disabled={isLoading}
            />
            {errors.companyName && (
              <p className={cn('mt-1 text-sm', isDark ? 'text-red-300' : 'text-red-600')}>{errors.companyName}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="country"
              className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-200' : 'text-gray-700')}
            >
              Country
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleCountryChange}
              className={cn(
                'w-full rounded-lg px-4 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2',
                isDark
                  ? 'border border-white/15 bg-white/10 text-white focus:ring-emerald-300 focus:border-emerald-300'
                  : 'border border-gray-300 bg-white text-gray-900 focus:ring-slate-900 focus:border-slate-900',
                errors.country && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
              )}
              disabled={isLoading || loadingCountries}
            >
              <option value="">
                {loadingCountries ? 'Loading countries…' : 'Select your country'}
              </option>
              {countries && countries.map((country) => (
                <option key={country.name.common} value={country.name.common}>
                  {country.name.common}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className={cn('mt-1 text-sm', isDark ? 'text-red-300' : 'text-red-600')}>{errors.country}</p>
            )}
            {countriesError && !errors.country && (
              <p className={cn('mt-1 text-sm', isDark ? 'text-amber-300' : 'text-amber-600')}>{countriesError}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="baseCurrency"
              className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-200' : 'text-gray-700')}
            >
              Base Currency
            </label>
            {availableCurrencies.length > 0 ? (
              <select
                id="baseCurrency"
                name="baseCurrency"
                value={formData.baseCurrency}
                onChange={handleInputChange}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2',
                  isDark
                    ? 'border border-white/15 bg-white/10 text-white focus:ring-emerald-300 focus:border-emerald-300'
                    : 'border border-gray-300 bg-white text-gray-900 focus:ring-slate-900 focus:border-slate-900',
                  errors.baseCurrency && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
                )}
                disabled={isLoading}
              >
                {availableCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="baseCurrency"
                name="baseCurrency"
                value={formData.baseCurrency}
                onChange={handleInputChange}
                placeholder={formData.country ? 'Currency unavailable — type code' : 'Select a country first'}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2',
                  isDark
                    ? 'border border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:ring-emerald-300 focus:border-emerald-300'
                    : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-slate-900 focus:border-slate-900',
                  errors.baseCurrency && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
                )}
                disabled={isLoading}
              />
            )}
            {errors.baseCurrency && (
              <p className={cn('mt-1 text-sm', isDark ? 'text-red-300' : 'text-red-600')}>{errors.baseCurrency}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-200' : 'text-gray-700')}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 pr-12 text-sm shadow-sm transition focus:outline-none focus:ring-2',
                  isDark
                    ? 'border border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:ring-emerald-300 focus:border-emerald-300'
                    : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-slate-900 focus:border-slate-900',
                  errors.password && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
                )}
                placeholder="Create a password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'absolute inset-y-0 right-0 pr-3 flex items-center transition',
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
                )}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className={cn('mt-1 text-sm', isDark ? 'text-red-300' : 'text-red-600')}>{errors.password}</p>
            )}
            <div className="mt-3">
              <div
                className={cn(
                  'flex items-center justify-between text-xs font-medium',
                  isDark ? 'text-slate-300' : 'text-gray-500'
                )}
              >
                <span>{passwordStrength.label}</span>
                <span className={isDark ? 'text-slate-200' : ''}>{passwordStrength.percentage}%</span>
              </div>
              <div className={cn('mt-1 h-2 w-full rounded-full', isDark ? 'bg-white/10' : 'bg-gray-100')}>
                <div
                  className={cn('h-full rounded-full transition-all duration-300', passwordStrength.indicator)}
                  style={{ width: `${passwordStrength.percentage}%` }}
                />
              </div>
              <ul className={cn('mt-3 space-y-1 text-xs', isDark ? 'text-slate-300' : 'text-gray-600')}>
                {passwordStrength.rules.map((rule) => (
                  <li key={rule.label} className="flex items-center gap-2">
                    {rule.met ? (
                      <CheckCircle2 className={cn('h-3.5 w-3.5', isDark ? 'text-emerald-300' : 'text-emerald-500')} />
                    ) : (
                      <Circle className={cn('h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-gray-400')} />
                    )}
                    <span className={rule.met ? (isDark ? 'text-slate-200' : 'text-gray-700') : undefined}>
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-200' : 'text-gray-700')}
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={cn(
                  'w-full rounded-lg px-4 py-2.5 pr-12 text-sm shadow-sm transition focus:outline-none focus:ring-2',
                  isDark
                    ? 'border border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:ring-emerald-300 focus:border-emerald-300'
                    : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-slate-900 focus:border-slate-900',
                  errors.confirmPassword && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
                )}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={cn(
                  'absolute inset-y-0 right-0 pr-3 flex items-center transition',
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
                )}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className={cn('mt-1 text-sm', isDark ? 'text-red-300' : 'text-red-600')}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={handleInputChange}
              className={cn(
                'h-4 w-4 rounded border focus:ring-2 focus:ring-offset-1',
                isDark
                  ? 'border-white/20 bg-white/5 text-emerald-400 focus:ring-emerald-300 focus:ring-offset-slate-900'
                  : 'border-gray-300 text-emerald-600 focus:ring-emerald-500',
                errors.acceptTerms && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
              )}
              disabled={isLoading}
            />
            <label
              htmlFor="acceptTerms"
              className={cn('ml-3 block text-sm', isDark ? 'text-slate-200' : 'text-gray-700')}
            >
              I agree to the{' '}
              <Link href="/terms" className={cn('font-medium', isDark ? 'text-emerald-300 hover:text-emerald-200' : 'text-blue-600 hover:text-blue-500')}>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className={cn('font-medium', isDark ? 'text-emerald-300 hover:text-emerald-200' : 'text-blue-600 hover:text-blue-500')}>
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className={cn('mt-1 text-sm', isDark ? 'text-red-300' : 'text-red-600')}>{errors.acceptTerms}</p>
          )}

          <div
            className={cn(
              'rounded-lg px-3 py-2 text-xs',
              isDark
                ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                : 'border border-emerald-100 bg-emerald-50 text-emerald-700'
            )}
          >
            <div className="flex items-start gap-2">
              <ShieldCheck className={cn('mt-0.5 h-4 w-4 flex-none', isDark ? 'text-emerald-200' : 'text-emerald-600')} />
              <span className={cn(isDark ? 'text-emerald-100' : '')}>
                Expensio keeps your expense data protected with SOC 2-ready security controls.
              </span>
            </div>
          </div>

          <Button
            type="submit"
            className={cn('w-full', isDark ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300' : '')}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating account...
              </div>
            ) : (
              'Create Account'
            )}
          </Button>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={cn('w-full border-t', isDark ? 'border-white/10' : 'border-gray-300')} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className={cn(
                    'px-2 text-sm',
                    isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-white text-gray-500'
                  )}
                >
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant={isDark ? 'ghost' : 'outline'}
                className={cn(
                  'w-full border rounded-lg',
                  isDark
                    ? 'border-white/15 bg-white/5 text-slate-100 hover:bg-white/10'
                    : 'border-gray-300 bg-white text-gray-700'
                )}
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className={cn(
                'font-medium',
                isDark ? 'text-emerald-300 hover:text-emerald-200' : 'text-blue-600 hover:text-blue-500'
              )}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}