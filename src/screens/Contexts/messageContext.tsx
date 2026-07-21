/**
 * MessageContext — real-time project group chat.
 *
 * - `fetchMessages` loads history over REST.
 * - `sendMessage` POSTs (backend persists + broadcasts to every member).
 * - Optimistic local bubble appears immediately (WhatsApp-style), then swaps
 *   to the server id when POST returns / socket echoes.
 * - `receiveMessage` is called by the WebSocket layer (useProjectSocket).
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ChatMessage } from '../types';
import { messageService } from '../services/messageService';
import { useAuth } from './Authcontext';

dayjs.extend(relativeTime);

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

function withDisplayTime(message: ChatMessage): ChatMessage {
  const iso = message.createdAt || new Date().toISOString();
  return {
    ...message,
    createdAt: iso,
    timestamp: dayjs(iso).isValid()
      ? dayjs(iso).format('h:mm A')
      : message.timestamp || '',
  };
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
      setMessages((prev) => {
        const incoming = sortByCreatedAt(data.map(withDisplayTime));
        const pending = (prev[projectId] || []).filter((m) =>
          m.id.startsWith('temp-')
        );
        const merged = [...incoming];
        for (const p of pending) {
          if (!merged.some((m) => m.text === p.text && m.userId === p.userId)) {
            merged.push(p);
          }
        }
        return { ...prev, [projectId]: sortByCreatedAt(merged) };
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upsert = useCallback((projectId: string, message: ChatMessage) => {
    const normalized = withDisplayTime(message);
    setMessages((prev) => {
      const list = prev[projectId] || [];
      const withoutTemp = list.filter(
        (m) =>
          !(
            m.id.startsWith('temp-') &&
            m.userId === normalized.userId &&
            m.text === normalized.text
          )
      );
      if (withoutTemp.some((m) => m.id === normalized.id)) {
        return {
          ...prev,
          [projectId]: withoutTemp.map((m) =>
            m.id === normalized.id ? normalized : m
          ),
        };
      }
      return {
        ...prev,
        [projectId]: sortByCreatedAt([...withoutTemp, normalized]),
      };
    });
  }, []);

  const sendMessage = useCallback(
    async (projectId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !projectId || !user) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = withDisplayTime({
        id: tempId,
        projectId,
        userId: user.id,
        author: user.name,
        initials: user.initials,
        color: user.color,
        avatarUrl: user.avatarUrl,
        text: trimmed,
        timestamp: '',
        createdAt: new Date().toISOString(),
      });
      upsert(projectId, optimistic);

      try {
        const saved = await messageService.sendMessage(projectId, trimmed);
        upsert(projectId, saved);
      } catch (e: any) {
        setMessages((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] || []).filter((m) => m.id !== tempId),
        }));
        setError(e?.message ?? 'Failed to send message');
        throw e;
      }
    },
    [upsert, user]
  );

  const receiveMessage = useCallback(
    (projectId: string, message: ChatMessage) => {
      upsert(projectId, message);
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
