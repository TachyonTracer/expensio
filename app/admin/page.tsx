'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { UserManagement } from '@/components/admin/user-management';
import { ApprovalRuleBuilder } from '@/components/admin/approval-rule-builder';
import { CompanySettings } from '@/components/admin/company-settings';
import { ThemeSelector } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';

type TabType = 'users' | 'rules' | 'settings';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const tabs = [
    { 
      id: 'users' as TabType, 
      name: 'User Management', 
      icon: 'users',
      description: 'Manage users, roles, and permissions'
    },
    { 
      id: 'rules' as TabType, 
      name: 'Approval Rules', 
      icon: 'rules',
      description: 'Configure expense approval workflows'
    },
    { 
      id: 'settings' as TabType, 
      name: 'Company Settings', 
      icon: 'settings',
      description: 'Manage company information and preferences'
    },
  ];

  const getTabIcon = (iconType: string) => {
    switch (iconType) {
      case 'users':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        );
      case 'rules':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Administration</h1>
                <p className="mt-2 text-muted-foreground">
                  Manage users, approval rules, and company settings
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <ThemeSelector />
                <div className="bg-card rounded-lg shadow px-4 py-2 border border-border">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-4 4-4-4 4-4 .257-.257A6 6 0 1118 8zm-6-2a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-foreground">Admin Access</p>
                      <p className="text-xs text-muted-foreground">Full system privileges</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-4 sm:px-0">
            <div className="border-b border-border">
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
                    <div className="text-left">
                      <div>{tab.name}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 sm:px-0 mt-6">
            {activeTab === 'users' && (
              <UserManagement
                onUserCreate={(user) => {
                  console.log('User created:', user);
                }}
                onUserUpdate={(user) => {
                  console.log('User updated:', user);
                }}
                onUserDelete={(userId) => {
                  console.log('User deleted:', userId);
                }}
              />
            )}
            
            {activeTab === 'rules' && (
              <ApprovalRuleBuilder
                onRuleCreate={(rule) => {
                  console.log('Rule created:', rule);
                }}
                onRuleUpdate={(rule) => {
                  console.log('Rule updated:', rule);
                }}
                onRuleDelete={(ruleId) => {
                  console.log('Rule deleted:', ruleId);
                }}
              />
            )}
            
            {activeTab === 'settings' && (
              <CompanySettings
                onUpdate={(company) => {
                  console.log('Company updated:', company);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}