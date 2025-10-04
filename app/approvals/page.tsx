'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApprovalQueue } from '@/components/approval/approval-queue';
import { ApprovalHistory } from '@/components/approval/approval-history';
import { Button } from '@/components/ui/button';

type TabType = 'queue' | 'history';

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleApprovalAction = (expenseId: string, action: 'approve' | 'reject', comments?: string) => {
    // Refresh both components by updating the key
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'queue' as TabType, name: 'Pending Approvals', icon: 'clock' },
    { id: 'history' as TabType, name: 'Approval History', icon: 'history' },
  ];

  const getTabIcon = (iconType: string) => {
    switch (iconType) {
      case 'clock':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'history':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Approvals</h1>
                <p className="mt-2 text-gray-600">
                  Review and manage expense approvals
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh All
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 sm:px-0">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    {getTabIcon(tab.icon)}
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 sm:px-0 mt-6">
            {activeTab === 'queue' && (
              <ApprovalQueue
                key={`queue-${refreshKey}`}
                onApprovalAction={handleApprovalAction}
              />
            )}
            
            {activeTab === 'history' && (
              <ApprovalHistory
                key={`history-${refreshKey}`}
                onRefresh={handleRefresh}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}