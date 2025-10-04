'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ExpenseList } from '@/components/expense/expense-list';
import { Button } from '@/components/ui/button';
import { Expense } from '@/lib/types';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/expenses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setExpenses(result.data);
        } else {
          setError(result.error?.message || 'Failed to fetch expenses');
        }
      } else {
        setError('Failed to fetch expenses');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleExpenseClick = (expense: Expense) => {
    // Navigate to expense detail page
    window.location.href = `/expenses/${expense.id}`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Expenses</h1>
                <p className="mt-2 text-gray-600">
                  Track and manage your expense submissions
                </p>
              </div>
              <Link href="/expenses/new">
                <Button>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Expense
                </Button>
              </Link>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="px-4 sm:px-0 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchExpenses}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expense List */}
          <div className="px-4 sm:px-0">
            <ExpenseList
              expenses={expenses}
              isLoading={isLoading}
              onRefresh={fetchExpenses}
              onExpenseClick={handleExpenseClick}
              showActions={true}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}