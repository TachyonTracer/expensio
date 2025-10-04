'use client';

import { useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { ResponsiveBreadcrumb } from '@/components/ui/breadcrumb';
import { useBreadcrumb } from '@/lib/hooks/use-breadcrumb';
import { generateBreadcrumbs, getCustomBreadcrumbs, filterBreadcrumbsByRole } from '@/lib/utils/breadcrumb-utils';
import { cn } from '@/lib/utils';

interface BreadcrumbNavigationProps {
  className?: string;
  userRole?: string;
  customData?: any;
}

export function BreadcrumbNavigation({ 
  className, 
  userRole,
  customData 
}: BreadcrumbNavigationProps) {
  const pathname = usePathname();
  const params = useParams();
  const { items, setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    // Skip breadcrumbs for auth pages and root
    if (pathname === '/' || pathname.startsWith('/auth/')) {
      setBreadcrumbs([]);
      return;
    }

    // Generate breadcrumbs based on current route
    let breadcrumbs = customData 
      ? getCustomBreadcrumbs(pathname, customData)
      : generateBreadcrumbs(pathname, params as Record<string, string>);

    // Filter breadcrumbs based on user role
    breadcrumbs = filterBreadcrumbsByRole(breadcrumbs, userRole);

    setBreadcrumbs(breadcrumbs);
  }, [pathname, params, userRole, customData, setBreadcrumbs]);

  // Don't render if no breadcrumbs
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <ResponsiveBreadcrumb items={items} />
      </div>
    </div>
  );
}

// Standalone breadcrumb component for specific pages
export function PageBreadcrumb({ 
  items, 
  className 
}: { 
  items: any[]; 
  className?: string; 
}) {
  return (
    <div className={cn(
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <ResponsiveBreadcrumb items={items} />
      </div>
    </div>
  );
}