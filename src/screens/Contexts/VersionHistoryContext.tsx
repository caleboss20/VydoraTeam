import React, { createContext, useContext, useState, useCallback } from 'react';
import { ProjectVersion, VersionHistoryState } from '../types';
import { versionService } from '../services/VersionHistory';
interface VersionHistoryContextType extends VersionHistoryState {
  fetchVersions: (projectId: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  clearError: () => void;
}
const VersionHistoryContext = createContext<VersionHistoryContextType | undefined>(undefined);
export const VersionHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const fetchVersions = useCallback(async (id: string) => {
    setProjectId(id);
    setLoading(true);
    setError(null);
    try {
      const data = await versionService.getVersionHistory(id);
      setVersions(data.sort((a, b) => b.versionNumber - a.versionNumber));
    }
     catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load version history');
    } 
    finally {
      setLoading(false);
    }
  }, []);
  const restoreVersion = useCallback(async (versionId: string) => {
    if (!projectId) {
      setError('No project selected');
      return;
    }
    setRestoringVersionId(versionId);
    setError(null);
    try {
      const restored = await versionService.restoreVersion(projectId, versionId);
      setVersions(prev =>
        prev.map(v => ({
          ...v,
          isCurrent: v.id === restored.id,
          isRestored: v.id === restored.id ? true : v.isRestored,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to restore version');
    } finally {
      setRestoringVersionId(null);
    }
  }, [projectId]);
  const clearError = useCallback(() => setError(null), []);
  return (
    <VersionHistoryContext.Provider
      value={{ versions, loading, error, restoringVersionId, fetchVersions, restoreVersion, clearError }}
    >
      {children}
    </VersionHistoryContext.Provider>
  );
};
export const useVersionHistory = () => {
  const ctx = useContext(VersionHistoryContext);
  if (!ctx) throw new Error('useVersionHistory must be used within VersionHistoryProvider');
  return ctx;
};