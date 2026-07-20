/**
 * Comment service — `/api/v1/clips/{clipId}/comments` and `/comments/{id}`.
 *
 * CreateCommentRequest: { text, timestampSeconds }
 * There is no project-wide comments list on the backend — getComments(projectId)
 * loads each project clip, then fetches that clip’s comments and flattens them
 * so ProjectDetail’s existing “all comments” view keeps working.
 */
import { CONFIG } from '../config';
import { Comment } from '../types';
import { apiRequest } from './apiClient';
import { ApiComment, ApiClip, mapCommentFromApi } from './mappers';

type PagedComments = {
  items: ApiComment[];
  page: number;
  limit: number;
  total: number;
};
type PagedClips = { items: ApiClip[]; page: number; limit: number; total: number };

export const commentService = {
  /**
   * Aggregate comments across every clip in the project.
   * Used by ProjectDetail / commentContext.fetchComments(projectId).
   */
  getComments: async (projectId: string, _token: string): Promise<Comment[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock comments disabled.');

    const clipsPage = await apiRequest<PagedClips>(
      `/projects/${projectId}/clips?page=1&limit=100`
    );
    const clips = clipsPage.items || [];
    if (clips.length === 0) return [];

    const nested = await Promise.all(
      clips.map(async (clip) => {
        const page = await apiRequest<PagedComments>(
          `/clips/${clip.id}/comments?page=1&limit=100`
        );
        return (page.items || []).map(mapCommentFromApi);
      })
    );
    return nested.flat().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },

  getCommentsByClip: async (
    _projectId: string,
    clipId: string,
    _token: string
  ): Promise<Comment[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock comments disabled.');
    const page = await apiRequest<PagedComments>(
      `/clips/${clipId}/comments?page=1&limit=100`
    );
    return (page.items || []).map(mapCommentFromApi);
  },

  /**
   * Post a comment on a clip at an optional playhead time (seconds),
   * optionally pinned to a canvas position (0–1).
   */
  addComment: async (
    _projectId: string,
    clipId: string,
    text: string,
    _token: string,
    timestampSeconds = 0,
    canvas?: { x: number; y: number } | null
  ): Promise<Comment> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock comments disabled.');
    const body: Record<string, unknown> = { text, timestampSeconds };
    if (canvas) {
      body.canvasX = canvas.x;
      body.canvasY = canvas.y;
    }
    const data = await apiRequest<ApiComment>(`/clips/${clipId}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return mapCommentFromApi(data);
  },

  resolveComment: async (
    commentId: string,
    resolved: boolean,
    _token: string
  ): Promise<Comment> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock comments disabled.');
    const data = await apiRequest<ApiComment>(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ resolved }),
    });
    return mapCommentFromApi(data);
  },

  deleteComment: async (
    _projectId: string,
    commentId: string,
    _token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock comments disabled.');
    await apiRequest<void>(`/comments/${commentId}`, { method: 'DELETE' });
  },
};
