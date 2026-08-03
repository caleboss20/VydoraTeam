# Vydora — Product, Architecture & Business Brief

**Audience:** Investors · Lecturers · Colleagues · Partners  
**Product:** Mobile-first collaborative video editor with AI assist and live team co-editing  
**Brand:** Black + gold (`#F5C518`) · Domains: `vydora.io` / `vydora.app`  
**Version of this doc:** July 2026 (aligned with current codebase)

---

## 1. One-line pitch

**Vydora is CapCut for teams** — a mobile video editor that combines consumer-grade AI editing with *live collaborative timelines*, guest review links, and role-based project workflows so creators and student/creator teams can go from raw clip to shared export without leaving the phone.

---

## 2. Executive summary

Short-form video is how brands, students, creators, and campuses communicate — but the tools people use are split:

| Need | Typical tool | Gap |
|------|--------------|-----|
| Fast AI edits on phone | CapCut, VN, InShot | Built for *solo* creators; weak real-time team editing |
| Team review & approval | Frame.io, Filestage | Desktop-first, expensive, not an editor |
| Live co-edit | Rare on mobile | Almost none combine editor + live presence + chat |
| Guest feedback | Email / WhatsApp | No timecode comments, no project context |

**Vydora closes that gap:** one mobile app where you edit like CapCut *and* collaborate like a lightweight Frame.io — with AI tools (captions, silence/filler rough-cut, shorts suggest, beats, auto-reframe) and cloud export baked in.

We are building for:

1. **Creator teams** (2–10 people shipping Reels/TikTok/Shorts weekly)  
2. **Students & campus clubs** (group projects, events, summit intros)  
3. **Small agencies / freelancers** who need client guest review without enterprise software  

---

## 3. The problem (why this matters)

1. **Editing is social, tools are solo.** Most CapCut-class apps assume one person owns the timeline. Real projects involve shooters, editors, captioners, and approvers.
2. **Feedback is broken.** Stakeholders reply in WhatsApp with “change the part at 0:42” — no pin on the frame, no version history, no locked final.
3. **AI is bolted on, not team-aware.** Auto-captions help one editor; they don’t help a Viewer request Editor access, or a client leave timestamped notes without an account.
4. **Desktop collab doesn’t travel.** Students and creators work on phones first. Desktop-only review tools don’t match how they already create.

**Insight:** The next winning editor isn’t “more filters.” It’s **shared editing + AI speed + mobile-native workflow**.

---

## 4. Solution — what Vydora is

Vydora is a **mobile-first collaborative video production workspace**:

- **Edit** — CapCut-style timeline, tools, AI assist, publish presets  
- **Collaborate** — live presence, cursor/playhead sync, project chat, role upgrades  
- **Review** — guest links (no signup) with timestamped comments  
- **Ship** — cloud FFmpeg export (720p / 1080p / 4K), version history, Final Locked status  
- **Grow** — referral codes → Pro trial; freemium path toward paid plans  

**Brand personality:** dark cinematic UI, gold accent, “make a reel” energy — premium but approachable for students and creators.

---

## 5. Product surface (what exists today)

### 5.1 Core editing

- Multi-clip timeline: split, duplicate, delete, reorder / assemble  
- Preview + fullscreen playback  
- Beginner-friendly toolbar (Captions, Assemble, Filter, Text, Split) + searchable “More tools” catalog  
- Looks: filters, effects, animation, color grade, curves/LUT, canvas, crop, stabilize, auto-reframe  
- Text & graphics: captions, title cards (“Sheet”), flyer, stickers, overlay / PiP + masks  
- Advanced: keyframes, compound clips, adjustment layers, speed curves, transitions, multi-cam, motion track, rough cut  
- Audio: music library + weekly drop, SFX, mixer (duck / denoise / EQ), voiceover, beats  
- Publish presets: TikTok / Reels / Shorts / square / YouTube  

### 5.2 AI suite (wired to backend `/api/v1/ai`)

| Feature | What it does |
|---------|----------------|
| **Auto captions** | Speech → timed segments / words / SRT; speaker-colored turns |
| **Silence detect** | FFmpeg-based keep/cut ranges for rough cut |
| **Filler detect** | Whisper-backed “um/uh” style hits + keep windows |
| **Shorts suggest** | Heuristic hooks for 15–60s cuts |
| **Beat detect** | Onset/energy peaks for music-synced edits |
| **Auto-reframe** | Motion/edge analysis → 9:16 keyframes |
| **Motion track** | Frame analysis for tracking overlays |
| **Multi-cam sync** | Audio correlation offset between cameras |

Providers: Gemini, Groq Whisper, OpenAI Whisper (optional keys) + local FFmpeg where no key is needed.

### 5.3 Collaboration

- Project roles: **Owner / Editor / Viewer**  
- Email invites + deep links (`vydora://invite`)  
- Invite-request approval (Zoom-style) when Editors invite  
- **Role upgrade requests** (Viewer → Editor) with live Owner admit  
- In-editor **Collaboration Desk**: presence, chat, activity  
- Timecode + canvas-pin comments  
- **Realtime STOMP**: timeline sync (LWW), live cursors/playheads, comments, messages, presence, user notifications  

### 5.4 Guest review (differentiator)

- Create / list / revoke review links  
- Guests watch + leave timestamped comments **without an account**  
- Links: `vydora://review/:token`, `https://vydora.io/review/:token`  

### 5.5 Projects, export, versions

- Project CRUD; statuses: Active / Archived / Draft / **FinalLocked**  
- Visibility: Private / Team / Public  
- Cloud export jobs: MP4 / MOV / WebM × 720p / 1080p / 4K with progress polling  
- Version history: snapshot + restore  
- Media library; project covers from thumbnails / first frames  

### 5.6 Account, growth, UX

- Email/password + Google Sign-In  
- Forgot password → OTP → reset  
- Referral hub (`VYD-` codes) → soft Pro / trial  
- Pro screen (Paystack WebView scaffold; production billing still being wired)  
- Onboarding + **5-minute Wow Path** (seeded first edit → captions → export → invite)  
- Dashboard: Get-started cards, explore tools, typing hero, projects with covers  
- Settings: theme, auto-save, proxy editing, notifications, presence, export quality  

### 5.7 Honest maturity notes (for lecturers & investors)

| Area | Status |
|------|--------|
| Editor + collab + AI APIs + export | **Built and integrated** |
| Guest review + referrals | **Built** |
| Paystack Pro billing | **UI scaffold; not fully production-wired** |
| Horizontal scale (Redis broker / rate limit) | **Designed for; single-instance today** |
| Some advanced tools | Depth varies; CapCut-parity is a roadmap, not a claim of 1:1 feature match |

---

## 6. User journeys (how people use it)

```
Splash → Sign in / Sign up (Google optional)
      → Onboarding / Wow Path (optional)
      → Tabs: Edit | Projects (exports) | Activity | Me

Typical creator path
  New project → Upload → Editor (AI captions / rough cut) → Export → Share

Typical team path
  Owner creates project → Invite Editors/Viewers
  → Live co-edit (presence + cursors + chat)
  → Guest review link to client/lecturer
  → Version snapshot → FinalLocked → Export

Typical student path
  Group assignment → shared project → Viewer comments → request Editor
  → Captions for accessibility → Export for submission
```

---

## 7. System architecture

### 7.1 High-level

```
┌─────────────────────────────┐
│  Vydora Mobile (Expo RN)    │
│  Editor · Dashboard · Auth  │
└──────────────┬──────────────┘
               │ HTTPS REST + STOMP / WebSocket
┌──────────────▼──────────────┐
│  Spring Boot API (Java 17)  │
│  /api/v1 · JWT · Access ctrl│
├──────────────┬──────────────┤
│ PostgreSQL   │ FFmpeg       │
│ (Supabase /  │ Export + AI  │
│  Railway)    │ media jobs   │
├──────────────┼──────────────┤
│ Cloudinary   │ Local /files │
│ (videos)     │ (images)     │
├──────────────┼──────────────┤
│ Gemini/Groq/ │ SMTP mail    │
│ OpenAI (opt) │ (OTP/invite) │
└──────────────┴──────────────┘
```

### 7.2 Frontend stack

| Layer | Choice |
|-------|--------|
| Runtime | Expo ~54, React Native 0.81, React 19 |
| Navigation | React Navigation (stack + tabs) |
| Media | expo-video / av / audio / image-picker / thumbnails / file-system |
| Auth | JWT + refresh; Google via expo-auth-session |
| Realtime | @stomp/stompjs |
| Forms | react-hook-form + zod |
| Brand | Dark `#0B0B0D` + accent `#F5C518` |

### 7.3 Backend stack

| Layer | Choice |
|-------|--------|
| Runtime | Java 17, Spring Boot 3.2 |
| API | REST under `/api/v1` |
| DB | PostgreSQL + Flyway migrations; JPA validate |
| Auth | Stateless JWT, hashed refresh tokens, BCrypt, Google ID tokens |
| Realtime | STOMP over SockJS `/ws` + raw `/ws-native` |
| Export / AI media | FFmpeg / ffprobe |
| Video CDN | Cloudinary |
| Images | Local disk served at `/files/**` |
| Deploy | Docker + Railway-oriented prod profile |

### 7.4 Major API domains

`auth` · `projects` · `clips` · `members` · `comments` · `messages` · `notifications` · `versions` · `uploads` · `exports` · `review` · `referrals` · `ai/*` · `health`

Realtime topics include project edits, cursors, comments, messages, presence, and per-user notification queues.

---

## 8. Architecture decisions (and why)

These are deliberate choices — useful for lecturers grading design reasoning and for investors assessing engineering maturity.

| Decision | Rationale |
|----------|-----------|
| **Mobile-first Expo app** | Creators and students already shoot and edit on phones; native reach via one codebase |
| **Separate Spring Boot API** | Strong typing, security, long-running FFmpeg jobs, clear ownership vs “all-in-one BaaS” |
| **Flyway-owned schema** | Predictable migrations on Postgres/Supabase; Hibernate validates only |
| **Hybrid storage** | Cloudinary for durable video CDN; local files for cheap avatars/covers (LAN-friendly for Expo Go) |
| **Client timeline as export source of truth** | Bake what the editor actually shows (timeline JSON) rather than reconstructing from fragmented tables |
| **Dual AI strategy** | Cloud Whisper/Gemini for speech; **local FFmpeg** for silence/beats/reframe/multicam (works offline-of-keys, lower cost) |
| **STOMP + SimpleBroker** | Fast iteration for collab; explicitly noted that Redis is next for multi-instance scale |
| **Guest review tokens** | Async stakeholder feedback without forcing signup friction |
| **Roles + upgrade requests** | Mirrors real classroom/agency permission dynamics |
| **Long-lived mobile JWTs (dev-friendly)** | Editor sessions shouldn’t expire mid-cut; refresh + revoke on logout/reset |
| **Rate-limit auth endpoints** | Basic abuse protection; Redis planned for multi-node |
| **Wow Path + referrals** | Product-led growth before heavy paid acquisition |

---

## 9. Competitive landscape & edge

### 9.1 Comparison snapshot

| Capability | CapCut | VN / InShot | Frame.io | **Vydora** |
|------------|--------|-------------|----------|------------|
| Mobile AI editing | ★★★★★ | ★★★★ | ★ | ★★★★ |
| Live multi-user timeline | ★ | ★ | ★★ | ★★★★ |
| In-editor chat + presence | ★ | ★ | ★★★ | ★★★★ |
| Guest review (no account) | ★ | ★ | ★★★★ | ★★★★ |
| Role upgrade workflow | ★ | ★ | ★★ | ★★★★ |
| Cloud team export + versions | ★★ | ★ | ★★★★ | ★★★ |
| Price accessibility (students) | Free tier | Free | Enterprise-ish | Freemium + referral Pro |
| Conference / flyer / sheet tools | Partial | Partial | N/A | Designed-in |

### 9.2 Why we can win a *segment* (not “beat CapCut globally”)

We do **not** claim to out-feature CapCut’s entire effect library on day one. We win where CapCut is weak:

1. **Team-native editing** — live cursors, LWW timeline sync, presence, chat inside the editor  
2. **Review without friction** — guest links for lecturers, clients, club executives  
3. **Permission realism** — Viewer → Editor upgrade requests; FinalLocked handoff  
4. **Campus / Africa-friendly GTM** — referral Pro, mobile-first, Paystack-oriented billing path  
5. **Vertical tools** — conference slates, flyer, sheet / title cards for events and summits  
6. **Guided first success** — Wow Path so first-time users ship a reel in minutes  

**Positioning line:**  
> CapCut makes *you* faster. Vydora makes *your team* faster.

### 9.3 Moat trajectory

| Near-term | Medium-term |
|-----------|-------------|
| Collab UX + guest review habit | Org/workspace accounts for clubs & agencies |
| Template + music packs | Marketplace + brand kits |
| Referral graph | Campus ambassador program |
| Export quality | Proxy editing + cloud render tiers |

---

## 10. Intended business model

### 10.1 Monetization

| Tier | Who | What they get | How we charge |
|------|-----|---------------|---------------|
| **Free** | Individuals / students | Core edit, limited AI / export quality, watermark options as needed | $0 |
| **Pro** | Serious creators | Higher export quality, more AI runs, templates, no/low watermark | Monthly / yearly (Paystack) |
| **Team** (planned) | Clubs, agencies | Seats, shared brand kit, admin, priority export | Per seat / month |
| **Education** (planned) | Lecturers / departments | Classroom workspaces, guest review quotas | Annual campus license |

**Growth loops already in product:**

- Referral codes → Pro trial (`pro_until`)  
- Wow Path → export → invite teammate  
- Guest review → guest becomes registered user  

### 10.2 Unit economics (directional)

- **Costs:** Cloudinary storage/bandwidth, Whisper/Gemini API calls, FFmpeg CPU on export, Postgres hosting  
- **Levers:** Prefer FFmpeg-local AI where possible; cache captions; tier AI/export quotas on Free vs Pro  
- **ARPU path:** Free → Pro via referral or export friction; Team when projects regularly exceed 2 members  

### 10.3 Go-to-market

1. **Campus-first:** film clubs, media students, hackathons, entrepreneurship courses  
2. **Creator pods:** 3–5 person TikTok/Reel teams  
3. **Event vertical:** summit intros, conference lower-thirds, end cards (Flyer / Sheet tools)  
4. **Content:** “edit with your team on phone” demos vs CapCut solo workflow  

---

## 11. Market context (for investors)

- Short-form video remains the default content format for Gen Z / Gen Alpha communication  
- Creator economy tools expand from *solo influence* → *small production teams*  
- Collaboration SaaS (Notion, Figma, Frame.io) proved willingness to pay for multiplayer creative work  
- Mobile-first markets (Africa, SEA, LatAm) often skip desktop-heavy creative suites  

**Vydora’s bet:** multiplayer editing on mobile is underserved; AI makes the editor “good enough” while collab becomes the reason to switch.

---

## 12. Academic / lecturer framing

### 12.1 What this project demonstrates

| Course theme | How Vydora maps |
|--------------|-----------------|
| Software engineering | Full-stack product: RN client + Spring API + DB + realtime + media pipeline |
| Distributed systems lite | STOMP presence, LWW timeline sync, async export worker |
| HCI / UX | Beginner toolbar, Wow Path, guest review without signup |
| AI systems | Hybrid cloud LLM/ASR + classical media DSP (FFmpeg) |
| Security | JWT, refresh hashing, role-based access, public tokenized review routes |
| Entrepreneurship | Freemium + referral, competitive positioning, GTM |

### 12.2 Suggested demo script (5–7 minutes)

1. Create project → upload clip  
2. Auto captions → silence/filler rough cut  
3. Invite second user → show live cursor / chat  
4. Open guest review link on another device → leave comment  
5. Snapshot version → export 1080p → share  

### 12.3 Learning outcomes for teammates

- How product requirements become API modules  
- Why hybrid storage and export-as-job matter  
- Tradeoffs: SimpleBroker vs Redis; Free AI vs paid ASR  
- How to pitch *segment leadership* instead of “we beat CapCut at everything”

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| CapCut feature gravity | Differentiate on collab + review; don’t compete on effect count alone |
| AI cost spikes | FFmpeg-local tools; quota Free/Pro; cache transcripts |
| Single-instance realtime | Redis broker + sticky sessions on roadmap |
| Export CPU cost | Queue, resolution tiers, Pro priority |
| Billing incomplete | Finish Paystack; keep referral Pro for early traction |
| Content moderation | Report flows + ToS; private-by-default projects |

---

## 14. Roadmap (indicative)

**Now — polish & reliability**

- Harden export bake parity with editor timeline  
- Production Paystack Pro  
- Collab conflict UX + reconnect resilience  

**Next — team product**

- Workspaces / brand kits  
- Proxy editing for large files  
- Education guest-review quotas  

**Later — platform**

- Template marketplace  
- Org SSO / campus licenses  
- Multi-region render workers  

---

## 15. The ask (customize per audience)

### Investors

- Capital for: cloud/AI burn, campus GTM, 2–3 engineers focused on collab + export reliability  
- Traction plan: campus cohorts → creator pods → Team SKU  

### Lecturers

- Recognition of full-stack + product thinking, not only UI screens  
- Feedback on evaluation criteria: architecture quality, UX research, business clarity  

### Colleagues

- Shared north star: **team-native mobile editing**  
- Ownership map: Editor UX · Collab/realtime · AI/export · Growth/billing · Brand/dashboard  

---

## 16. Appendix — module map

### Mobile (`Vydora/`)

Dashboard · Editor · Auth · Projects · Invite · Guest Review · Export · Referral · Pro · Settings · Activity · Wow Path · AI service clients · STOMP sync

### Backend (`vydora-backend/`)

`auth` `project` `clip` `member` `comment` `message` `notification` `version` `upload` `export` `ai` `review` `referral` `mail` `ws` `security` `config`

---

## 17. Closing statement

Vydora exists because **video creation became a team sport**, while the most popular mobile editors stayed solo apps. We combine CapCut-like AI speed with live collaboration, guest review, and a freemium growth model designed for creators and campuses.

**Edit alone if you want. Ship together if you want to win.**

---

*Document generated from the Vydora application and API codebases for internal pitching and academic presentation. Update billing/roadmap sections as product status changes.*
