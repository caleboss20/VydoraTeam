import { CONFIG } from '../config';
import { Comment } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
// Base comment "template" — projectId/clipId get stamped in dynamically per
// request, so mocks work regardless of what project/clip IDs are generated
// at runtime (mirrors the membersServvice.ts fix).
const MOCK_COMMENT_TEMPLATE: Omit<Comment, 'projectId' | 'clipId'>[] = [
  {
    id: '1',
    authorId: '2',
    author: 'Jesse Sarfo',
    initials: 'JS',
    color: '#4CAF50',
    text: 'The transition at 0:14 feels abrupt, can we smooth it out?',
    timestamp: '2h ago',
  },
  {
    id: '2',
    authorId: '3',
    author: 'Ama Owusu',
    initials: 'AO',
    color: '#E91E63',
    text: 'Color grading on the main segment looks great! 🔥',
    timestamp: '5h ago',
  },
  {
    id: '3',
    authorId: '4',
    author: 'Kofi Mensah',
    initials: 'KM',
    color: '#2196F3',
    text: 'Should the outro have the logo watermark?',
    timestamp: '1d ago',
  },
  {
    id: '4',
    authorId: '1',
    author: 'Caleb Dwamena',
    initials: 'CD',
    color: '#F5C518',
    text: 'Final render is scheduled for Friday.',
    timestamp: '2d ago',
  },
];
// Keeps a per-project copy so added/deleted comments persist correctly
// across calls instead of resetting on every getComments() call.
let MOCK_COMMENTS_BY_PROJECT: { [projectId: string]: Comment[] } = {};
function getOrCreateMockComments(projectId: string, clipIds: string[]): Comment[] {
  if (!MOCK_COMMENTS_BY_PROJECT[projectId]) {
    // Spread the 4 template comments across whatever clip IDs exist so far —
    // falls back to a synthetic clip id if none provided yet.
    const fallbackClipIds = clipIds.length > 0 ? clipIds : ['clip-1', 'clip-2', 'clip-3', 'clip-1'];
    MOCK_COMMENTS_BY_PROJECT[projectId] = MOCK_COMMENT_TEMPLATE.map((c, i) => ({
      ...c,
      projectId,
      clipId: fallbackClipIds[i % fallbackClipIds.length],
    }));
  }
  return MOCK_COMMENTS_BY_PROJECT[projectId];
}
// ─── Service ─────────────────────────────────────────────────────────────────
export const commentService = {
  getComments: async (projectId: string, token: string): Promise<Comment[]> => {
    if (CONFIG.USE_MOCK) {
      return getOrCreateMockComments(projectId, []);
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/comments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  },
  getCommentsByClip: async (
    projectId: string,
    clipId: string,
    token: string
  ): Promise<Comment[]> => {
    if (CONFIG.USE_MOCK) {
      const list = getOrCreateMockComments(projectId, [clipId]);
      return list.filter((c) => c.clipId === clipId);
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/clips/${clipId}/comments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Failed to fetch clip comments');
    return res.json();
  },
  addComment: async (
    projectId: string,
    clipId: string,
    text: string,
    token: string
  ): Promise<Comment> => {
    if (CONFIG.USE_MOCK) {
      const newComment: Comment = {
        id: Date.now().toString(),
        projectId,
        clipId,
        authorId: '1',
        author: 'Caleb Dwamena',
        initials: 'CD',
        color: '#F5C518',
        text,
        timestamp: 'Just now',
      };
      const list = getOrCreateMockComments(projectId, [clipId]);
      list.unshift(newComment);
      return newComment;
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/clips/${clipId}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      }
    );
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
  },
  deleteComment: async (
    projectId: string,
    commentId: string,
    token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) {
      const list = MOCK_COMMENTS_BY_PROJECT[projectId];
      if (list) {
        MOCK_COMMENTS_BY_PROJECT[projectId] = list.filter((c) => c.id !== commentId);
      }
      return;
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error('Failed to delete comment');
  },
};