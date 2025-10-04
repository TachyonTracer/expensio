import { BreadcrumbItem, homeBreadcrumb } from '@/components/ui/breadcrumb';
import { 
  UserIcon, 
  CreditCardIcon, 
  CheckCircleIcon, 
  SettingsIcon,
  BuildingIcon,
  PlusIcon,
  EyeIcon,
  UsersIcon,
  ShieldCheckIcon
} from 'lucide-react';

// Route configuration for breadcrumb generation
const routeConfig: Record<string, { label: string; icon?: any }> = {
  '/': { label: 'Dashboard', icon: homeBreadcrumb.icon },
  '/dashboard': { label: 'Dashboard', icon: homeBreadcrumb.icon },
  '/expenses': { label: 'Expenses', icon: CreditCardIcon },
  '/expenses/new': { label: 'New Expense', icon: PlusIcon },
  '/expenses/[id]': { label: 'Expense Details', icon: EyeIcon },
  '/approvals': { label: 'Approvals', icon: CheckCircleIcon },
  '/profile': { label: 'Profile', icon: UserIcon },
  '/admin': { label: 'Admin', icon: ShieldCheckIcon },
  '/admin/users': { label: 'User Management', icon: UsersIcon },
  '/admin/settings': { label: 'Settings', icon: SettingsIcon },
  '/onboarding': { label: 'Onboarding', icon: BuildingIcon },
  '/onboarding/company-setup': { label: 'Company Setup', icon: BuildingIcon },
  '/auth/login': { label: 'Login', icon: UserIcon },
  '/auth/signup': { label: 'Sign Up', icon: UserIcon },
  '/auth/forgot-password': { label: 'Forgot Password', icon: UserIcon },
};

// Generate breadcrumbs from pathname
export function generateBreadcrumbs(pathname: string, params?: Record<string, string>): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with home for non-auth pages
  if (!pathname.startsWith('/auth')) {
    breadcrumbs.push(homeBreadcrumb);
  }

  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Handle dynamic routes
    let routeKey = currentPath;
    if (params && Object.keys(params).some(key => segment === params[key])) {
      // Replace dynamic segment with placeholder
      const dynamicKey = Object.keys(params).find(key => segment === params[key]);
      if (dynamicKey) {
        routeKey = currentPath.replace(`/${segment}`, `/[${dynamicKey}]`);
      }
    }

    const config = routeConfig[routeKey] || routeConfig[currentPath];
    
    if (config) {
      const isLast = index === segments.length - 1;
      breadcrumbs.push({
        label: config.label,
        href: isLast ? undefined : currentPath,
        icon: config.icon,
      });
    } else {
      // Fallback for unknown routes
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      const isLast = index === segments.length - 1;
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    }
  });

  return breadcrumbs;
}

// Get breadcrumbs for specific routes with custom logic
export function getCustomBreadcrumbs(pathname: string, data?: any): BreadcrumbItem[] {
  switch (true) {
    case pathname.startsWith('/expenses/') && pathname !== '/expenses/new':
      // For expense details page
      const expenseId = pathname.split('/')[2];
      return [
        homeBreadcrumb,
        { label: 'Expenses', href: '/expenses', icon: CreditCardIcon },
        { label: data?.title || `Expense #${expenseId}`, icon: EyeIcon },
      ];

    case pathname.startsWith('/admin/users/'):
      // For user management details
      const userId = pathname.split('/')[3];
      return [
        homeBreadcrumb,
        { label: 'Admin', href: '/admin', icon: ShieldCheckIcon },
        { label: 'Users', href: '/admin/users', icon: UsersIcon },
        { label: data?.name || `User #${userId}`, icon: UserIcon },
      ];

    default:
      return generateBreadcrumbs(pathname);
  }
}

// Role-based breadcrumb filtering
export function filterBreadcrumbsByRole(breadcrumbs: BreadcrumbItem[], userRole?: string): BreadcrumbItem[] {
  if (!userRole) return breadcrumbs;

  // Filter out admin-only breadcrumbs for non-admin users
  if (userRole !== 'admin') {
    return breadcrumbs.filter(item => 
      !item.href?.startsWith('/admin') && 
      !item.label.toLowerCase().includes('admin')
    );
  }

  return breadcrumbs;
}