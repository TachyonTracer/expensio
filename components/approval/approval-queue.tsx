'use client';

import { useState, useEffect } from 'react';
import { Expense, User, Approval } from '@/lib/types';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Button } from '@/components/ui/button';

interface PendingExpense extends Expense {
  user?: User;
  currentApproval?: Approval;
}

interface ApprovalQueueProps {
  onApprovalAction?: (expenseId: string, action: 'approve' | 'reject', comments?: string) => void;
  isLoading?: boolean;
}

export function ApprovalQueue({ onApprovalAction, isLoading = false }: ApprovalQueueProps) {
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<PendingExpense | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingApprovals = async () => {
    setFetchLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/approvals/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPendingExpenses(result.data);
        } else {
          setError(result.error?.message || 'Failed to fetch pending approvals');
        }
      } else {
        setError('Failed to fetch pending approvals');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const handleDecisionClick = (expense: PendingExpense, action: 'approve' | 'reject') => {
    setSelectedExpense(expense);
    setDecisionAction(action);
    setComments('');
    setShowDecisionModal(true);
  };

  const handleSubmitDecision = async () => {
    if (!selectedExpense) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/expenses/${selectedExpense.id}/${decisionAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ comments }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Remove the expense from pending list
          setPendingExpenses(prev => 
            prev.filter(expense => expense.id !== selectedExpense.id)
          );
          setShowDecisionModal(false);
          onApprovalAction?.(selectedExpense.id, decisionAction, comments);
        } else {
          setError(result.error?.message || `Failed to ${decisionAction} expense`);
        }
      } else {
        setError(`Failed to ${decisionAction} expense`);
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (expense: PendingExpense) => {
    const amount = expense.originalAmount;
    const daysSinceSubmission = Math.floor(
      (Date.now() - new Date(expense.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (amount > 1000 || daysSinceSubmission > 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          High Priority
        </span>
      );
    } else if (amount > 500 || daysSinceSubmission > 3) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Medium Priority
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Low Priority
        </span>
      );
    }
  };

  if (fetchLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
              <p className="mt-1 text-sm text-gray-600">
                {pendingExpenses.length} expense{pendingExpenses.length !== 1 ? 's' : ''} awaiting your approval
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchPendingApprovals}
              disabled={fetchLoading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {pendingExpenses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">No expenses are currently pending your approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {expense.description}
                        </h4>
                        {getPriorityBadge(expense)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Employee:</span> {expense.user?.email || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span>{' '}
                          <CurrencyDisplay
                            amount={expense.originalAmount}
                            currency={expense.originalCurrency}
                          />
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {expense.category}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        Submitted {new Date(expense.createdAt).toLocaleDateString()} •{' '}
                        {Math.floor((Date.now() - new Date(expense.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/expenses/${expense.id}`, '_blank')}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDecisionClick(expense, 'reject')}
                        disabled={isLoading}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleDecisionClick(expense, 'approve')}
                        disabled={isLoading}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {showDecisionModal && selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                  decisionAction === 'approve' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {decisionAction === 'approve' ? (
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {decisionAction === 'approve' ? 'Approve' : 'Reject'} Expense
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to {decisionAction} this expense for{' '}
                      <CurrencyDisplay
                        amount={selectedExpense.originalAmount}
                        currency={selectedExpense.originalCurrency}
                      />?
                    </p>
                    <div className="mt-4 bg-gray-50 rounded-md p-3 text-left">
                      <p className="text-sm font-medium text-gray-900">{selectedExpense.description}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedExpense.category} • {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                  Comments {decisionAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <div className="mt-1">
                  <textarea
                    id="comments"
                    name="comments"
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder={`Add ${decisionAction === 'approve' ? 'optional' : 'required'} comments...`}
                  />
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <Button
                  type="button"
                  onClick={handleSubmitDecision}
                  disabled={isSubmitting || (decisionAction === 'reject' && !comments.trim())}
                  className="w-full sm:col-start-2"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {decisionAction === 'approve' ? 'Approving...' : 'Rejecting...'}
                    </div>
                  ) : (
                    `${decisionAction === 'approve' ? 'Approve' : 'Reject'} Expense`
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDecisionModal(false)}
                  disabled={isSubmitting}
                  className="mt-3 w-full sm:mt-0 sm:col-start-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}