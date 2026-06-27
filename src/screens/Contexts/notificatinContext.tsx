//For notifications//
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from './Authcontext';
// ─── Context Type ─────────────────────────────────────────────────────────────
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // auto fetch when token is available
  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);
  // derived unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationService.getNotifications(token!);
      setNotifications(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId, token!);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (e: any) {
      setError(e.message);
    }
  };
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(token!);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId, token!);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const clearAll = async () => {
    try {
      await notificationService.clearAll(token!);
      setNotifications([]);
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      error,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
}