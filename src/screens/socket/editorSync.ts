/**
 * Editor sync bus — the glue between VideoProjectContext (which owns the local
 * timeline) and the STOMP client (owned by useProjectSocket).
 *
 * Live collaborative editing uses a shared-document model: on every local edit
 * the timeline snapshot is broadcast; peers adopt it if it's newer than theirs
 * (last-write-wins). Each app instance has a random ACTOR_ID so a client can
 * ignore its own echo.
 *
 * This module is a tiny singleton so the context doesn't need to import the
 * socket, and the socket doesn't need to import the context.
 */
import { useEffect, useState } from 'react';
import type { Client } from '@stomp/stompjs';
import type { VideoProject } from '../types';

/** Stable per-app-launch id used to suppress our own broadcast echo. */
export const ACTOR_ID =
  `actor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type EditEvent =
  | {
      type: 'full_state';
      actorId: string;
      projectId: string;
      project: VideoProject;
      actorName?: string;
      summary?: string;
    }
  | { type: 'hello'; actorId: string; projectId: string };

let client: Client | null = null;
let boundProjectId: string | null = null;
let localActorName = 'Teammate';

/** Set from the socket hook so broadcasts carry a human name. */
export function setLocalActorName(name: string) {
  if (name?.trim()) localActorName = name.trim();
}

/** Called by useProjectSocket once the STOMP client is connected. */
export function bindEditorSocket(nextClient: Client, projectId: string) {
  client = nextClient;
  boundProjectId = projectId;
}

export function unbindEditorSocket() {
  client = null;
  boundProjectId = null;
}

function canPublish(projectId: string): boolean {
  return !!client && client.connected && boundProjectId === projectId;
}

export type EditToast = {
  id: string;
  actorName: string;
  summary: string;
};

const editToastListeners = new Set<(toast: EditToast) => void>();

export function emitEditToast(toast: Omit<EditToast, 'id'>) {
  const full: EditToast = {
    id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...toast,
  };
  editToastListeners.forEach((fn) => fn(full));
}

/** React hook — latest teammate edit toast (auto-clears after a few seconds). */
export function useEditToasts(): EditToast | null {
  const [toast, setToast] = useState<EditToast | null>(null);

  useEffect(() => {
    const onToast = (next: EditToast) => {
      setToast(next);
    };
    editToastListeners.add(onToast);
    return () => {
      editToastListeners.delete(onToast);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast?.id]);

  return toast;
}

/** Broadcast the full timeline snapshot to every collaborator. */
export function publishState(project: VideoProject | null) {
  if (!project?.projectId || !canPublish(project.projectId)) return;
  const event: EditEvent = {
    type: 'full_state',
    actorId: ACTOR_ID,
    projectId: project.projectId,
    project,
    actorName: localActorName,
    summary: 'updated the timeline',
  };
  try {
    client!.publish({
      destination: `/app/project/${project.projectId}/edit`,
      body: JSON.stringify(event),
    });
  } catch (e) {
    console.log('[EditorSync] publishState failed', e);
  }
}

/** Ask peers to send their current timeline (used right after we connect). */
export function publishHello(projectId: string) {
  if (!canPublish(projectId)) return;
  const event: EditEvent = { type: 'hello', actorId: ACTOR_ID, projectId };
  try {
    client!.publish({
      destination: `/app/project/${projectId}/edit`,
      body: JSON.stringify(event),
    });
  } catch (e) {
    console.log('[EditorSync] publishHello failed', e);
  }
}

// ─── Live cursors ─────────────────────────────────────────────────────────────
// Figma-style presence on the timeline: each editor broadcasts their playhead
// position + selected clip + active tool a few times a second; peers render a
// colored marker. Cursors are ephemeral — peers drop any that go quiet (TTL).

export type LiveCursor = {
  actorId: string;
  userId: string;
  name: string;
  initials: string;
  color: string;
  /** Playhead position on the shared timeline (ms). */
  positionMs: number;
  selectedClipId?: string;
  /** Active tool label, e.g. "Text" / "Filter" — shown in the name tag. */
  tool?: string;
  /** Local receive time (ms epoch) — used for TTL pruning, set by receiver. */
  receivedAt?: number;
};

const CURSOR_TTL_MS = 6000;
const cursorListeners = new Set<(cursor: LiveCursor) => void>();

/** Socket layer calls this when a peer's cursor broadcast arrives. */
export function emitRemoteCursor(cursor: LiveCursor) {
  cursorListeners.forEach((fn) => fn(cursor));
}

/** Throttled by the caller; sends this editor's cursor to everyone. */
export function publishCursor(projectId: string, cursor: Omit<LiveCursor, 'actorId'>) {
  if (!canPublish(projectId)) return;
  try {
    client!.publish({
      destination: `/app/project/${projectId}/cursor`,
      body: JSON.stringify({ ...cursor, actorId: ACTOR_ID }),
    });
  } catch (e) {
    console.log('[EditorSync] publishCursor failed', e);
  }
}

/**
 * React hook for the editor: live map of remote cursors (own echo excluded by
 * the socket layer), pruned automatically when a peer goes quiet.
 */
export function useLiveCursors(): LiveCursor[] {
  const [cursors, setCursors] = useState<Record<string, LiveCursor>>({});

  useEffect(() => {
    const onCursor = (cursor: LiveCursor) => {
      setCursors((prev) => ({
        ...prev,
        [cursor.actorId]: { ...cursor, receivedAt: Date.now() },
      }));
    };
    cursorListeners.add(onCursor);

    const prune = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const alive = Object.entries(prev).filter(
          ([, c]) => now - (c.receivedAt ?? 0) < CURSOR_TTL_MS
        );
        if (alive.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(alive);
      });
    }, 2000);

    return () => {
      cursorListeners.delete(onCursor);
      clearInterval(prune);
    };
  }, []);

  return Object.values(cursors);
}
