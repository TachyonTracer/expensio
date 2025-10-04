'use client';

import { ProtectedRoute, useAuth } from '@/components/auth/protected-route';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard';
import { EmployeeDashboard } from '@/components/dashboard/employee-dashboard';
import { Loader2 } from 'lucide-react';

const DashboardContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <div className="rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Session expired</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in again to access your dashboard.
          </p>
        </div>
      </div>
    );
  }

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MANAGER':
      return <ManagerDashboard />;
    case 'EMPLOYEE':
      return <EmployeeDashboard />;
    default:
      return (
        <div className="flex justify-center py-24">
          <div className="rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Role not supported</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn’t determine which dashboard to show for your role.
            </p>
          </div>
        </div>
      );
  }
};

const DashboardPage = () => {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background py-10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <DashboardContent />
        </div>
      </main>
    </ProtectedRoute>
  );
};

export default DashboardPage;
