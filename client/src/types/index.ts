export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'manager' | 'contributor';
  organizationId: string;
  organizationName?: string;
}

export interface OrganizationUsage {
  organization: {
    id: string;
    name: string;
    driveRootFolderId: string;
  };
  storage: {
    quotaBytes: number;
    quotaGb: string;
    usedBytes: number;
    usedGb: string;
    usedPercentage: number;
    remainingBytes: number;
    remainingGb: string;
    warningThreshold: number;
    blockingThreshold: number;
    isWarning: boolean;
    isBlocking: boolean;
  };
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  client_name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  drive_folder_id: string;
  created_by: string;
  created_at: string;
  asset_count?: number;
  total_bytes?: number;
  creator_name?: string;
}

export interface Asset {
  id: string;
  project_id: string;
  name: string;
  asset_type: 'video' | 'image' | 'pdf' | 'other';
  status: 'draft' | 'ready_for_review' | 'changes_requested' | 'approved' | 'delivered';
  current_version_id: string;
  created_by: string;
  created_at: string;
  version_number?: number;
  mime_type?: string;
  size_bytes?: number;
  duration_seconds?: number;
  original_filename?: string;
  download_filename?: string;
  current_version_created_at?: string;
  comment_count?: number;
  open_comment_count?: number;
}

export interface AssetVersion {
  id: string;
  asset_id: string;
  version_number: number;
  drive_file_id?: string;
  original_filename: string;
  download_filename: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number;
  uploaded_by?: string;
  uploader_name?: string;
  created_at: string;
  comment_count?: number;
  decision_count?: number;
}

export interface ReviewLink {
  id: string;
  project_id: string;
  asset_id: string;
  raw_token_display?: string;
  shareUrl?: string;
  can_comment: number | boolean;
  can_download: number | boolean;
  can_approve: number | boolean;
  show_previous_versions: number | boolean;
  passphrase_hash?: string;
  expires_at?: string;
  revoked_at?: string;
  created_by: string;
  creator_name?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  asset_version_id: string;
  review_link_id?: string;
  author_user_id?: string;
  author_name: string;
  body: string;
  time_seconds?: number | null;
  x_percent?: number | null;
  y_percent?: number | null;
  status: 'open' | 'in_progress' | 'done';
  created_at: string;
}

export interface CommentStatusEvent {
  id: string;
  comment_id: string;
  changed_by_user_id?: string;
  changed_by_name?: string;
  previous_status: string;
  new_status: string;
  created_at: string;
}

export interface ReviewDecision {
  id: string;
  asset_version_id: string;
  review_link_id: string;
  decision: 'approved' | 'changes_requested';
  message?: string;
  reviewer_name: string;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  organization_id: string;
  project_id: string;
  actor_user_id?: string;
  actor_name: string;
  event_type: string;
  object_id: string;
  metadata?: string;
  created_at: string;
}

export interface ClientReviewData {
  requiresPassphrase: boolean;
  project?: {
    name: string;
    clientName: string;
  };
  asset?: {
    id: string;
    name: string;
    type: 'video' | 'image' | 'pdf' | 'other';
    status: 'draft' | 'ready_for_review' | 'changes_requested' | 'approved' | 'delivered';
    currentVersionId: string;
  };
  permissions?: {
    canComment: boolean;
    canDownload: boolean;
    canApprove: boolean;
    showPreviousVersions: boolean;
  };
  currentVersion?: AssetVersion;
  versions?: AssetVersion[];
  comments?: Comment[];
  latestDecision?: ReviewDecision | null;
  error?: string;
}

export interface StorageFile {
  version_id: string;
  version_number: number;
  original_filename: string;
  download_filename: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number;
  drive_file_id: string;
  created_at: string;
  asset_id: string;
  asset_name: string;
  asset_type: 'video' | 'image' | 'pdf' | 'other';
  asset_status: string;
  project_id: string;
  project_name: string;
  client_name: string;
  drive_folder_id: string;
  review_token?: string | null;
}

export interface NotificationItem {
  id: string;
  organization_id: string;
  project_id: string;
  actor_user_id?: string;
  actor_name: string;
  event_type: string;
  object_id: string;
  metadata?: string;
  created_at: string;
  project_name: string;
  client_name: string;
  target_asset_id?: string | null;
}
