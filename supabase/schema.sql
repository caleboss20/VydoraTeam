CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─── USERS ─────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    initials    TEXT NOT NULL,
    color       TEXT NOT NULL,
    avatar_url  TEXT,
    role        TEXT NOT NULL DEFAULT 'user',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── PROJECTS ──────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    description    TEXT,
    status         TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Archived','Draft')),
    visibility     TEXT NOT NULL DEFAULT 'Private' CHECK (visibility IN ('Private','Team','Public')),
    thumbnail_url  TEXT,
    owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── PROJECT MEMBERS ───────────────────────────────────────────────────────
CREATE TABLE project_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'Editor' CHECK (role IN ('Owner','Editor','Viewer')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);

CREATE TRIGGER trg_project_members_updated_at
BEFORE UPDATE ON project_members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── FILES (raw uploaded clips before/alongside editor use) ───────────────
CREATE TABLE files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    filename    TEXT NOT NULL,
    file_url    TEXT NOT NULL,
    file_type   TEXT,
    file_size   BIGINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_files_updated_at
BEFORE UPDATE ON files
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── VERSIONS (whole-project version history / snapshots) ─────────────────
CREATE TABLE versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    version_number  INTEGER NOT NULL,
    is_current      BOOLEAN NOT NULL DEFAULT false,
    is_restored     BOOLEAN NOT NULL DEFAULT false,
    change_summary  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, version_number)
);

CREATE TRIGGER trg_versions_updated_at
BEFORE UPDATE ON versions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── VIDEO PROJECTS (editor working document, 1:1-ish with projects) ──────
CREATE TABLE video_projects (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title                 TEXT NOT NULL,
    cover_thumbnail_uri   TEXT,
    total_duration_ms     BIGINT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_video_projects_updated_at
BEFORE UPDATE ON video_projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── VIDEO CLIPS (clips placed on the editor timeline) ────────────────────
CREATE TABLE video_clips (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_project_id  UUID NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
    uri               TEXT NOT NULL,
    duration_ms       BIGINT NOT NULL,
    width             INTEGER,
    height            INTEGER,
    thumbnail_uri     TEXT,
    "order"           INTEGER NOT NULL,
    trim_start_ms     BIGINT DEFAULT 0,
    trim_end_ms       BIGINT,
    volume            NUMERIC DEFAULT 1,
    speed             NUMERIC DEFAULT 1,
    filter_id         TEXT,
    crop_ratio_id     TEXT,
    crop_offset_x     NUMERIC,
    crop_offset_y     NUMERIC,
    crop_zoom         NUMERIC DEFAULT 1,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_video_clips_updated_at
BEFORE UPDATE ON video_clips
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── TEXT OVERLAYS ─────────────────────────────────────────────────────────
CREATE TABLE text_overlays (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id            UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
    text               TEXT NOT NULL,
    start_ms           BIGINT NOT NULL,
    duration_ms        BIGINT NOT NULL,
    color              TEXT,
    is_ai_generated    BOOLEAN DEFAULT false,
    x                  NUMERIC,
    y                  NUMERIC,
    font_size          NUMERIC,
    font_weight        TEXT CHECK (font_weight IN ('normal','bold')),
    align              TEXT CHECK (align IN ('left','center','right')),
    background_color   TEXT,
    background_opacity NUMERIC,
    background_radius  NUMERIC,
    stroke_color       TEXT,
    stroke_width       NUMERIC,
    animation_in       TEXT,
    animation_out      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_text_overlays_updated_at
BEFORE UPDATE ON text_overlays
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── BACKGROUND MUSIC (1:1 with video_projects) ───────────────────────────
CREATE TABLE background_music (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_project_id  UUID NOT NULL UNIQUE REFERENCES video_projects(id) ON DELETE CASCADE,
    uri               TEXT NOT NULL,
    volume            NUMERIC DEFAULT 1,
    start_ms          BIGINT DEFAULT 0,
    trim_start_ms     BIGINT,
    trim_end_ms       BIGINT,
    duration_ms       BIGINT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_background_music_updated_at
BEFORE UPDATE ON background_music
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── COMMENTS ──────────────────────────────────────────────────────────────
CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    clip_id     UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    timestamp_seconds NUMERIC,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── MESSAGES ──────────────────────────────────────────────────────────────
CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('invite','comment','clip_upload','role_change')),
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── EXPORTS ───────────────────────────────────────────────────────────────
CREATE TABLE exports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    file_url      TEXT,
    resolution    TEXT,
    format        TEXT,
    size_mb       NUMERIC,
    status        TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Ready','Processing','Failed')),
    is_final      BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_exports_updated_at
BEFORE UPDATE ON exports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX idx_projects_owner_id          ON projects(owner_id);
CREATE INDEX idx_project_members_project    ON project_members(project_id);
CREATE INDEX idx_project_members_user       ON project_members(user_id);
CREATE INDEX idx_files_project_id           ON files(project_id);
CREATE INDEX idx_files_uploaded_by          ON files(uploaded_by);
CREATE INDEX idx_versions_project_id        ON versions(project_id);
CREATE INDEX idx_video_projects_project_id  ON video_projects(project_id);
CREATE INDEX idx_video_clips_vp_id          ON video_clips(video_project_id);
CREATE INDEX idx_text_overlays_clip_id      ON text_overlays(clip_id);
CREATE INDEX idx_comments_project_id        ON comments(project_id);
CREATE INDEX idx_comments_clip_id           ON comments(clip_id);
CREATE INDEX idx_comments_author_id         ON comments(author_id);
CREATE INDEX idx_messages_project_id        ON messages(project_id);
CREATE INDEX idx_messages_user_id           ON messages(user_id);
CREATE INDEX idx_notifications_user_id      ON notifications(user_id);
CREATE INDEX idx_exports_project_id         ON exports(project_id);
