/**
 * Version history ↔ Spring Boot `/projects/{id}/versions`.
 *
 * Snapshots store the full editor `VideoProject` so restore is CapCut-real:
 * trims, filters, text, music, and timeline order come back.
 */
import { apiRequest } from './apiClient';
import { ProjectVersion, VideoProject } from '../types';

export type VersionKind = 'auto' | 'named' | 'pre_restore';

export type VersionSnapshot = {
  schemaVersion: 1;
  videoProject: VideoProject;
  savedAt: string;
};

type ApiAuthor = {
  id: string | null;
  name: string;
  initials: string;
  color: string;
};

type ApiVersion = {
  id: string;
  projectId: string;
  versionNumber: number;
  name?: string | null;
  kind?: string | null;
  isCurrent: boolean;
  isRestored: boolean;
  changeSummary?: string | null;
  thumbnailUrl?: string | null;
  sourceVersionId?: string | null;
  author: ApiAuthor;
  createdAt: string;
  updatedAt?: string;
  snapshot?: VersionSnapshot | null;
};

type ItemsVersions = { items: ApiVersion[] };

function mapVersion(v: ApiVersion): ProjectVersion {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    projectId: v.projectId,
    name: v.name || undefined,
    kind: (v.kind as VersionKind) || 'auto',
    author: {
      id: v.author?.id || 'unknown',
      name: v.author?.name || 'Unknown',
      initials: v.author?.initials || '?',
      color: v.author?.color || '#555555',
    },
    createdAt: v.createdAt,
    isCurrent: !!v.isCurrent,
    isRestored: !!v.isRestored,
    changeSummary: v.changeSummary || undefined,
    thumbnailUrl: v.thumbnailUrl || undefined,
    snapshot: v.snapshot || undefined,
  };
}

export function buildVersionSnapshot(videoProject: VideoProject): VersionSnapshot {
  return {
    schemaVersion: 1,
    videoProject,
    savedAt: new Date().toISOString(),
  };
}

export function extractVideoProject(snapshot: VersionSnapshot | null | undefined): VideoProject | null {
  if (!snapshot?.videoProject) return null;
  return snapshot.videoProject;
}

export const versionService = {
  getVersionHistory: async (projectId: string): Promise<ProjectVersion[]> => {
    const data = await apiRequest<ItemsVersions>(`/projects/${projectId}/versions`);
    return (data.items || []).map(mapVersion);
  },

  getVersion: async (projectId: string, versionId: string): Promise<ProjectVersion> => {
    const data = await apiRequest<ApiVersion>(`/projects/${projectId}/versions/${versionId}`);
    return mapVersion(data);
  },

  createVersion: async (
    projectId: string,
    opts: {
      kind?: VersionKind;
      name?: string;
      changeSummary?: string;
      thumbnailUrl?: string;
      snapshot: VersionSnapshot;
    }
  ): Promise<ProjectVersion> => {
    const data = await apiRequest<ApiVersion>(`/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify({
        kind: opts.kind || 'auto',
        name: opts.name,
        changeSummary: opts.changeSummary,
        thumbnailUrl: opts.thumbnailUrl,
        snapshot: opts.snapshot,
      }),
    });
    return mapVersion(data);
  },

  restoreVersion: async (
    projectId: string,
    versionId: string,
    currentSnapshot?: VersionSnapshot | null
  ): Promise<ProjectVersion> => {
    const data = await apiRequest<ApiVersion>(
      `/projects/${projectId}/versions/${versionId}/restore`,
      {
        method: 'POST',
        body: JSON.stringify({
          currentSnapshot: currentSnapshot || undefined,
          currentChangeSummary: currentSnapshot
            ? 'Saved automatically before restore'
            : undefined,
        }),
      }
    );
    return mapVersion(data);
  },
};
