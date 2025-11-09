'use client';

import { useEffect } from 'react';

import { useBeatStore } from '@/store/useBeatStore';

export const StoreHydrator = () => {
  const hydrateFromStorage = useBeatStore((state) => state.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return null;
};

export default StoreHydrator;
