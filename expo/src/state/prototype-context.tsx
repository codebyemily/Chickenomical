import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import type { Category, DemoArea } from '@/data/demo';
import type { SortMode } from '@/lib/compare';

export type RefreshStatus = 'idle' | 'running' | 'complete' | 'failed';

type PrototypeState = {
  category: Category;
  setCategory: (value: Category) => void;
  sort: SortMode;
  setSort: (value: SortMode) => void;
  radiusMiles: number;
  setRadiusMiles: (value: number) => void;
  area: DemoArea;
  locationLabel: string;
  setDemoArea: (area: DemoArea, label: string) => void;
  refreshStatus: RefreshStatus;
  refreshMessage: string;
  runMockRefresh: (result?: 'complete' | 'failed') => void;
};

const PrototypeContext = createContext<PrototypeState | null>(null);

export function PrototypeProvider({ children }: PropsWithChildren) {
  const [category, setCategory] = useState<Category>('nuggets');
  const [sort, setSort] = useState<SortMode>('unit');
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [area, setArea] = useState<DemoArea>('market');
  const [locationLabel, setLocationLabel] = useState('Market Street · demo area');
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle');
  const [refreshMessage, setRefreshMessage] = useState('No demo refresh has run.');

  const setDemoArea = useCallback((nextArea: DemoArea, nextLabel: string) => {
    setArea(nextArea);
    setLocationLabel(nextLabel);
  }, []);

  const runMockRefresh = useCallback((result: 'complete' | 'failed' = 'complete') => {
    setRefreshStatus('running');
    setRefreshMessage('Simulating a local prototype refresh. No network request is sent.');
    setTimeout(() => {
      setRefreshStatus(result);
      setRefreshMessage(
        result === 'complete'
          ? 'Demo refresh complete. The local fixture did not change.'
          : 'Demo refresh failed. Existing sample rows remain visible.',
      );
    }, 650);
  }, []);

  const value = useMemo(
    () => ({
      category,
      setCategory,
      sort,
      setSort,
      radiusMiles,
      setRadiusMiles,
      area,
      locationLabel,
      setDemoArea,
      refreshStatus,
      refreshMessage,
      runMockRefresh,
    }),
    [category, sort, radiusMiles, area, locationLabel, setDemoArea, refreshStatus, refreshMessage, runMockRefresh],
  );

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const state = useContext(PrototypeContext);
  if (!state) throw new Error('usePrototype must be used inside PrototypeProvider');
  return state;
}
