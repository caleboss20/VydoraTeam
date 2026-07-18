/**
 * Version history service.
 *
 * There are no `/projects/{id}/versions` endpoints on vydora-backend yet.
 * With CONFIG.USE_MOCK = false this returns an empty list so the Version
 * History screen renders its empty state instead of hitting a dead host.
 *
 * When the backend adds version snapshots, implement:
 *   GET  /projects/{projectId}/versions
 *   POST /projects/{projectId}/versions/{versionId}/restore
 */
import { CONFIG } from '../config';
import { ProjectVersion } from '../types';

export const versionService = {
  getVersionHistory: async (_projectId: string): Promise<ProjectVersion[]> => {
    if (CONFIG.USE_MOCK) {
      return [];
    }
    // Backend gap — keep UI stable with an empty timeline.
    return [];
  },

  restoreVersion: async (
    _projectId: string,
    _versionId: string
  ): Promise<ProjectVersion> => {
    throw new Error(
      'Version restore is not available yet — the backend has no versions API.'
    );
  },
};
