//Comment service//
import { CONFIG } from '../config';
import { Comment } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
let MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    projectId: '1',
    clipId: '1',
    authorId: '2',
    author: 'Jesse Sarfo',
    initials: 'JS',
    color: '#4CAF50',
    text: 'The transition at 0:14 feels abrupt, can we smooth it out?',
    timestamp: '2h ago',
  },
  {
    id: '2',
    projectId: '1',
    clipId: '2',
    authorId: '3',
    author: 'Ama Owusu',
    initials: 'AO',
    color: '#E91E63',
    text: 'Color grading on the main segment looks great! 🔥',
    timestamp: '5h ago',
  },
  {
    id: '3',
    projectId: '1',
    clipId: '3',
    authorId: '4',
    author: 'Kofi Mensah',
    initials: 'KM',
    color: '#2196F3',
    text: 'Should the outro have the logo watermark?',
    timestamp: '1d ago',
  },
  {
    id: '4',
    projectId: '1',
    clipId: '1',
    authorId: '1',
    author: 'Caleb Dwamena',
    initials: 'CD',
    color: '#F5C518',
    text: 'Final render is scheduled for Friday.',
    timestamp: '2d ago',
  },
];
// ─── Service ─────────────────────────────────────────────────────────────────
export const commentService = {
  // get all comments for a project
  getComments: async (projectId: string, token: string): Promise<Comment[]> => {
    if (CONFIG.USE_MOCK) {
      return MOCK_COMMENTS.filter(c => c.projectId === projectId);
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/comments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  },
  // get comments for a specific clip
  getCommentsByClip: async (
    projectId: string,
    clipId: string,
    token: string
  ): Promise<Comment[]> => {
    if (CONFIG.USE_MOCK) {
      return MOCK_COMMENTS.filter(
        c => c.projectId === projectId && c.clipId === clipId
      );
    }
    const res = await fetch(
      `${CONFIG.API_BASE}/projects/${projectId}/clips/${clipId}/comments`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Failed to fetch clip comments');
    return res.json();
  },
  // add a comment to a clip
  addComment: async (
    projectId: string,
    clipId: string,
    text: string,
    token: string
  ): Promise<Comment> => {
    if (CONFIG.USE_MOCK) {
      return {
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
  // delete a comment
  deleteComment: async (
    projectId: string,
    commentId: string,
    token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
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