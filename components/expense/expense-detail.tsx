'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Expense, ExpenseStatus, Approval, User } from '@/lib/types';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { ReceiptViewer } from '@/components/expense/receipt-viewer';
import { Button } from '@/components/ui/button';

interface ExpenseDetailProps {
  expense: Expense;
  approvals?: Approval[];
  approvers?: User[];
  currentUser?: User;
  onEdit?: () => void;
  onDelete?: () => void;
  onWithdraw?: () => void;
  isLoading?: boolean;
}

interface ApprovalWithUser extends Approval {
  approver?: User;
}

export function ExpenseDetail({
  expense,
  approvals = [],
  approvers = [],
  currentUser,
  onEdit,
  onDelete,
  onWithdraw,
  isLoading = false,
}: ExpenseDetailProps) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Combine approvals with approver information
  const approvalsWithUsers: ApprovalWithUser[] = approvals.map(approval => ({
    ...approval,
    approver: approvers.find(user => user.id === approval.approverId),
  }));

  useEffect(() => {
    if (expense.receiptId && showReceipt) {
      // Fetch receipt URL
      const fetchReceiptUrl = async () => {
        try {
          const response = await fetch(`/api/receipts/${expense.receiptId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setReceiptUrl(result.data.url);
            }
          }
        } catch (error) {
          console.error('Failed to fetch receipt:', error);
        }
      };

      fetchReceiptUrl();
    }
  }, [expense.receiptId, showReceipt]);

  const getStatusBadgeColor = (status: ExpenseStatus): string => {
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

  const getStatusDisplayName = (status: ExpenseStatus): string => {
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

  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const canEdit = currentUser && expense.userId === currentUser.id && 
    (expense.status === 'DRAFT' || expense.status === 'REJECTED');
  
  const canDelete = currentUser && expense.userId === currentUser.id && 
    expense.status === 'DRAFT';
  
  const canWithdraw = currentUser && expense.userId === currentUser.id && 
    (expense.status === 'SUBMITTED' || expense.status === 'PENDING_APPROVAL');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
              <p className="mt-1 text-sm text-gray-600">
                Created on {new Date(expense.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(expense.status)}`}>
                {getStatusDisplayName(expense.status)}
              </span>
              {canEdit && onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  disabled={isLoading}
                >
                  Edit
                </Button>
              )}
              {canWithdraw && onWithdraw && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onWithdraw}
                  disabled={isLoading}
                >
                  Withdraw
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={isLoading}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Expense Information</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                <CurrencyDisplay
                  amount={expense.originalAmount}
                  currency={expense.originalCurrency}
                />
              </dd>
              {expense.originalCurrency !== expense.baseCurrency && (
                <dd className="mt-1 text-sm text-gray-600">
                  Converted: <CurrencyDisplay
                    amount={expense.convertedAmount}
                    currency={expense.baseCurrency}
                  />
                  {' '}(Rate: {expense.exchangeRate.toFixed(4)})
                </dd>
              )}
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900">{expense.category}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(expense.expenseDate).toLocaleDateString()}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(expense.status)}`}>
                  {getStatusDisplayName(expense.status)}
                </span>
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{expense.description}</dd>
            </div>

            {expense.receiptId && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Receipt</dt>
                <dd className="mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReceipt(true)}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Receipt
                  </Button>
                </dd>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval History */}
      {approvalsWithUsers.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Approval History</h2>
            
            <div className="flow-root">
              <ul className="-mb-8">
                {approvalsWithUsers.map((approval, index) => (
                  <li key={approval.id}>
                    <div className="relative pb-8">
                      {index !== approvalsWithUsers.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        {getApprovalStatusIcon(approval.status)}
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">
                                {approval.approver?.email || 'Unknown User'}
                              </span>{' '}
                              {approval.status === 'APPROVED' && 'approved'}
                              {approval.status === 'REJECTED' && 'rejected'}
                              {approval.status === 'PENDING' && 'is reviewing'}
                              {' '}this expense
                            </p>
                            {approval.comments && (
                              <div className="mt-2 text-sm text-gray-700">
                                <p className="bg-gray-50 rounded-md p-2">
                                  "{approval.comments}"
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {approval.approvedAt ? (
                              <time dateTime={approval.approvedAt.toString()}>
                                {new Date(approval.approvedAt).toLocaleDateString()}
                              </time>
                            ) : (
                              <span>Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {showReceipt && receiptUrl && (
        <ReceiptViewer
          receiptUrl={receiptUrl}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}