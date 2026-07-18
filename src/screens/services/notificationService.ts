/**
 * Notification service.
 *
 * The Spring Boot API does not expose REST `/notifications` endpoints yet.
 * Invite alerts arrive over WebSocket at `/user/queue/notifications` instead.
 *
 * Until a notifications table/API exists, these methods return an empty list
 * (or no-op) so ActivityScreen stays empty rather than 404’ing. When WS is
 * wired, NotificationContext can push live InviteNotificationDTO events here.
 */
import { CONFIG } from '../config';
import { Notification } from '../types';

export const notificationService = {
  getNotifications: async (_token: string): Promise<Notification[]> => {
    if (CONFIG.USE_MOCK) {
      return [];
    }
    // No REST resource yet — empty feed is intentional.
    return [];
  },

  markAsRead: async (_notificationId: string, _token: string): Promise<void> => {
    // No-op until backend adds notification persistence.
  },

  markAllAsRead: async (_token: string): Promise<void> => {},

  deleteNotification: async (
    _notificationId: string,
    _token: string
  ): Promise<void> => {},

  clearAll: async (_token: string): Promise<void> => {},
};
