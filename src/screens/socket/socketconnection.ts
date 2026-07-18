/**
 * Project WebSocket hook (STOMP over SockJS) — stubbed for the next pass.
 *
 * Backend (already live on vydora-backend):
 *   Endpoint:  CONFIG.WS_BASE  →  http://localhost:8080/ws
 *   Auth:      CONNECT header  Authorization: Bearer <accessToken>
 *   Subscribe: /topic/project/{id}/comments|members|presence
 *              /user/queue/notifications
 *   Publish:   /app/project/{id}/comment  { clipId, text, timestampSeconds }
 *
 * Not implemented on the backend yet (leave commented):
 *   /topic/project/{id}/clips|edits  — collaborative timeline sync (editor pass)
 *
 * Call this from ProjectDetail / Editor once SockJS + @stomp/stompjs are added.
 * Do not change UI while enabling — only mount the hook and update contexts.
 */
import { useEffect } from 'react';
import { useComment } from '../Contexts/commentContext';
import { useMember } from '../Contexts/memberContext';
import { useClip } from '../Contexts/clipContext';
import { useNotification } from '../Contexts/notificatinContext';

export function useProjectSocket(projectId: string) {
  const { fetchComments } = useComment();
  const { fetchMembers, setMemberOnline } = useMember();
  const { fetchClips } = useClip();
  const { fetchNotifications } = useNotification();
  useEffect(() => {
    if (!projectId) return;
    // ─────────────────────────────────────────────────────────────────────
    // WEBSOCKET CONNECTION
    // Connects this phone to Spring Boot's WebSocket server.
    // Once connected, this phone joins the "room" for this specific project.
    // Every member who opens this project is in the same room.
    // ─────────────────────────────────────────────────────────────────────
    // const socket = new SockJS(`${CONFIG.WS_BASE}`);
    // const stompClient = Stomp.over(socket);
    // stompClient.connect({}, () => {
      // ───────────────────────────────────────────────────────────────────
      // 1. COMMENTS — Real-time comments
      // When ANY member adds a comment on any clip inside this project,
      // Spring Boot broadcasts it here. We refetch all comments so the
      // new comment appears instantly on everyone's screen without refreshing.
      // Demo: Person A types comment → Person B sees it appear live.
      // ───────────────────────────────────────────────────────────────────
      // stompClient.subscribe(`/topic/project/${projectId}/comments`, () => {
      //   fetchComments(projectId);
      // });
      // ───────────────────────────────────────────────────────────────────
      // 2. CLIPS — Real-time clip uploads
      // When ANY member uploads a new clip to this project,
      // Spring Boot broadcasts it here. The clip list updates live
      // for everyone without anyone needing to refresh.
      // Demo: Person A uploads clip → Person B sees it in clip list instantly.
      // ───────────────────────────────────────────────────────────────────
      // stompClient.subscribe(`/topic/project/${projectId}/clips`, () => {
      //   fetchClips(projectId);
      // });
      // ───────────────────────────────────────────────────────────────────
      // 3. MEMBERS — Real-time member changes
      // When Owner invites a new member OR removes a member OR changes
      // someone's role, Spring Boot broadcasts it here.
      // Everyone's member list updates live.
      // Demo: Owner invites Person B → Person B's app gets the project
      // added to their list instantly.
      // ───────────────────────────────────────────────────────────────────
      // stompClient.subscribe(`/topic/project/${projectId}/members`, () => {
      //   fetchMembers(projectId);
      // });
      // ───────────────────────────────────────────────────────────────────
      // 4. PRESENCE — Who is online right now
      // When a member opens this project screen, they broadcast "I'm here".
      // When they leave, they broadcast "I'm gone".
      // This powers the green online dot you see next to member avatars.
      // Demo: Person A opens project → Person B sees green dot appear
      // next to Person A's avatar in real time.
      // ───────────────────────────────────────────────────────────────────
      // stompClient.subscribe(`/topic/project/${projectId}/presence`, (msg) => {
      //   const { userId, online } = JSON.parse(msg.body);
      //   setMemberOnline(projectId, userId, online);
      // });
      // ───────────────────────────────────────────────────────────────────
      // 5. COLLABORATIVE EDITING — Real-time timeline/clip edits
      // When Person A trims, splits, rotates or adjusts a clip,
      // Spring Boot broadcasts the edit operation here.
      // Person B's timeline updates live to reflect the change.
      // This is what makes it a true collaborative video editor.
      // Note: This is the most complex feature — each edit is an
      // "operation" (like trim start=00:05, end=00:18) that gets
      // applied to everyone's timeline in the same order.
      // Demo: Person A trims clip → Person B sees timeline update live.
      // ───────────────────────────────────────────────────────────────────
      // stompClient.subscribe(`/topic/project/${projectId}/edits`, (msg) => {
      //   const edit = JSON.parse(msg.body);
      //   // applyEdit(projectId, edit) ← will be handled by EditorContext
      // });
      // ───────────────────────────────────────────────────────────────────
      // 6. NOTIFICATIONS — Real-time notification delivery
      // When anything happens in the project — new comment, new member,
      // clip upload, role change — Spring Boot sends a notification here.
      // The notification bell updates live without polling.
      // Demo: Person A comments → Person B's notification bell
      // shows red badge instantly.
      // ───────────────────────────────────────────────────────────────────
      // stompClient.subscribe(`/topic/user/notifications`, () => {
      //   fetchNotifications();
      // });
      // ───────────────────────────────────────────────────────────────────
      // BROADCAST — Tell everyone this user is now online
      // As soon as connection is established, we tell Spring Boot
      // "this user is now in this project". Spring Boot then tells
      // everyone else to show the green dot next to this user's avatar.
      // ───────────────────────────────────────────────────────────────────
      // stompClient.send(
      //   `/app/project/${projectId}/presence`,
      //   {},
      //   JSON.stringify({ online: true })
      // );
    // });
    // ─────────────────────────────────────────────────────────────────────
    // CLEANUP — When user leaves the project screen
    // We tell Spring Boot this user is offline, so their green dot
    // disappears for everyone else. Then we disconnect cleanly.
    // ─────────────────────────────────────────────────────────────────────
    // return () => {
    //   stompClient.send(
    //     `/app/project/${projectId}/presence`,
    //     {},
    //     JSON.stringify({ online: false })
    //   );
    //   stompClient.disconnect();
    // };
    // Hook is intentionally a no-op until SockJS client packages are installed
    // and CONNECT auth is wired. REST paths already work without this.
    console.log(`[Socket] Stub active for project ${projectId} — enable STOMP in the collab pass`);
  }, [projectId]);
}