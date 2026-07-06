import { ProjectVersion } from '../types';
// ─── FLAG: flip this to false once Spring Boot version endpoints are live ───
const USE_MOCK = true;
const BASE_URL = 'http://YOUR_BACKEND_HOST:8080/api/v1';
// ─── Mock data store (in-memory, keyed by projectId, resets on app reload) ───
// Generated lazily per projectId so it works with whatever real project IDs
// your app actually uses, instead of being pinned to a hardcoded 'p1'.
const mockVersionsByProject: Record<string, ProjectVersion[]> = {};
function generateMockVersions(projectId: string): ProjectVersion[] {
  return [
    {
      id: projectId + '-v4',
      versionNumber: 4,
      projectId,
      author: { id: 'u1', name: 'Dave Yirenkyi', initials: 'DY', color: '#E85C5C' },
      createdAt: new Date().toISOString(),
      isCurrent: true,
      isRestored: false,
    },
    {
      id: projectId + '-v3',
      versionNumber: 3,
      projectId,
      author: { id: 'u2', name: 'James', initials: 'J', color: '#3DBFB0' },
      createdAt: new Date(Date.now() - 32 * 60000).toISOString(),
      isCurrent: false,
      isRestored: false,
    },
    {
      id: projectId + '-v2',
      versionNumber: 2,
      projectId,
      author: { id: 'u3', name: 'Nicolas', initials: 'N', color: '#8B6FD9' },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isCurrent: false,
      isRestored: false,
    },
    {
      id: projectId + '-v1',
      versionNumber: 1,
      projectId,
      author: { id: 'u4', name: 'Caleb', initials: 'C', color: '#E85C5C' },
      createdAt: new Date(Date.now() - 86400000 + 16 * 3600000).toISOString(),
      isCurrent: false,
      isRestored: true,
    },
  ];
}
function getOrCreateMockVersions(projectId: string): ProjectVersion[] {
  if (!mockVersionsByProject[projectId]) {
    mockVersionsByProject[projectId] = generateMockVersions(projectId);
  }
  return mockVersionsByProject[projectId];
}
const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export const versionService = {
  async getVersionHistory(projectId: string): Promise<ProjectVersion[]> {
    if (USE_MOCK) {
      await mockDelay(400);
      return getOrCreateMockVersions(projectId);
    }
    const response = await fetch(BASE_URL + '/projects/' + projectId + '/versions');
    if (!response.ok) {
      throw new Error('Failed to fetch version history: ' + response.status);
    }
    return response.json();
  },
  async restoreVersion(projectId: string, versionId: string): Promise<ProjectVersion> {
    if (USE_MOCK) {
      await mockDelay(600);
      const list = getOrCreateMockVersions(projectId);
      const target = list.find(v => v.id === versionId);
      if (!target) throw new Error('Version not found');
      const updated = list.map(v => ({
        ...v,
        isCurrent: v.id === versionId,
        isRestored: v.id === versionId ? true : v.isRestored,
      }));
      mockVersionsByProject[projectId] = updated;
      return updated.find(v => v.id === versionId)!;
    }
    const url = BASE_URL + '/projects/' + projectId + '/versions/' + versionId + '/restore';
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to restore version: ' + response.status);
    }
    return response.json();
  },
};