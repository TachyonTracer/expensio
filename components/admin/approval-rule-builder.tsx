'use client';

import { useState, useEffect } from 'react';
import { ApprovalRule, ApprovalRuleType, CreateApprovalRuleDto, User } from '@/lib/types';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { z } from 'zod';

interface ApprovalRuleBuilderProps {
  onRuleCreate?: (rule: ApprovalRule) => void;
  onRuleUpdate?: (rule: ApprovalRule) => void;
  onRuleDelete?: (ruleId: string) => void;
}

const RuleFormSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  category: z.string().optional(),
  ruleType: z.enum(['PERCENTAGE', 'SPECIFIC_APPROVER', 'HYBRID']),
  requiredPercentage: z.number().min(0).max(100).optional(),
  specificApprovers: z.array(z.string().uuid()).optional(),
  isActive: z.boolean(),
}).refine((data) => {
  if (data.minAmount && data.maxAmount && data.minAmount >= data.maxAmount) {
    return false;
  }
  return true;
}, {
  message: 'Minimum amount must be less than maximum amount',
  path: ['minAmount'],
});

type RuleFormData = z.infer<typeof RuleFormSchema>;

export function ApprovalRuleBuilder({ 
  onRuleCreate, 
  onRuleUpdate, 
  onRuleDelete 
}: ApprovalRuleBuilderProps) {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    minAmount: undefined,
    maxAmount: undefined,
    category: '',
    ruleType: 'PERCENTAGE',
    requiredPercentage: 50,
    specificApprovers: [],
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<RuleFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch approval rules
      const rulesResponse = await fetch('/api/approval-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      // Fetch potential approvers (managers and admins)
      const approversResponse = await fetch('/api/users?role=MANAGER,ADMIN', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (rulesResponse.ok && approversResponse.ok) {
        const rulesResult = await rulesResponse.json();
        const approversResult = await approversResponse.json();

        if (rulesResult.success && approversResult.success) {
          setRules(rulesResult.data);
          setApprovers(approversResult.data);
        } else {
          setError('Failed to fetch data');
        }
      } else {
        setError('Failed to fetch data');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let processedValue: any = value;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (type === 'number') {
      processedValue = value === '' ? undefined : parseFloat(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Clear error when user starts typing
    if (formErrors[name as keyof RuleFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleApproverToggle = (approverId: string) => {
    setFormData(prev => ({
      ...prev,
      specificApprovers: prev.specificApprovers?.includes(approverId)
        ? prev.specificApprovers.filter(id => id !== approverId)
        : [...(prev.specificApprovers || []), approverId]
    }));
  };

  const validateForm = (): boolean => {
    try {
      RuleFormSchema.parse(formData);
      
      // Additional validation based on rule type
      if (formData.ruleType === 'PERCENTAGE' && !formData.requiredPercentage) {
        setFormErrors({ requiredPercentage: 'Required percentage is needed for percentage-based rules' });
        return false;
      }
      
      if (formData.ruleType === 'SPECIFIC_APPROVER' && (!formData.specificApprovers || formData.specificApprovers.length === 0)) {
        setFormErrors({ specificApprovers: 'At least one approver is required for specific approver rules' });
        return false;
      }
      
      if (formData.ruleType === 'HYBRID' && (!formData.requiredPercentage || !formData.specificApprovers || formData.specificApprovers.length === 0)) {
        setFormErrors({ 
          requiredPercentage: !formData.requiredPercentage ? 'Required percentage is needed for hybrid rules' : undefined,
          specificApprovers: (!formData.specificApprovers || formData.specificApprovers.length === 0) ? 'At least one approver is required for hybrid rules' : undefined
        });
        return false;
      }
      
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<RuleFormData> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof RuleFormData] = err.message;
          }
        });
        setFormErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const ruleData: CreateApprovalRuleDto = {
        name: formData.name,
        minAmount: formData.minAmount,
        maxAmount: formData.maxAmount,
        category: formData.category || undefined,
        ruleType: formData.ruleType,
        ruleConfig: {
          requiredPercentage: formData.requiredPercentage,
          specificApprovers: formData.specificApprovers,
          hybridRules: formData.ruleType === 'HYBRID' ? {
            percentage: formData.requiredPercentage!,
            specificApprovers: formData.specificApprovers!,
          } : undefined,
        },
        isActive: formData.isActive,
      };

      const url = editingRule ? `/api/approval-rules/${editingRule.id}` : '/api/approval-rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(ruleData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const rule = result.data;
        
        if (editingRule) {
          setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
          onRuleUpdate?.(rule);
        } else {
          setRules(prev => [...prev, rule]);
          onRuleCreate?.(rule);
        }
        
        handleCloseModal();
      } else {
        setFormErrors({ 
          name: result.error?.message || `Failed to ${editingRule ? 'update' : 'create'} rule` 
        });
      }
    } catch (error) {
      setFormErrors({ 
        name: 'Network error. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      minAmount: rule.minAmount,
      maxAmount: rule.maxAmount,
      category: rule.category || '',
      ruleType: rule.ruleType,
      requiredPercentage: rule.ruleConfig.requiredPercentage,
      specificApprovers: rule.ruleConfig.specificApprovers || [],
      isActive: rule.isActive,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this approval rule? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/approval-rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setRules(prev => prev.filter(rule => rule.id !== ruleId));
        onRuleDelete?.(ruleId);
      } else {
        const result = await response.json();
        setError(result.error?.message || 'Failed to delete rule');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleToggleActive = async (rule: ApprovalRule) => {
    try {
      const response = await fetch(`/api/approval-rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const updatedRule = result.data;
        setRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
        onRuleUpdate?.(updatedRule);
      } else {
        setError(result.error?.message || 'Failed to update rule');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingRule(null);
    setFormData({
      name: '',
      minAmount: undefined,
      maxAmount: undefined,
      category: '',
      ruleType: 'PERCENTAGE',
      requiredPercentage: 50,
      specificApprovers: [],
      isActive: true,
    });
    setFormErrors({});
  };

  const getRuleTypeDisplayName = (type: ApprovalRuleType): string => {
    switch (type) {
      case 'PERCENTAGE':
        return 'Percentage-based';
      case 'SPECIFIC_APPROVER':
        return 'Specific Approver';
      case 'HYBRID':
        return 'Hybrid';
      default:
        return type;
    }
  };

  const getRuleDescription = (rule: ApprovalRule): string => {
    const { ruleType, ruleConfig } = rule;
    
    switch (ruleType) {
      case 'PERCENTAGE':
        return `Requires ${ruleConfig.requiredPercentage}% approval`;
      case 'SPECIFIC_APPROVER':
        return `Requires approval from ${ruleConfig.specificApprovers?.length || 0} specific approver(s)`;
      case 'HYBRID':
        return `Requires ${ruleConfig.requiredPercentage}% approval OR specific approver`;
      default:
        return 'Unknown rule type';
    }
  };

  if (isLoading) {
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Approval Rules</h3>
              <p className="mt-1 text-sm text-gray-600">
                Configure approval workflows for different expense types and amounts
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowCreateModal(true)}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Rule
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

          {/* Rules List */}
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No approval rules</h3>
              <p className="text-gray-600 mb-4">
                Create your first approval rule to define expense approval workflows.
              </p>
              <Button
                type="button"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`border rounded-lg p-4 ${
                    rule.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {rule.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getRuleTypeDisplayName(rule.ruleType)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {getRuleDescription(rule)}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Amount Range:</span>{' '}
                          {rule.minAmount || rule.maxAmount ? (
                            <>
                              {rule.minAmount ? `$${rule.minAmount}` : 'No min'} - {rule.maxAmount ? `$${rule.maxAmount}` : 'No max'}
                            </>
                          ) : (
                            'Any amount'
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span>{' '}
                          {rule.category || 'All categories'}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{' '}
                          {new Date(rule.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(rule)}
                      >
                        {rule.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingRule ? 'Edit Approval Rule' : 'Create Approval Rule'}
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., High Value Expenses"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700">
                      Minimum Amount
                    </label>
                    <input
                      type="number"
                      id="minAmount"
                      name="minAmount"
                      value={formData.minAmount || ''}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.minAmount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {formErrors.minAmount && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.minAmount}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700">
                      Maximum Amount
                    </label>
                    <input
                      type="number"
                      id="maxAmount"
                      name="maxAmount"
                      value={formData.maxAmount || ''}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.maxAmount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="No limit"
                    />
                    {formErrors.maxAmount && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.maxAmount}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ruleType" className="block text-sm font-medium text-gray-700">
                    Rule Type *
                  </label>
                  <select
                    id="ruleType"
                    name="ruleType"
                    value={formData.ruleType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PERCENTAGE">Percentage-based</option>
                    <option value="SPECIFIC_APPROVER">Specific Approver</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                {(formData.ruleType === 'PERCENTAGE' || formData.ruleType === 'HYBRID') && (
                  <div>
                    <label htmlFor="requiredPercentage" className="block text-sm font-medium text-gray-700">
                      Required Percentage *
                    </label>
                    <input
                      type="number"
                      id="requiredPercentage"
                      name="requiredPercentage"
                      value={formData.requiredPercentage || ''}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.requiredPercentage ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="50"
                    />
                    {formErrors.requiredPercentage && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.requiredPercentage}</p>
                    )}
                  </div>
                )}

                {(formData.ruleType === 'SPECIFIC_APPROVER' || formData.ruleType === 'HYBRID') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specific Approvers *
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {approvers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No managers or admins available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {approvers.map((approver) => (
                            <label key={approver.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.specificApprovers?.includes(approver.id) || false}
                                onChange={() => handleApproverToggle(approver.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-900">
                                {approver.email}
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {approver.role}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {formErrors.specificApprovers && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.specificApprovers}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active (rule will be applied to new expenses)
                  </label>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:col-start-2"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingRule ? 'Updating...' : 'Creating...'}
                    </div>
                  ) : (
                    `${editingRule ? 'Update' : 'Create'} Rule`
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
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