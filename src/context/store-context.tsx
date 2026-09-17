'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Store } from '@/types';
import { StorageService } from '@/lib/storage-service';
import { useAuth } from './auth-context';

interface StoreContextType {
  activeStore: Store;
  availableStores: Store[];
  setActiveStore: (storeId: string) => void;
  refreshStores: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, isOwner } = useAuth();
  const [allStores, setAllStores] = useState<Store[]>(() => StorageService.getStores());
  const [activeStoreState, setActiveStoreState] = useState<Store>(() => StorageService.getActiveStore());

  const refreshStores = useCallback(() => {
    const stores = StorageService.getStores();
    setAllStores(stores);
    const active = StorageService.getActiveStore();
    setActiveStoreState(active);
  }, []);

  // Filter accessible stores based on user role & store assignment
  const availableStores = isOwner
    ? allStores
    : allStores.filter((s) => user.stores?.some((us) => us.id === s.id));

  // Determine active store cleanly
  const activeStore = availableStores.some((s) => s.id === activeStoreState.id)
    ? activeStoreState
    : availableStores[0] || activeStoreState;

  const setActiveStore = (storeId: string) => {
    StorageService.setActiveStoreId(storeId);
    const target = allStores.find((s) => s.id === storeId);
    if (target) {
      setActiveStoreState(target);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        activeStore,
        availableStores,
        setActiveStore,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
