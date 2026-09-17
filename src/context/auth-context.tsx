'use client';

import React, { createContext, useContext, useState } from 'react';
import { UserProfile } from '@/types';
import { StorageService } from '@/lib/storage-service';

interface AuthContextType {
  user: UserProfile;
  profiles: UserProfile[];
  switchUser: (userId: string) => void;
  isOwner: boolean;
  isManager: boolean;
  isCashier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profiles] = useState<UserProfile[]>(() => StorageService.getProfiles());
  const [user, setUser] = useState<UserProfile>(() => StorageService.getCurrentUser());

  const switchUser = (userId: string) => {
    StorageService.setActiveUserId(userId);
    const updated = StorageService.getCurrentUser();
    setUser(updated);
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
