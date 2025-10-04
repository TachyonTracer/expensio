'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <AdminDashboard />
        </div>
      </div>
    </ProtectedRoute>
  );
}