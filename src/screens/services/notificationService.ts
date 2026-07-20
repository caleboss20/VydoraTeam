/**
 * Notification service — `GET/PATCH/DELETE /api/v1/notifications`.
 *
 * Only returns rows the backend actually created (invite, comment, clip, role).
 * Never invents placeholder activity.
 */
import { CONFIG } from '../config';
import { Notification, NotificationType } from '../types';
import { apiRequest } from './apiClient';

type ApiNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  projectId?: string | null;
  projectName?: string | null;
};

type ItemsResponse = { items: ApiNotification[] };

const VALID_TYPES: NotificationType[] = [
  'invite',
  'invite_approval',
  'comment',
  'clip_upload',
  'role_change',
];

function mapNotification(n: ApiNotification): Notification {
  const type = (VALID_TYPES.includes(n.type as NotificationType)
    ? n.type
    : 'comment') as NotificationType;
  return {
    id: n.id,
    type,
    title: n.title,
    message: n.message,
    read: !!n.read,
    createdAt: n.createdAt,
    projectId: n.projectId || undefined,
    projectName: n.projectName || undefined,
  };
}

export const notificationService = {
  getNotifications: async (_token: string): Promise<Notification[]> => {
    if (CONFIG.USE_MOCK) return [];
    const data = await apiRequest<ItemsResponse>('/notifications');
    return (data.items || []).map(mapNotification);
  },

  markAsRead: async (notificationId: string, _token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async (_token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    await apiRequest('/notifications/read-all', { method: 'POST' });
  },

  deleteNotification: async (
    notificationId: string,
    _token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    await apiRequest(`/notifications/${notificationId}`, { method: 'DELETE' });
  },

  clearAll: async (_token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    await apiRequest('/notifications', { method: 'DELETE' });
  },
};
