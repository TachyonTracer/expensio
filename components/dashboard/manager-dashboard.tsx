'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ManagerDashboardData, Expense, User } from '@/lib/types';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Button } from '@/components/ui/button';
import { ApprovalQueue } from '@/components/approval/approval-queue';
import { WorkflowManagement } from '@/components/approval/workflow-management';

interface ManagerDashboardProps {
  className?: string;
}

type PendingExpense = ManagerDashboardData['pendingExpensesList'][0];

export function ManagerDashboard({ className }: ManagerDashboardProps) {
  const [dashboardData, setDashboardData] = useState<ManagerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard/manager');
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleApprovalAction = (expenseId: string, action: 'approve' | 'reject', comments?: string) => {
    // Refresh dashboard data after approval action
    fetchDashboardData();
  };

  const getPriorityLevel = (expense: PendingExpense): 'high' | 'medium' | 'low' => {
    const amount = expense.originalAmount;
    const daysSinceSubmission = Math.floor(
      (Date.now() - new Date(expense.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (amount > 1000 || daysSinceSubmission > 7) {
      return 'high';
    } else if (amount > 500 || daysSinceSubmission > 3) {
      return 'medium';
    } else {
      return 'low';
    }
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };

    const labels = {
      high: 'High Priority',
      medium: 'Medium Priority',
      low: 'Low Priority',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          
          {/* Approval Queue Skeleton */}
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
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

  // Sort pending expenses by priority
  const sortedPendingExpenses = [...dashboardData.pendingExpensesList].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = getPriorityLevel(a as PendingExpense);
    const bPriority = getPriorityLevel(b as PendingExpense);
    return priorityOrder[bPriority] - priorityOrder[aPriority];
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your team's expenses and approvals
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link href="/admin/approval-rules">
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Approvals */}
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
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.pendingApprovals}</p>
            </div>
          </div>
        </div>

        {/* Team Expenses */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Team Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.teamExpenses}</p>
            </div>
          </div>
        </div>

        {/* Monthly Team Spend */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                <CurrencyDisplay
                  originalAmount={dashboardData.monthlyTeamSpend}
                  originalCurrency="USD"
                  showBothAmounts={false}
                  size="sm"
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Queue */}
      <ApprovalQueue 
        onApprovalAction={handleApprovalAction}
        isLoading={refreshing}
      />

      {/* Team Overview */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Team Overview</h2>
            <Link href="/admin/users">
              <Button variant="outline" size="sm">
                Manage Team
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {dashboardData.teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">You don't have any team members assigned yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.teamMembers.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.email}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {member.role.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Priority Expenses Summary */}
      {sortedPendingExpenses.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Priority Expenses Summary</h2>
            <p className="mt-1 text-sm text-gray-600">
              Expenses requiring immediate attention based on amount and age
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {sortedPendingExpenses.slice(0, 5).map((expense) => {
                const priority = getPriorityLevel(expense as PendingExpense);
                return (
                  <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {expense.description}
                        </h4>
                        {getPriorityBadge(priority)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <span>{expense.user?.email || 'Unknown'}</span>
                        <span>•</span>
                        <span>{expense.category}</span>
                        <span>•</span>
                        <span>{formatDate(expense.expenseDate)}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-4">
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
                      <Link href={`/expenses/${expense.id}`}>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {sortedPendingExpenses.length > 5 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  And {sortedPendingExpenses.length - 5} more expenses pending approval
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow Management */}
      <WorkflowManagement />

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/approvals">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Review Approvals</h3>
                  <p className="text-sm text-gray-600">Process pending expenses</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/expenses">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View All Expenses</h3>
                  <p className="text-sm text-gray-600">Browse team expenses</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/approval-rules">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Approval Rules</h3>
                  <p className="text-sm text-gray-600">Configure workflows</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/users">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Team</h3>
                  <p className="text-sm text-gray-600">Add or edit users</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}