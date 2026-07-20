/**
 * Project chat service — `/api/v1/projects/{projectId}/messages`.
 *
 * This is the real-time GROUP CHAT for a project (distinct from clip comments,
 * which live under /clips/{clipId}/comments and are pinned to a timecode).
 *
 * POST also triggers a WebSocket broadcast on the backend to
 * `/topic/project/{projectId}/messages`, so every connected member receives it
 * live. Sending over REST (instead of STOMP) keeps delivery reliable even when
 * the socket is momentarily reconnecting.
 */
import { CONFIG } from '../config';
import { ChatMessage } from '../types';
import { apiRequest } from './apiClient';
import { ApiMessage, mapMessageFromApi } from './mappers';

type PagedMessages = {
  items: ApiMessage[];
  page: number;
  limit: number;
  total: number;
};

export const messageService = {
  /** Load recent chat history (oldest-first) for a project. */
  getMessages: async (projectId: string, _token?: string): Promise<ChatMessage[]> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock messages disabled.');
    const page = await apiRequest<PagedMessages>(
      `/projects/${projectId}/messages?page=1&limit=100`
    );
    return (page.items || []).map(mapMessageFromApi);
  },

  /** Post a message; backend persists it and broadcasts to all members. */
  sendMessage: async (
    projectId: string,
    content: string,
    _token?: string
  ): Promise<ChatMessage> => {
    if (CONFIG.USE_MOCK) throw new Error('Mock messages disabled.');
    const data = await apiRequest<ApiMessage>(`/projects/${projectId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return mapMessageFromApi(data);
  },
};
