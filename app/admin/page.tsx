'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/components/auth/protected-route';
import { UserManagement } from '@/components/admin/user-management';
import { ApprovalRuleBuilder } from '@/components/admin/approval-rule-builder';
import { CompanySettings } from '@/components/admin/company-settings';
import { ThemeSelector } from '@/components/theme/theme-toggle';
import { LogOut } from 'lucide-react';

type TabType = 'users' | 'rules' | 'settings';

interface TabDefinition {
  id: TabType;
  name: string;
  description: string;
}

const TAB_DEFINITIONS: TabDefinition[] = [
  {
    id: 'users',
    name: 'Users',
    description: 'Manage user accounts and roles',
  },
  {
    id: 'rules',
    name: 'Approval Rules',
    description: 'Configure multi-step approval flows',
  },
  {
    id: 'settings',
    name: 'Company Settings',
    description: 'Update company details and preferences',
  },
];

const TAB_ICONS: Record<TabType, () => React.JSX.Element> = {
  users: () => (
    <svg
      className="w-5 h-5 mr-2 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a6.75 6.75 0 0113.5 0m-2.25-6.75a4.5 4.5 0 018.25-2.61M19.5 20.25a6.735 6.735 0 00-2.25-4.96"
      />
    </svg>
  ),
  rules: () => (
    <svg
      className="w-5 h-5 mr-2 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 4.5h10.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 016.75 4.5zm3 3.75h7.5m-7.5 3h7.5m-7.5 3h7.5M7.5 8.25h.008v.008H7.5V8.25zm0 3h.008v.008H7.5V11.25zm0 3h.008v.008H7.5v-.008z"
      />
    </svg>
  ),
  settings: () => (
    <svg
      className="w-5 h-5 mr-2 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.938a1.5 1.5 0 012.812 0l.299.897a1.5 1.5 0 002.118.948l.855-.428a1.5 1.5 0 012.012.75l.75 1.5a1.5 1.5 0 01-.75 2.012l-.897.299a1.5 1.5 0 00-.948 2.118l.428.855a1.5 1.5 0 01-.75 2.012l-1.5.75a1.5 1.5 0 01-2.012-.75l-.299-.897a1.5 1.5 0 00-2.118-.948l-.855.428a1.5 1.5 0 01-2.012-.75l-.75-1.5a1.5 1.5 0 01.75-2.012l.897-.299a1.5 1.5 0 00.948-2.118l-.428-.855a1.5 1.5 0 01.75-2.012l1.5-.75z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Administration
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Manage users, approval rules, and company settings
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <ThemeSelector />
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
                <div className="bg-card rounded-lg shadow px-4 py-2 border border-border">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 8a6 6 0 01-7.743 5.743L10 14l-4 4-4-4 4-4 .257-.257A6 6 0 1118 8zm-6-2a1 1 0 11-2 0 1 1 0 012 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-foreground">
                        Admin Access
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Full system privileges
                      </p>
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
                {TAB_DEFINITIONS.map(tab => {
                  const Icon = TAB_ICONS[tab.id];

                  const isActive = activeTab === tab.id;
                  const baseClasses =
                    'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center';
                  const activeClasses = 'border-primary text-primary';
                  const inactiveClasses =
                    'border-transparent text-muted-foreground hover:text-foreground hover:border-border';

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon />
                      <div className="text-left">
                        <div>{tab.name}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 sm:px-0 mt-6">
            {activeTab === 'users' && (
              <UserManagement
                onUserCreate={user => {
                  console.log('User created:', user);
                }}
                onUserUpdate={user => {
                  console.log('User updated:', user);
                }}
                onUserDelete={userId => {
                  console.log('User deleted:', userId);
                }}
              />
            )}

            {activeTab === 'rules' && (
              <ApprovalRuleBuilder
                onRuleCreate={rule => {
                  console.log('Rule created:', rule);
                }}
                onRuleUpdate={rule => {
                  console.log('Rule updated:', rule);
                }}
                onRuleDelete={ruleId => {
                  console.log('Rule deleted:', ruleId);
                }}
              />
            )}

            {activeTab === 'settings' && (
              <CompanySettings
                onUpdate={company => {
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
