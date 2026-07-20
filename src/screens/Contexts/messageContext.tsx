/**
 * MessageContext — real-time project group chat.
 *
 * - `fetchMessages` loads history over REST.
 * - `sendMessage` POSTs (backend persists + broadcasts to every member).
 * - `receiveMessage` is called by the WebSocket layer (useProjectSocket) when a
 *   broadcast arrives; it upserts by id so a sender never double-renders their
 *   own message (POST response + broadcast share the same id).
 * - Unread tracking powers the badge on the editor header icon. Messages from
 *   other users increment the count until `markProjectRead` is called (when the
 *   chat panel opens).
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import dayjs from 'dayjs';
import { ChatMessage } from '../types';
import { messageService } from '../services/messageService';
import { useAuth } from './Authcontext';

interface MessageContextType {
  messages: { [projectId: string]: ChatMessage[] };
  unreadByProject: { [projectId: string]: number };
  isLoading: boolean;
  error: string | null;
  fetchMessages: (projectId: string) => Promise<void>;
  sendMessage: (projectId: string, text: string) => Promise<void>;
  /** Called by the socket layer when a broadcast message arrives. */
  receiveMessage: (projectId: string, message: ChatMessage) => void;
  getMessagesForProject: (projectId: string) => ChatMessage[];
  markProjectRead: (projectId: string) => void;
  getUnreadForProject: (projectId: string) => number;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

function sortByCreatedAt(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  );
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{ [projectId: string]: ChatMessage[] }>({});
  const [unreadByProject, setUnreadByProject] = useState<{ [projectId: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async (projectId: string) => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await messageService.getMessages(projectId);
      setMessages((prev) => ({ ...prev, [projectId]: sortByCreatedAt(data) }));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upsert a single message by id (dedupes POST-response vs. socket broadcast).
  const upsert = useCallback((projectId: string, message: ChatMessage) => {
    setMessages((prev) => {
      const list = prev[projectId] || [];
      if (list.some((m) => m.id === message.id)) {
        return {
          ...prev,
          [projectId]: list.map((m) => (m.id === message.id ? message : m)),
        };
      }
      return { ...prev, [projectId]: sortByCreatedAt([...list, message]) };
    });
  }, []);

  const sendMessage = useCallback(async (projectId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !projectId) return;
    try {
      const saved = await messageService.sendMessage(projectId, trimmed);
      upsert(projectId, saved);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send message');
      throw e;
    }
  }, [upsert]);

  const receiveMessage = useCallback(
    (projectId: string, message: ChatMessage) => {
      const normalized: ChatMessage = {
        ...message,
        timestamp: message.timestamp || dayjs(message.createdAt).fromNow(),
      };
      upsert(projectId, normalized);
      // Count as unread only if it's from someone else.
      if (message.userId !== user?.id) {
        setUnreadByProject((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] || 0) + 1,
        }));
      }
    },
    [upsert, user?.id]
  );

  const getMessagesForProject = useCallback(
    (projectId: string): ChatMessage[] => messages[projectId] || [],
    [messages]
  );

  const markProjectRead = useCallback((projectId: string) => {
    setUnreadByProject((prev) => {
      if (!prev[projectId]) return prev;
      return { ...prev, [projectId]: 0 };
    });
  }, []);

  const getUnreadForProject = useCallback(
    (projectId: string): number => unreadByProject[projectId] || 0,
    [unreadByProject]
  );

  return (
    <MessageContext.Provider
      value={{
        messages,
        unreadByProject,
        isLoading,
        error,
        fetchMessages,
        sendMessage,
        receiveMessage,
        getMessagesForProject,
        markProjectRead,
        getUnreadForProject,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessage() {
  const context = useContext(MessageContext);
  if (!context) throw new Error('useMessage must be used within MessageProvider');
  return context;
}
