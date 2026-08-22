import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'viselle-sidebar-collapsed';

interface SidebarCollapseContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);

  return <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>;
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    throw new Error('useSidebarCollapse must be used within SidebarCollapseProvider');
  }
  return ctx;
}
