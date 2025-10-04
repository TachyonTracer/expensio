'use client';

import { Approval, User, ApprovalStatus } from '@/lib/types';

interface ApprovalTimelineItem extends Approval {
  approver?: User;
}

interface ApprovalTimelineProps {
  approvals: ApprovalTimelineItem[];
  currentStep?: number;
  totalSteps?: number;
}

export function ApprovalTimeline({ 
  approvals, 
  currentStep = 0, 
  totalSteps = 0 
}: ApprovalTimelineProps) {
  const getStatusIcon = (status: ApprovalStatus, isActive: boolean = false) => {
    const baseClasses = "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center";
    
    switch (status) {
      case 'APPROVED':
        return (
          <div className={`${baseClasses} bg-green-100`}>
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'REJECTED':
        return (
          <div className={`${baseClasses} bg-red-100`}>
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'PENDING':
        return (
          <div className={`${baseClasses} ${isActive ? 'bg-blue-100 ring-4 ring-blue-50' : 'bg-yellow-100'}`}>
            {isActive ? (
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
            ) : (
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        );
      default:
        return (
          <div className={`${baseClasses} bg-gray-100`}>
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          </div>
        );
    }
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-800';
      case 'REJECTED':
        return 'text-red-800';
      case 'PENDING':
        return 'text-yellow-800';
      default:
        return 'text-gray-800';
    }
  };

  const getStatusText = (status: ApprovalStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING':
        return 'Pending Review';
      default:
        return 'Unknown';
    }
  };

  if (approvals.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Approval Steps</h3>
            <p className="text-gray-600">This expense doesn't require approval.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">Approval Timeline</h3>
          <p className="mt-1 text-sm text-gray-600">
            {currentStep > 0 && totalSteps > 0 && (
              <>Step {currentStep} of {totalSteps} • </>
            )}
            Track the approval progress of this expense
          </p>
        </div>

        <div className="flow-root">
          <ul className="-mb-8">
            {approvals.map((approval, index) => {
              const isLast = index === approvals.length - 1;
              const isActive = approval.status === 'PENDING' && 
                (index === 0 || approvals[index - 1].status === 'APPROVED');

              return (
                <li key={approval.id}>
                  <div className="relative pb-8">
                    {!isLast && (
                      <span
                        className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${
                          approval.status === 'APPROVED' ? 'bg-green-200' : 
                          approval.status === 'REJECTED' ? 'bg-red-200' : 'bg-gray-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      {getStatusIcon(approval.status, isActive)}
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">
                              {approval.approver?.email || 'Unknown Approver'}
                            </span>
                            {approval.approver?.role && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {approval.approver.role}
                              </span>
                            )}
                          </p>
                          <p className={`mt-0.5 text-sm ${getStatusColor(approval.status)}`}>
                            {getStatusText(approval.status)}
                            {isActive && (
                              <span className="ml-2 text-blue-600 font-medium">
                                (Current Step)
                              </span>
                            )}
                          </p>
                          {approval.comments && (
                            <div className="mt-2 text-sm text-gray-700">
                              <div className="bg-gray-50 rounded-md p-3 border-l-4 border-gray-200">
                                <p className="font-medium text-gray-900 mb-1">Comments:</p>
                                <p>"{approval.comments}"</p>
                              </div>
                            </div>
                          )}
                          {approval.status === 'PENDING' && isActive && (
                            <div className="mt-2 text-sm text-blue-600">
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                Awaiting decision...
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {approval.status === 'PENDING' ? (
                            <div>
                              <time dateTime={approval.createdAt.toString()}>
                                Assigned {new Date(approval.createdAt).toLocaleDateString()}
                              </time>
                              <div className="text-xs text-gray-400 mt-1">
                                {Math.floor((Date.now() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                              </div>
                            </div>
                          ) : approval.approvedAt ? (
                            <div>
                              <time dateTime={approval.approvedAt.toString()}>
                                {new Date(approval.approvedAt).toLocaleDateString()}
                              </time>
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(approval.approvedAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No date</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">
                  {approvals.filter(a => a.status === 'APPROVED').length} Approved
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-gray-600">
                  {approvals.filter(a => a.status === 'PENDING').length} Pending
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-600">
                  {approvals.filter(a => a.status === 'REJECTED').length} Rejected
                </span>
              </div>
            </div>
            <div className="text-gray-500">
              Total: {approvals.length} step{approvals.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}