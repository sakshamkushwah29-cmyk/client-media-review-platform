import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'media_platform.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      drive_root_folder_id TEXT NOT NULL,
      storage_quota_bytes INTEGER NOT NULL DEFAULT 161061273600,
      storage_used_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'manager', 'contributor')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      client_name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
      drive_folder_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL CHECK(asset_type IN ('video', 'image', 'pdf', 'other')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'ready_for_review', 'changes_requested', 'approved', 'delivered')),
      current_version_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS asset_versions (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      drive_file_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      download_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      duration_seconds REAL DEFAULT 0,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS review_links (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      asset_id TEXT,
      token_hash TEXT UNIQUE NOT NULL,
      raw_token_display TEXT,
      can_comment INTEGER NOT NULL DEFAULT 1,
      can_download INTEGER NOT NULL DEFAULT 1,
      can_approve INTEGER NOT NULL DEFAULT 1,
      show_previous_versions INTEGER NOT NULL DEFAULT 1,
      passphrase_hash TEXT,
      expires_at TEXT,
      revoked_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      asset_version_id TEXT NOT NULL,
      review_link_id TEXT,
      author_user_id TEXT,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      time_seconds REAL,
      x_percent REAL,
      y_percent REAL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (asset_version_id) REFERENCES asset_versions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comment_status_events (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      changed_by_user_id TEXT,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_decisions (
      id TEXT PRIMARY KEY,
      asset_version_id TEXT NOT NULL,
      review_link_id TEXT NOT NULL,
      decision TEXT NOT NULL CHECK(decision IN ('approved', 'changes_requested')),
      message TEXT,
      reviewer_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (asset_version_id) REFERENCES asset_versions(id) ON DELETE CASCADE,
      FOREIGN KEY (review_link_id) REFERENCES review_links(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      actor_user_id TEXT,
      actor_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      object_id TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
    CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
    CREATE INDEX IF NOT EXISTS idx_versions_asset ON asset_versions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_comments_version ON comments(asset_version_id);
    CREATE INDEX IF NOT EXISTS idx_review_links_token ON review_links(token_hash);
    CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_events(project_id);
  `);

  console.log('Database initialized successfully.');
}
