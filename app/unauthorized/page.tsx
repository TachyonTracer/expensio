'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            This page requires specific permissions that your account doesn't have. 
            Please contact your administrator if you believe this is an error.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>

            <Link
              href="/expenses"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Go to Expenses
            </Link>
          </div>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Need different permissions?
          </h3>
          <p className="text-xs text-muted-foreground">
            Contact your system administrator to request access to this feature. 
            Include details about what you're trying to access and why you need it.
          </p>
        </div>
      </div>
    </div>
  );
}