'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EmployeeDashboardData, Expense } from '@/lib/types';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Button } from '@/components/ui/button';

interface EmployeeDashboardProps {
  className?: string;
}

export function EmployeeDashboard({ className }: EmployeeDashboardProps) {
  const [dashboardData, setDashboardData] = useState<EmployeeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard/employee');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch dashboard data');
      }
      
      setDashboardData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'REIMBURSED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string): string => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'SUBMITTED':
        return 'Submitted';
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'REIMBURSED':
        return 'Reimbursed';
      default:
        return status;
    }
  };

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          
          {/* Recent Expenses Skeleton */}
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={fetchDashboardData} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <div className="mt-4 sm:mt-0">
          <Link href="/expenses/new">
            <Button className="w-full sm:w-auto">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit New Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Expenses */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.totalExpenses}</p>
            </div>
          </div>
        </div>

        {/* Pending Expenses */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.pendingExpenses}</p>
            </div>
          </div>
        </div>

        {/* Approved Expenses */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.approvedExpenses}</p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                <CurrencyDisplay
                  originalAmount={dashboardData.totalAmount}
                  originalCurrency="USD"
                  showBothAmounts={false}
                  size="sm"
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/expenses/new">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">New Expense</h3>
                  <p className="text-sm text-gray-600">Submit a new expense</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/expenses">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View All Expenses</h3>
                  <p className="text-sm text-gray-600">See your expense history</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/profile">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Profile Settings</h3>
                  <p className="text-sm text-gray-600">Update your profile</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
            <Link href="/expenses">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {dashboardData.recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by submitting your first expense.</p>
              <div className="mt-6">
                <Link href="/expenses/new">
                  <Button>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Submit Expense
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {expense.description}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(expense.status)}`}>
                        {getStatusDisplayName(expense.status)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span className="truncate">{expense.category}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(expense.expenseDate)}</span>
                      {expense.receiptId && (
                        <>
                          <span className="mx-2">•</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 000-2.828z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <CurrencyDisplay
                      originalAmount={expense.originalAmount}
                      originalCurrency={expense.originalCurrency}
                      convertedAmount={expense.convertedAmount}
                      convertedCurrency={expense.baseCurrency}
                      showBothAmounts={expense.originalCurrency !== expense.baseCurrency}
                      size="sm"
                      layout="horizontal"
                      emphasize="converted"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Status Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Pending Approval</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{dashboardData.pendingExpenses}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Approved</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{dashboardData.approvedExpenses}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Rejected</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{dashboardData.rejectedExpenses}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Expense</span>
              <span className="text-sm font-medium text-gray-900">
                {dashboardData.totalExpenses > 0 ? (
                  <CurrencyDisplay
                    originalAmount={dashboardData.totalAmount / dashboardData.approvedExpenses || 0}
                    originalCurrency="USD"
                    showBothAmounts={false}
                    size="sm"
                  />
                ) : (
                  '$0.00'
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Approval Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {dashboardData.totalExpenses > 0 
                  ? `${Math.round((dashboardData.approvedExpenses / dashboardData.totalExpenses) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="text-sm font-medium text-gray-900">
                {dashboardData.recentExpenses.filter(expense => {
                  const expenseDate = new Date(expense.createdAt);
                  const now = new Date();
                  return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
                }).length} expenses
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}