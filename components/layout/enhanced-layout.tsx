'use client';

import { ReactNode } from 'react';
import { MainLayout } from './main-layout';
import { DashboardParticleBackground } from '@/components/ui/particle-background';
import { PageTransitionWrapper } from '@/components/ui/page-transitions';
import { useAnimationContext } from '@/lib/hooks/use-animation-context';

interface EnhancedLayoutProps {
  children: ReactNode;
  userRole?: string;
  showBreadcrumbs?: boolean;
  breadcrumbData?: any;
  showParticles?: boolean;
  particlePreset?: 'default' | 'minimal' | 'floating' | 'network' | 'bubbles';
  transitionType?: 'fade' | 'slide' | 'scale' | 'none';
}

export function EnhancedLayout({
  children,
  userRole,
  showBreadcrumbs = true,
  breadcrumbData,
  showParticles = true,
  particlePreset = 'minimal',
  transitionType = 'fade',
}: EnhancedLayoutProps) {
  const { animationsEnabled } = useAnimationContext();

  return (
    <MainLayout
      userRole={userRole}
      showBreadcrumbs={showBreadcrumbs}
      breadcrumbData={breadcrumbData}
    >
      {/* Particle Background */}
      {showParticles && animationsEnabled && (
        <DashboardParticleBackground />
      )}

      {/* Page Transitions */}
      <PageTransitionWrapper transitionType={animationsEnabled ? transitionType : 'none'}>
        {children}
      </PageTransitionWrapper>
    </MainLayout>
  );
}