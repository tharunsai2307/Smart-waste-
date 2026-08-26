import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Workspace } from '../types';
import { api } from '../services/api';
import { useAppStore } from '../store';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  refresh: () => void;
  switchWorkspace: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: null,
  workspaces: [],
  loading: false,
  refresh: () => {},
  switchWorkspace: () => {},
});

import { setActiveWorkspaceOverride } from '../services/api';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [curr, all] = await Promise.all([
        api.getCurrentWorkspace().catch(() => null),
        api.getWorkspaces().catch(() => []),
      ]);
      setCurrentWorkspace(curr);
      setWorkspaces(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const switchWorkspace = (workspaceId: string) => {
    setActiveWorkspaceOverride(workspaceId);
    fetchAll();
  };

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, workspaces, loading, refresh: fetchAll, switchWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
