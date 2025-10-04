'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, JWTPayload } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userPayload, setUserPayload] = useState<JWTPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: Record<string, string> = {};

        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUserPayload(result.data);
            setIsAuthenticated(true);
            return;
          }
        }

        if (response.status === 401) {
          const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
          const refreshBody = refreshToken ? { refreshToken } : {};

          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(refreshBody),
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              localStorage.setItem('accessToken', refreshResult.data.accessToken);
              localStorage.setItem('refreshToken', refreshResult.data.refreshToken);
              setUserPayload(refreshResult.data.user);
              setIsAuthenticated(true);
              return;
            }
          }
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      const currentPath = window.location.pathname;
      const loginUrl = `/auth/login${currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`;
      router.push(loginUrl);
    }
  }, [isAuthenticated, router]);

  // Check role-based access
  useEffect(() => {
    if (isAuthenticated && userPayload && requiredRole) {
      const hasRequiredRole = checkRoleAccess(userPayload.role, requiredRole);
      if (!hasRequiredRole) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, userPayload, requiredRole, router]);

  const checkRoleAccess = (userRole: UserRole, requiredRole: UserRole): boolean => {
    // Role hierarchy: ADMIN > MANAGER > EMPLOYEE
    const roleHierarchy: Record<UserRole, number> = {
      ADMIN: 3,
      MANAGER: 2,
      EMPLOYEE: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (isAuthenticated === false) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      )
    );
  }

  if (isAuthenticated && userPayload && requiredRole) {
    const hasRequiredRole = checkRoleAccess(userPayload.role, requiredRole);
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don&apos;t have permission to access this page.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Hook to get current user data
export function useAuth() {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: Record<string, string> = {};

        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUser(result.data);
            return;
          }
        }

        if (response.status === 401) {
          const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
          const refreshBody = refreshToken ? { refreshToken } : {};

          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(refreshBody),
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            if (refreshResult.success) {
              localStorage.setItem('accessToken', refreshResult.data.accessToken);
              localStorage.setItem('refreshToken', refreshResult.data.refreshToken);
              setUser(refreshResult.data.user);
              return;
            }
          }
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      setUser(null);
      window.location.href = '/auth/login';
    });
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}