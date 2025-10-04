'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute, useAuth } from '@/components/auth/protected-route';
import { UserProfile } from '@/components/auth/user-profile';
import { User } from '@/lib/types';

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;

      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUser(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserProfile();
    }
  }, [authUser, authLoading]);

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-2 text-gray-600">Manage your account information and preferences</p>
          </div>
          
          {user && (
            <UserProfile 
              user={user} 
              onUpdate={handleUserUpdate}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}