import React, { createContext, useContext, useState, useCallback } from 'react';
import { ProjectVersion, VersionHistoryState, VersionSnapshot, VideoProject } from '../types';
import {
  buildVersionSnapshot,
  extractVideoProject,
  versionService,
  VersionKind,
} from '../services/VersionHistory';

interface VersionHistoryContextType extends VersionHistoryState {
  fetchVersions: (projectId: string) => Promise<void>;
  createVersion: (opts: {
    kind?: VersionKind;
    name?: string;
    changeSummary?: string;
    thumbnailUrl?: string;
    videoProject: VideoProject;
  }) => Promise<ProjectVersion | null>;
  restoreVersion: (
    versionId: string,
    currentVideoProject?: VideoProject | null
  ) => Promise<VideoProject | null>;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, []);

  const createVersion = useCallback(
    async (opts: {
      kind?: VersionKind;
      name?: string;
      changeSummary?: string;
      thumbnailUrl?: string;
      videoProject: VideoProject;
    }) => {
      const pid = opts.videoProject.projectId || projectId;
      if (!pid) {
        setError('No project selected');
        return null;
      }
      setError(null);
      try {
        const snapshot: VersionSnapshot = buildVersionSnapshot(opts.videoProject);
        const created = await versionService.createVersion(pid, {
          kind: opts.kind || 'auto',
          name: opts.name,
          changeSummary: opts.changeSummary,
          thumbnailUrl: opts.thumbnailUrl || opts.videoProject.coverThumbnailUri,
          snapshot,
        });
        setVersions((prev) => {
          const without = prev.map((v) => ({ ...v, isCurrent: false }));
          const next = [created, ...without.filter((v) => v.id !== created.id)];
          return next.sort((a, b) => b.versionNumber - a.versionNumber);
        });
        setProjectId(pid);
        return created;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save version');
        return null;
      }
    },
    [projectId]
  );

  const restoreVersion = useCallback(
    async (versionId: string, currentVideoProject?: VideoProject | null) => {
      if (!projectId) {
        setError('No project selected');
        return null;
      }
      setRestoringVersionId(versionId);
      setError(null);
      try {
        const currentSnapshot =
          currentVideoProject && currentVideoProject.projectId === projectId
            ? buildVersionSnapshot(currentVideoProject)
            : null;
        const restored = await versionService.restoreVersion(
          projectId,
          versionId,
          currentSnapshot
        );
        // Refresh list so pre_restore checkpoint + new current show up.
        const data = await versionService.getVersionHistory(projectId);
        setVersions(data.sort((a, b) => b.versionNumber - a.versionNumber));

        let snapshot = restored.snapshot;
        if (!snapshot) {
          const detail = await versionService.getVersion(projectId, restored.id);
          snapshot = detail.snapshot;
        }
        return extractVideoProject(snapshot);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to restore version');
        return null;
      } finally {
        setRestoringVersionId(null);
      }
    },
    [projectId]
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <VersionHistoryContext.Provider
      value={{
        versions,
        loading,
        error,
        restoringVersionId,
        fetchVersions,
        createVersion,
        restoreVersion,
        clearError,
      }}
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
