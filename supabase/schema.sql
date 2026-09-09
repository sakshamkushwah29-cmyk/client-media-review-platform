-- ==============================================================================
-- Client Media Review and Approval Platform - Supabase PostgreSQL Schema
-- Database: postgres | Host: db.xyaszpcdxstzhxhdkuom.supabase.co
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY DEFAULT ('org-' || encode(gen_random_bytes(6), 'hex')),
    name TEXT NOT NULL,
    drive_root_folder_id TEXT NOT NULL,
    storage_quota_bytes BIGINT NOT NULL DEFAULT 161061273600, -- 150 GiB default
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Profiles (Staff / Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY DEFAULT ('usr-' || encode(gen_random_bytes(6), 'hex')),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'contributor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT ('proj-' || encode(gen_random_bytes(6), 'hex')),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    drive_folder_id TEXT NOT NULL,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Assets
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY DEFAULT ('ast-' || encode(gen_random_bytes(6), 'hex')),
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('video', 'image', 'pdf', 'other')),
    status TEXT NOT NULL DEFAULT 'ready_for_review' CHECK (status IN ('draft', 'ready_for_review', 'changes_requested', 'approved', 'delivered')),
    current_version_id TEXT,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Asset Versions
CREATE TABLE IF NOT EXISTS public.asset_versions (
    id TEXT PRIMARY KEY DEFAULT ('ver-' || encode(gen_random_bytes(6), 'hex')),
    asset_id TEXT NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    drive_file_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    download_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    duration_seconds NUMERIC(10, 3) DEFAULT 0,
    uploaded_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for assets.current_version_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_assets_current_version'
    ) THEN
        ALTER TABLE public.assets 
        ADD CONSTRAINT fk_assets_current_version 
        FOREIGN KEY (current_version_id) REFERENCES public.asset_versions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Review Links
CREATE TABLE IF NOT EXISTS public.review_links (
    id TEXT PRIMARY KEY DEFAULT ('link-' || encode(gen_random_bytes(6), 'hex')),
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    asset_id TEXT REFERENCES public.assets(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    raw_token_display TEXT,
    can_comment SMALLINT NOT NULL DEFAULT 1,
    can_download SMALLINT NOT NULL DEFAULT 1,
    can_approve SMALLINT NOT NULL DEFAULT 1,
    show_previous_versions SMALLINT NOT NULL DEFAULT 1,
    passphrase_hash TEXT,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Comments
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY DEFAULT ('cmt-' || encode(gen_random_bytes(6), 'hex')),
    asset_version_id TEXT NOT NULL REFERENCES public.asset_versions(id) ON DELETE CASCADE,
    review_link_id TEXT REFERENCES public.review_links(id) ON DELETE SET NULL,
    author_user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    time_seconds NUMERIC(10, 3),
    x_percent NUMERIC(5, 2),
    y_percent NUMERIC(5, 2),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Comment Status Events (Audit log for status transitions)
CREATE TABLE IF NOT EXISTS public.comment_status_events (
    id TEXT PRIMARY KEY DEFAULT ('evt-' || encode(gen_random_bytes(6), 'hex')),
    comment_id TEXT NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    changed_by_user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Review Decisions (Approve / Changes Requested)
CREATE TABLE IF NOT EXISTS public.review_decisions (
    id TEXT PRIMARY KEY DEFAULT ('dec-' || encode(gen_random_bytes(6), 'hex')),
    asset_version_id TEXT NOT NULL REFERENCES public.asset_versions(id) ON DELETE CASCADE,
    review_link_id TEXT NOT NULL REFERENCES public.review_links(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
    message TEXT,
    reviewer_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Activity Events
CREATE TABLE IF NOT EXISTS public.activity_events (
    id TEXT PRIMARY KEY DEFAULT ('act-' || encode(gen_random_bytes(6), 'hex')),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Indexes for High Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_project ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_asset ON public.asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_comments_version ON public.comments(asset_version_id);
CREATE INDEX IF NOT EXISTS idx_review_links_token ON public.review_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_review_links_asset ON public.review_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON public.activity_events(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_version ON public.review_decisions(asset_version_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active review links (needed for client reviewers)
CREATE POLICY "Public read active review links" 
ON public.review_links 
FOR SELECT 
USING (revoked_at IS NULL);

-- Allow public read on assets linked to active review links
CREATE POLICY "Public read assets via review links" 
ON public.assets 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.review_links rl 
        WHERE rl.asset_id = public.assets.id 
          AND rl.revoked_at IS NULL
    )
);

-- Allow public read on asset versions linked to active review links
CREATE POLICY "Public read versions via review links" 
ON public.asset_versions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.review_links rl 
        WHERE rl.asset_id = public.asset_versions.asset_id 
          AND rl.revoked_at IS NULL
    )
);

-- Allow public read and insert on comments for reviewed versions
CREATE POLICY "Public read comments on review cut" 
ON public.comments 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.asset_versions av
        JOIN public.review_links rl ON rl.asset_id = av.asset_id
        WHERE av.id = public.comments.asset_version_id
          AND rl.revoked_at IS NULL
    )
);

CREATE POLICY "Public create comments on review cut" 
ON public.comments 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.asset_versions av
        JOIN public.review_links rl ON rl.asset_id = av.asset_id
        WHERE av.id = public.comments.asset_version_id
          AND rl.revoked_at IS NULL
          AND rl.can_comment = 1
    )
);

-- Allow public submit review decisions
CREATE POLICY "Public submit review decisions" 
ON public.review_decisions 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.review_links rl
        WHERE rl.id = public.review_decisions.review_link_id
          AND rl.revoked_at IS NULL
          AND rl.can_approve = 1
    )
);
