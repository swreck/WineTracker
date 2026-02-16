import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type SortField = 'name' | 'vintage' | 'price' | 'rating' | 'tastings';
type SortDir = 'asc' | 'desc';

export interface WinesListState {
  search: string;
  colorFilter: string;
  sourceFilter: string;
  sortField: SortField;
  sortDir: SortDir;
  vintageMin: string;
  vintageMax: string;
  expandedWines: Set<number>;
  scrollPosition: number;
  filteredWineIds: number[];
}

const defaultState: WinesListState = {
  search: '',
  colorFilter: '',
  sourceFilter: '',
  sortField: 'name',
  sortDir: 'asc',
  vintageMin: '',
  vintageMax: '',
  expandedWines: new Set(),
  scrollPosition: 0,
  filteredWineIds: [],
};

interface NavigationContextType {
  winesListState: WinesListState;
  updateWinesListState: (updates: Partial<WinesListState>) => void;
  saveScrollPosition: () => void;
  shouldRestoreScroll: boolean;
  setShouldRestoreScroll: (value: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [winesListState, setWinesListState] = useState<WinesListState>(defaultState);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);

  const updateWinesListState = useCallback((updates: Partial<WinesListState>) => {
    setWinesListState(prev => ({ ...prev, ...updates }));
  }, []);

  const saveScrollPosition = useCallback(() => {
    setWinesListState(prev => ({
      ...prev,
      scrollPosition: window.scrollY,
    }));
    setShouldRestoreScroll(true);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        winesListState,
        updateWinesListState,
        saveScrollPosition,
        shouldRestoreScroll,
        setShouldRestoreScroll,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
