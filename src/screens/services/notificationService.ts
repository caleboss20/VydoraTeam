//For notification//
import { CONFIG } from '../config';
import { Notification } from '../types';
// ─── Mock Data ───────────────────────────────────────────────────────────────
let MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'invite',
    title: 'Project Invitation',
    message: 'Jesse Sarfo invited you to Summer campaign',
    read: false,
    createdAt: '2h ago',
    projectId: '1',
  },
  {
    id: '2',
    type: 'comment',
    title: 'New Comment',
    message: 'Ama Owusu commented on Intro clip',
    read: false,
    createdAt: '5h ago',
    projectId: '1',
  },
  {
    id: '3',
    type: 'clip_upload',
    title: 'New Clip Uploaded',
    message: 'Kofi Mensah uploaded B-Roll montage',
    read: true,
    createdAt: '1d ago',
    projectId: '1',
  },
  {
    id: '4',
    type: 'role_change',
    title: 'Role Updated',
    message: 'Your role in Brand video was changed to Editor',
    read: true,
    createdAt: '2d ago',
    projectId: '3',
  },
];
// ─── Service ─────────────────────────────────────────────────────────────────
export const notificationService = {
  // get all notifications for current user
  getNotifications: async (token: string): Promise<Notification[]> => {
    if (CONFIG.USE_MOCK) return MOCK_NOTIFICATIONS;
    const res = await fetch(`${CONFIG.API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },
  // mark single notification as read
  markAsRead: async (
    notificationId: string,
    token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    const res = await fetch(
      `${CONFIG.API_BASE}/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error('Failed to mark as read');
  },
  // mark all notifications as read
  markAllAsRead: async (token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    const res = await fetch(`${CONFIG.API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to mark all as read');
  },
  // delete a notification
  deleteNotification: async (
    notificationId: string,
    token: string
  ): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    const res = await fetch(
      `${CONFIG.API_BASE}/notifications/${notificationId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error('Failed to delete notification');
  },
  // clear all notifications
  clearAll: async (token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    const res = await fetch(`${CONFIG.API_BASE}/notifications`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to clear notifications');
  },
};