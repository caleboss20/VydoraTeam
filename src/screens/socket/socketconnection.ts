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
import { useVideoProject } from '../Contexts/VideoProjectContext';
import { useAuth } from '../Contexts/Authcontext';
import { ApiMessage, mapMessageFromApi } from '../services/mappers';
import {
  ACTOR_ID,
  EditEvent,
  LiveCursor,
  bindEditorSocket,
  emitRemoteCursor,
  unbindEditorSocket,
  publishHello,
  publishState,
} from './editorSync';

export function useProjectSocket(projectId: string) {
  const { token, user } = useAuth();
  const { fetchComments } = useComment();
  const { setOnlineMembers, setMemberOnline } = useMember();
  const { receiveMessage } = useMessage();
  const { applyRemoteProjectState, currentVideoProject } = useVideoProject();
  const clientRef = useRef<Client | null>(null);

  // Keep the latest context callbacks/state in a ref so ordinary re-renders
  // never tear down and rebuild the socket (only projectId / auth changes should).
  const handlersRef = useRef({
    fetchComments,
    setOnlineMembers,
    setMemberOnline,
    receiveMessage,
    applyRemoteProjectState,
    currentVideoProject,
    userId: user?.id as string | undefined,
  });
  handlersRef.current = {
    fetchComments,
    setOnlineMembers,
    setMemberOnline,
    receiveMessage,
    applyRemoteProjectState,
    currentVideoProject,
    userId: user?.id,
  };

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
            const raw = JSON.parse(msg.body);
            const ids: string[] = Array.isArray(raw)
              ? raw.map((id) => String(id))
              : Array.isArray(raw?.userIds)
                ? raw.userIds.map((id: unknown) => String(id))
                : [];
            handlersRef.current.setOnlineMembers(projectId, ids);
            // Keep yourself online even if the first broadcast raced without you.
            const myId = handlersRef.current.userId;
            if (myId && !ids.includes(myId)) {
              handlersRef.current.setMemberOnline(projectId, myId, true);
            }
          } catch (e) {
            console.log('[Socket] bad presence payload', e);
          }
        });

        // Optimistic self-presence: the subscribe broadcast can race ahead of
        // the client subscription (or arrive before members are loaded). Mark
        // this user online locally so the panel never shows "0 online" for you.
        const myId = handlersRef.current.userId;
        if (myId) {
          handlersRef.current.setMemberOnline(projectId, myId, true);
        }

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

        // Live collaborative timeline editing — adopt peers' snapshots.
        client.subscribe(`/topic/project/${projectId}/edits`, (msg: IMessage) => {
          try {
            const evt = JSON.parse(msg.body) as EditEvent;
            if (evt.actorId === ACTOR_ID) return; // ignore our own echo

            if (evt.type === 'full_state' && evt.project) {
              const mine = handlersRef.current.currentVideoProject;
              const adopt =
                !mine ||
                mine.projectId !== projectId ||
                (evt.project.updatedAt ?? '') >= (mine.updatedAt ?? '');
              if (adopt) handlersRef.current.applyRemoteProjectState(evt.project);
            } else if (evt.type === 'hello') {
              // A member just joined — send them our current timeline.
              const mine = handlersRef.current.currentVideoProject;
              if (mine && mine.projectId === projectId) publishState(mine);
            }
          } catch (e) {
            console.log('[Socket] bad edit payload', e);
          }
        });

        // Live cursors — peers' playhead positions on the timeline.
        client.subscribe(`/topic/project/${projectId}/cursors`, (msg: IMessage) => {
          try {
            const cursor = JSON.parse(msg.body) as LiveCursor;
            if (cursor.actorId === ACTOR_ID) return; // ignore our own echo
            emitRemoteCursor(cursor);
          } catch (e) {
            console.log('[Socket] bad cursor payload', e);
          }
        });

        // Let the editor context publish through this client, then ask peers
        // to hydrate us with the current timeline.
        bindEditorSocket(client, projectId);
        publishHello(projectId);

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
      unbindEditorSocket();
      client.deactivate().catch(() => {});
      clientRef.current = null;
    };
  }, [projectId, token]);

  return clientRef;
}
