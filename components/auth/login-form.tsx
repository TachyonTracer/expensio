'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
  cardClassName?: string;
  appearance?: 'light' | 'dark';
}

export function LoginForm({ onSuccess, className, cardClassName, appearance = 'light' }: LoginFormProps) {
  const isDark = appearance === 'dark';
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    if (formMessage) {
      setFormMessage(null);
    }
  };

  const validateForm = (): boolean => {
    try {
      LoginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<LoginFormData> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof LoginFormData] = err.message;
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store tokens in localStorage
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        
        setFormMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        onSuccess?.();
        
        // Small delay to ensure tokens are stored and UI updates
        setTimeout(() => {
          try {
            // Check for redirect parameter in URL
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirect');
            
            // Redirect to the intended page or default to expenses
            if (redirectTo && redirectTo.startsWith('/')) {
              console.log('Redirecting to:', redirectTo);
              window.location.href = redirectTo;
            } else {
              // Redirect based on user role
              const userRole = result.data.user.role;
              const targetUrl = userRole === 'ADMIN' ? '/admin' : '/expenses';
              console.log('Redirecting to:', targetUrl);
              window.location.href = targetUrl;
            }
          } catch (error) {
            console.error('Redirect error:', error);
            // Fallback redirect
            window.location.href = '/expenses';
          }
        }, 500);
      } else {
        const message = result.error?.message || 'Login failed. Please check your credentials.';
        setFormMessage({ type: 'error', text: message });
        setErrors({ email: message });
      }
    } catch {
      setFormMessage({ type: 'error', text: 'Network error. Please try again.' });
      setErrors({ email: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // TODO: Implement Google OAuth integration
    setFormMessage({ type: 'error', text: 'Google login is coming soon. Please use email login for now.' });
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
          <h1 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>Welcome Back</h1>
          <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>
            Sign in to your Expensio account
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
                  ? 'border-blue-400/30 bg-blue-500/10 text-blue-200'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            )}
            role={formMessage.type === 'error' ? 'alert' : 'status'}
          >
            {formMessage.type === 'error' ? (
              <AlertCircle className={cn('h-4 w-4 flex-none mt-0.5', isDark ? 'text-red-200' : '')} />
            ) : (
              <ShieldCheck className={cn('h-4 w-4 flex-none mt-0.5', isDark ? 'text-blue-200' : '')} />
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
                  ? 'border border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:ring-blue-300 focus:border-blue-300'
                  : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500',
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
                    ? 'border border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:ring-blue-300 focus:border-blue-300'
                    : 'border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500',
                  errors.password && (isDark ? 'border-red-400 focus:ring-red-300' : 'border-red-500 focus:ring-red-300')
                )}
                placeholder="Enter your password"
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
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className={cn(
                  'h-4 w-4 rounded border focus:ring-2 focus:ring-offset-1',
                  isDark
                    ? 'border-white/20 bg-white/5 text-blue-400 focus:ring-blue-300 focus:ring-offset-slate-900'
                    : 'border-gray-300 text-blue-600 focus:ring-blue-500'
                )}
              />
              <label
                htmlFor="remember-me"
                className={cn('ml-2 block text-sm', isDark ? 'text-slate-200' : 'text-gray-700')}
              >
                Remember me
              </label>
            </div>

            <Link
              href="/auth/forgot-password"
              className={cn(
                'text-sm font-medium',
                isDark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-500'
              )}
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className={cn('w-full', isDark ? 'bg-blue-400 text-slate-950 hover:bg-blue-300' : '')}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing in...
              </div>
            ) : (
              'Sign In'
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
                onClick={handleGoogleLogin}
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

          <div
            className={cn(
              'mt-6 rounded-lg px-3 py-2 text-xs',
              isDark
                ? 'border border-blue-400/30 bg-blue-500/10 text-blue-200'
                : 'border border-blue-100 bg-blue-50 text-blue-700'
            )}
          >
            <div className="flex items-start gap-2">
              <ShieldCheck className={cn('mt-0.5 h-4 w-4 flex-none', isDark ? 'text-blue-200' : 'text-blue-600')} />
              <span className={cn(isDark ? 'text-blue-100' : '')}>
                Your login is secured with enterprise-grade encryption and monitoring.
              </span>
            </div>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className={cn(
                'font-medium',
                isDark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-500'
              )}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}