'use client';

import { ReactNode, useState } from 'react';
import { Header } from './header';
import { BreadcrumbNavigation } from './breadcrumb-navigation';
import { MobileSidebar } from './mobile-sidebar';
import { ResponsiveContainer } from '@/components/ui/responsive-grid';

interface MainLayoutProps {
  children: ReactNode;
  userRole?: string;
  showBreadcrumbs?: boolean;
  breadcrumbData?: any;
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
}

export function MainLayout({ 
  children, 
  userRole, 
  showBreadcrumbs = true,
  breadcrumbData,
  containerSize = 'xl',
  padding = true
}: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {showBreadcrumbs && (
        <BreadcrumbNavigation 
          userRole={userRole} 
          customData={breadcrumbData}
        />
      )}
      
      <MobileSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={userRole}
      />
      
      <main className="flex-1">
        {padding ? (
          <ResponsiveContainer 
            size={containerSize}
            padding={{ default: 4, sm: 6, lg: 8 }}
          >
            <div className="py-6 lg:py-8">
              {children}
            </div>
          </ResponsiveContainer>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

// Specialized layout for full-width pages
export function FullWidthLayout({ 
  children, 
  userRole, 
  showBreadcrumbs = true,
  breadcrumbData 
}: Omit<MainLayoutProps, 'containerSize' | 'padding'>) {
  return (
    <MainLayout
      userRole={userRole}
      showBreadcrumbs={showBreadcrumbs}
      breadcrumbData={breadcrumbData}
      containerSize="full"
      padding={false}
    >
      {children}
    </MainLayout>
  );
}

// Specialized layout for forms and narrow content
export function NarrowLayout({ 
  children, 
  userRole, 
  showBreadcrumbs = true,
  breadcrumbData 
}: Omit<MainLayoutProps, 'containerSize'>) {
  return (
    <MainLayout
      userRole={userRole}
      showBreadcrumbs={showBreadcrumbs}
      breadcrumbData={breadcrumbData}
      containerSize="md"
    >
      {children}
    </MainLayout>
  );
}