'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth/protected-route';
import { ExpenseDetail } from '@/components/expense/expense-detail';
import { Expense, Approval, User } from '@/lib/types';

interface ExpenseDetailPageProps {
  params: {
    id: string;
  };
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const fetchExpenseDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch expense details
      const expenseResponse = await fetch(`/api/expenses/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (expenseResponse.ok) {
        const expenseResult = await expenseResponse.json();
        if (expenseResult.success) {
          setExpense(expenseResult.data);

          // Fetch approvals for this expense
          const approvalsResponse = await fetch(`/api/expenses/${params.id}/approvals`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (approvalsResponse.ok) {
            const approvalsResult = await approvalsResponse.json();
            if (approvalsResult.success) {
              setApprovals(approvalsResult.data.approvals || []);
              setApprovers(approvalsResult.data.approvers || []);
            }
          }
        } else {
          setError(expenseResult.error?.message || 'Expense not found');
        }
      } else if (expenseResponse.status === 404) {
        setError('Expense not found');
      } else {
        setError('Failed to fetch expense details');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseDetails();
  }, [params.id]);

  const handleEdit = () => {
    router.push(`/expenses/${params.id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        router.push('/expenses');
      } else {
        const result = await response.json();
        setError(result.error?.message || 'Failed to delete expense');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this expense from approval?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${params.id}/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        // Refresh expense details
        fetchExpenseDetails();
      } else {
        const result = await response.json();
        setError(result.error?.message || 'Failed to withdraw expense');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading expense details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 sm:px-0">
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
                    <div className="mt-4 flex space-x-3">
                      <button
                        type="button"
                        onClick={fetchExpenseDetails}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Try Again
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push('/expenses')}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Back to Expenses
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!expense) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Expense not found</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="px-4 sm:px-0 mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <div>
                    <a href="/expenses" className="text-gray-400 hover:text-gray-500">
                      <svg className="flex-shrink-0 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      <span className="sr-only">Expenses</span>
                    </a>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <a href="/expenses" className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                      Expenses
                    </a>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-4 text-sm font-medium text-gray-500">
                      {expense.description.length > 30 
                        ? `${expense.description.substring(0, 30)}...` 
                        : expense.description
                      }
                    </span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          {/* Expense Detail */}
          <div className="px-4 sm:px-0">
            <ExpenseDetail
              expense={expense}
              approvals={approvals}
              approvers={approvers}
              currentUser={currentUser}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onWithdraw={handleWithdraw}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}