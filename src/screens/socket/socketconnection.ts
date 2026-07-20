/**
 * Project WebSocket hook (STOMP over a raw WebSocket).
 *
 * Backend (vydora-backend):
 *   Broker URL: CONFIG.WS_BROKER_URL  →  ws://<host>:8080/ws-native
 *   Auth:       CONNECT header  Authorization: Bearer <accessToken>
 *   Subscribe:  /topic/project/{id}/messages   (project group chat)
 *               /topic/project/{id}/presence   (online userIds — subscribing
 *                                               also marks THIS user online)
 *               /topic/project/{id}/comments   (clip comments)
 *   Publish:    /app/project/{id}/message   { content }   (we use REST instead)
 *
 * Mount this from the Editor once per open project. It keeps presence + chat +
 * comments live and tears the connection down on unmount. UI is unchanged —
 * this only feeds the existing contexts.
 */
import { useEffect, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { useComment } from '../Contexts/commentContext';
import { useMember } from '../Contexts/memberContext';
import { useMessage } from '../Contexts/messageContext';
import { useAuth } from '../Contexts/Authcontext';
import { ApiMessage, mapMessageFromApi } from '../services/mappers';

export function useProjectSocket(projectId: string) {
  const { token } = useAuth();
  const { fetchComments } = useComment();
  const { setOnlineMembers } = useMember();
  const { receiveMessage } = useMessage();
  const clientRef = useRef<Client | null>(null);

  // Keep the latest context callbacks in a ref so ordinary re-renders never
  // tear down and rebuild the socket (only projectId / auth changes should).
  const handlersRef = useRef({ fetchComments, setOnlineMembers, receiveMessage });
  handlersRef.current = { fetchComments, setOnlineMembers, receiveMessage };

  useEffect(() => {
    if (!projectId || !token) return;

    let cancelled = false;

    const client = new Client({
      brokerURL: CONFIG.WS_BROKER_URL,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Always send the freshest token (apiClient rotates it on refresh).
      beforeConnect: async () => {
        const stored = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.TOKEN);
        client.connectHeaders = { Authorization: `Bearer ${stored ?? token}` };
      },
      onConnect: () => {
        if (cancelled) return;

        // Presence — server pushes the full set of online userIds. Subscribing
        // to this destination is also what registers THIS user as online.
        client.subscribe(`/topic/project/${projectId}/presence`, (msg: IMessage) => {
          try {
            const ids = JSON.parse(msg.body) as string[];
            handlersRef.current.setOnlineMembers(projectId, ids);
          } catch (e) {
            console.log('[Socket] bad presence payload', e);
          }
        });

        // Project group chat
        client.subscribe(`/topic/project/${projectId}/messages`, (msg: IMessage) => {
          try {
            const dto = JSON.parse(msg.body) as ApiMessage;
            handlersRef.current.receiveMessage(projectId, mapMessageFromApi(dto));
          } catch (e) {
            console.log('[Socket] bad message payload', e);
          }
        });

        // Clip comments — refetch so existing comment views stay live.
        client.subscribe(`/topic/project/${projectId}/comments`, () => {
          handlersRef.current.fetchComments(projectId);
        });

        console.log(`[Socket] connected to project ${projectId}`);
      },
      onStompError: (frame) =>
        console.log('[Socket] STOMP error', frame.headers['message'], frame.body),
      onWebSocketError: (e: any) =>
        console.log('[Socket] WebSocket error', e?.message ?? e),
    });

    clientRef.current = client;
    client.activate();

    return () => {
      cancelled = true;
      client.deactivate().catch(() => {});
      clientRef.current = null;
    };
  }, [projectId, token]);

  return clientRef;
}
