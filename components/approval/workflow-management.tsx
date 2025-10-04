'use client';

import { useState, useEffect } from 'react';
import { ApprovalRule } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface WorkflowManagementProps {
  className?: string;
}

export function WorkflowManagement({ className }: WorkflowManagementProps) {
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovalRules();
  }, []);

  const fetchApprovalRules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/approval-rules');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch approval rules');
      }
      
      setApprovalRules(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/approval-rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update rule');
      }
      
      // Update local state
      setApprovalRules(prev => 
        prev.map(rule => 
          rule.id === ruleId ? { ...rule, isActive: !isActive } : rule
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const getRuleTypeDisplay = (ruleType: string): string => {
    switch (ruleType) {
      case 'PERCENTAGE':
        return 'Percentage-based';
      case 'SPECIFIC_APPROVER':
        return 'Specific Approver';
      case 'HYBRID':
        return 'Hybrid';
      default:
        return ruleType;
    }
  };

  const getRuleDescription = (rule: ApprovalRule): string => {
    const parts = [];
    
    if (rule.minAmount || rule.maxAmount) {
      if (rule.minAmount && rule.maxAmount) {
        parts.push(`$${rule.minAmount} - $${rule.maxAmount}`);
      } else if (rule.minAmount) {
        parts.push(`≥ $${rule.minAmount}`);
      } else if (rule.maxAmount) {
        parts.push(`≤ $${rule.maxAmount}`);
      }
    }
    
    if (rule.category) {
      parts.push(`Category: ${rule.category}`);
    }
    
    return parts.join(' • ') || 'All expenses';
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow border ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Approval Workflows</h3>
            <p className="mt-1 text-sm text-gray-600">
              Manage approval rules and workflow configurations
            </p>
          </div>
          <Button
            onClick={() => window.open('/admin/approval-rules', '_blank')}
            size="sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Rule
          </Button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
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

        {approvalRules.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No approval rules configured</h3>
            <p className="text-gray-600 mb-4">
              Create approval rules to automate your expense approval workflows.
            </p>
            <Button onClick={() => window.open('/admin/approval-rules', '_blank')}>
              Create First Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {approvalRules.map((rule) => (
              <div
                key={rule.id}
                className={`border rounded-lg p-4 transition-colors ${
                  rule.isActive 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {rule.name}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getRuleTypeDisplay(rule.ruleType)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {getRuleDescription(rule)}
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      Created {new Date(rule.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => window.open(`/admin/approval-rules/${rule.id}`, '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                    <Button
                      onClick={() => toggleRuleStatus(rule.id, rule.isActive)}
                      variant={rule.isActive ? "destructive" : "default"}
                      size="sm"
                    >
                      {rule.isActive ? (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Disable
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Enable
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}