'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserProfile } from '@/types';
import { StorageService } from '@/lib/storage-service';

interface AuthContextType {
  user: UserProfile;
  profiles: UserProfile[];
  switchUser: (userId: string) => void;
  logout: () => void;
  isOwner: boolean;
  isManager: boolean;
  isCashier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [profiles] = useState<UserProfile[]>(() => StorageService.getProfiles());
  const [user, setUser] = useState<UserProfile>(() => StorageService.getCurrentUser());

  // Check 24-hour session validity on mount & route change
  useEffect(() => {
    if (pathname !== '/login' && pathname !== '/register') {
      const valid = StorageService.isSessionValid();
      if (!valid) {
        StorageService.logout();
        router.push('/login?expired=1');
      }
    }
  }, [pathname, router]);

  const switchUser = (userId: string) => {
    StorageService.setActiveUserId(userId);
    const updated = StorageService.getCurrentUser();
    setUser(updated);
  };

  const logout = () => {
    StorageService.logout();
    router.push('/login');
  };

  const isOwner = user.role === 'owner';
  const isManager = user.role === 'manager' || isOwner;
  const isCashier = user.role === 'cashier' || isOwner || isManager;

  return (
    <AuthContext.Provider
      value={{
        user,
        profiles,
        switchUser,
        logout,
        isOwner,
        isManager,
        isCashier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

