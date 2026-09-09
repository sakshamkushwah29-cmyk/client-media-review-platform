import {
  User,
  OrganizationUsage,
  Project,
  Asset,
  AssetVersion,
  ReviewLink,
  Comment,
  ClientReviewData,
} from '../types';
import { saveMediaBlob } from './mediaStorage';

const API_BASE = (import.meta as any).env?.VITE_API_URL
  ? `${(import.meta as any).env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

// Fallback seed data for static deployments (e.g. Vercel without separate backend)
const DEMO_USER: User = {
  id: 'demo-director-id',
  organizationId: 'demo-org-id',
  email: 'director@luminastudio.com',
  fullName: 'Studio Director',
  role: 'owner',
};

const DEMO_USAGE: OrganizationUsage = {
  organization: {
    id: 'demo-org-id',
    name: 'Lumina Wedding Media Studio',
    driveRootFolderId: 'root',
  },
  storage: {
    quotaBytes: 161061273600,
    quotaGb: '150.00',
    usedBytes: 26316800000,
    usedGb: '24.51',
    usedPercentage: 16.3,
    remainingBytes: 134744473600,
    remainingGb: '125.49',
    warningThreshold: 85,
    blockingThreshold: 98,
    isWarning: false,
    isBlocking: false,
  },
};

const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-proj-1',
    organization_id: 'demo-org-id',
    name: 'Sharma - Verma Wedding 2026',
    client_name: 'Rahul Sharma & Ananya Verma',
    description: 'Cinematic wedding cut, Sangeet highlights, and 4K teaser in Udaipur.',
    status: 'active',
    drive_folder_id: 'folder-1',
    created_by: 'demo-director-id',
    created_at: '2026-07-28T10:00:00.000Z',
    asset_count: 2,
    total_bytes: 22850000,
  },
  {
    id: 'demo-proj-2',
    organization_id: 'demo-org-id',
    name: 'Aditi & Vikram Sangeet & Reception',
    client_name: 'Aditi Kapoor',
    description: 'Multi-cam choreography edit and drone portraits in Goa.',
    status: 'active',
    drive_folder_id: 'folder-2',
    created_by: 'demo-director-id',
    created_at: '2026-07-25T14:30:00.000Z',
    asset_count: 1,
    total_bytes: 34500000,
  },
];

const DEMO_ASSETS: Record<string, Asset[]> = {
  'demo-proj-1': [
    {
      id: 'demo-asset-1',
      project_id: 'demo-proj-1',
      name: 'Wedding Teaser Cut V2',
      asset_type: 'video',
      status: 'ready_for_review',
      current_version_id: 'demo-ver-1',
      created_by: 'demo-director-id',
      created_at: '2026-07-29T11:00:00.000Z',
      version_number: 2,
      mime_type: 'video/mp4',
      size_bytes: 7450000,
      duration_seconds: 15.2,
      original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
      comment_count: 2,
      open_comment_count: 1,
    },
    {
      id: 'demo-asset-2',
      project_id: 'demo-proj-1',
      name: 'Groom & Bride Portrait Teaser',
      asset_type: 'video',
      status: 'changes_requested',
      current_version_id: 'demo-ver-2',
      created_by: 'demo-director-id',
      created_at: '2026-07-28T16:00:00.000Z',
      version_number: 1,
      mime_type: 'video/mp4',
      size_bytes: 15400000,
      duration_seconds: 28.4,
      original_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
      comment_count: 1,
      open_comment_count: 1,
    },
  ],
  'demo-proj-2': [
    {
      id: 'demo-asset-3',
      project_id: 'demo-proj-2',
      name: 'Full Highlights 4K',
      asset_type: 'video',
      status: 'approved',
      current_version_id: 'demo-ver-3',
      created_by: 'demo-director-id',
      created_at: '2026-07-26T18:00:00.000Z',
      version_number: 1,
      mime_type: 'video/mp4',
      size_bytes: 34500000,
      duration_seconds: 45.0,
      original_filename: 'Aditi_Vikram_FullHighlight_4K.mp4',
      comment_count: 0,
      open_comment_count: 0,
    },
  ],
};

const DEMO_COMMENTS: Record<string, Comment[]> = {
  'demo-ver-1': [
    {
      id: 'comment-1',
      asset_version_id: 'demo-ver-1',
      review_link_id: 'demo-link-1',
      author_user_id: undefined,
      author_name: 'Client Reviewer',
      body: 'lalaa',
      time_seconds: 5.0,
      status: 'open',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'comment-2',
      asset_version_id: 'demo-ver-1',
      author_user_id: 'demo-director-id',
      author_name: 'Studio Lead',
      body: 'Color grading adjustment made for wedding vows entrance',
      time_seconds: 8.5,
      status: 'done',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

function getStoredProjects(): Project[] {
  try {
    const saved = localStorage.getItem('wedding_platform_projects_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [...DEMO_PROJECTS];
}

function saveStoredProjects(projects: Project[]) {
  try {
    localStorage.setItem('wedding_platform_projects_v2', JSON.stringify(projects));
  } catch (e) {}
}

function getStoredAssets(projectId: string): Asset[] {
  try {
    const saved = localStorage.getItem(`wedding_platform_assets_${projectId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return DEMO_ASSETS[projectId] || [];
}

function saveAsset(projectId: string, asset: Asset, version: AssetVersion) {
  try {
    const assets = getStoredAssets(projectId);
    assets.unshift(asset);
    localStorage.setItem(`wedding_platform_assets_${projectId}`, JSON.stringify(assets));

    // Save versions for this asset
    localStorage.setItem(`wedding_platform_ver_${asset.id}`, JSON.stringify([version]));

    // Update project count
    const projects = getStoredProjects();
    const p = projects.find(proj => proj.id === projectId);
    if (p) {
      p.asset_count = (p.asset_count || 0) + 1;
      p.total_bytes = (p.total_bytes || 0) + version.size_bytes;
      saveStoredProjects(projects);
    }
  } catch (e) {}
}

const INITIAL_DEMO_REVIEW_LINKS: ReviewLink[] = [
  {
    id: 'demo-link-1',
    project_id: 'demo-proj-1',
    asset_id: 'demo-asset-1',
    raw_token_display: 'sharma-wedding-teaser-review',
    shareUrl: '/review/sharma-wedding-teaser-review',
    can_comment: 1,
    can_download: 1,
    can_approve: 1,
    show_previous_versions: 1,
    created_by: 'demo-director-id',
    created_at: '2026-07-29T12:00:00.000Z',
    asset_name: 'Wedding Teaser Cut V2',
    project_name: 'Sharma - Verma Wedding 2026',
    client_name: 'Rahul Sharma & Ananya Verma',
  },
  {
    id: 'demo-link-2',
    project_id: 'demo-proj-1',
    asset_id: 'demo-asset-1',
    raw_token_display: 'demo-review-token',
    shareUrl: '/review/demo-review-token',
    can_comment: 1,
    can_download: 1,
    can_approve: 1,
    show_previous_versions: 1,
    created_by: 'demo-director-id',
    created_at: '2026-07-29T12:00:00.000Z',
    asset_name: 'Wedding Teaser Cut V2',
    project_name: 'Sharma - Verma Wedding 2026',
    client_name: 'Rahul Sharma & Ananya Verma',
  },
];

export function getStoredReviewLinks(): ReviewLink[] {
  try {
    const saved = localStorage.getItem('wedding_platform_review_links_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [...INITIAL_DEMO_REVIEW_LINKS];
}

export function saveStoredReviewLinks(links: ReviewLink[]) {
  try {
    localStorage.setItem('wedding_platform_review_links_v2', JSON.stringify(links));
  } catch (e) {}
}

export function encodeReviewToken(payload: any): string {
  try {
    const jsonStr = JSON.stringify(payload);
    const base64 = typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(jsonStr)))
      : Buffer.from(jsonStr, 'utf8').toString('base64');
    return 'rev_' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return `rev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  }
}

export function decodeReviewToken(token: string): any | null {
  if (!token || typeof token !== 'string' || !token.startsWith('rev_')) return null;
  try {
    let base64 = token.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const jsonStr = typeof atob !== 'undefined'
      ? decodeURIComponent(escape(atob(base64)))
      : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

export const api = {
  // Auth
  login: async (data: any) => {
    try {
      return await request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    } catch (err) {
      const user = { ...DEMO_USER, email: data.email || DEMO_USER.email };
      return { token: 'demo-token-123', user };
    }
  },
  register: async (data: any) => {
    try {
      return await request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    } catch (err) {
      const user = { ...DEMO_USER, email: data.email || DEMO_USER.email, fullName: data.fullName || DEMO_USER.fullName };
      return { token: 'demo-token-123', user };
    }
  },
  syncClerkUser: async (data: { email: string; fullName?: string; clerkId: string }) => {
    try {
      return await request<{ token: string; user: User }>('/auth/clerk-sync', { method: 'POST', body: JSON.stringify(data) });
    } catch (err) {
      const user: User = {
        id: data.clerkId || 'clerk-user-1',
        organizationId: 'demo-org-id',
        email: data.email,
        fullName: data.fullName || 'Clerk Studio Member',
        role: 'owner',
      };
      return { token: 'clerk-demo-token', user };
    }
  },
  getMe: async () => {
    try {
      return await request<{ user: User }>('/auth/me');
    } catch (err) {
      return { user: DEMO_USER };
    }
  },

  // Org & Storage Quota
  getStorageUsage: async () => {
    try {
      return await request<OrganizationUsage>('/organization/usage');
    } catch (err) {
      return DEMO_USAGE;
    }
  },
  getStorageFiles: async () => {
    let filesResult: { files: any[]; cloudStorageUrl: string };
    try {
      filesResult = await request<{ files: any[]; cloudStorageUrl: string }>('/organization/files');
    } catch (err) {
      filesResult = {
        cloudStorageUrl: 'https://www.jioaicloud.com/l/?u=g4hmxUTO-wgVwF-fLP9Bx-cyfJyX-vprhmiygn1LPJ50buo7GG7VSBbwMbOf04FwhIb',
        files: [
          {
            version_id: 'demo-ver-1',
            version_number: 2,
            original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
            download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
            mime_type: 'video/mp4',
            size_bytes: 7450000,
            duration_seconds: 15.2,
            drive_file_id: 'jio-drive-1',
            created_at: '2026-07-29T11:00:00.000Z',
            asset_id: 'demo-asset-1',
            asset_name: 'Wedding Teaser Cut V2',
            asset_type: 'video',
            asset_status: 'ready_for_review',
            project_id: 'demo-proj-1',
            project_name: 'Sharma - Verma Wedding 2026',
            client_name: 'Rahul Sharma & Ananya Verma',
            drive_folder_id: 'folder-1',
            review_token: 'sharma-wedding-teaser-review',
          },
          {
            version_id: 'demo-ver-2',
            version_number: 1,
            original_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
            download_filename: 'Sharma_Verma_Sangeet_Teaser_V1.mp4',
            mime_type: 'video/mp4',
            size_bytes: 15400000,
            duration_seconds: 28.4,
            drive_file_id: 'jio-drive-2',
            created_at: '2026-07-28T16:00:00.000Z',
            asset_id: 'demo-asset-2',
            asset_name: 'Groom & Bride Portrait Teaser',
            asset_type: 'video',
            asset_status: 'changes_requested',
            project_id: 'demo-proj-1',
            project_name: 'Sharma - Verma Wedding 2026',
            client_name: 'Rahul Sharma & Ananya Verma',
            drive_folder_id: 'folder-1',
            review_token: null,
          },
          {
            version_id: 'demo-ver-3',
            version_number: 1,
            original_filename: 'Aditi_Vikram_FullHighlight_4K.mp4',
            download_filename: 'Aditi_Vikram_FullHighlight_4K.mp4',
            mime_type: 'video/mp4',
            size_bytes: 34500000,
            duration_seconds: 45.0,
            drive_file_id: 'jio-drive-3',
            created_at: '2026-07-26T18:00:00.000Z',
            asset_id: 'demo-asset-3',
            asset_name: 'Full Highlights 4K',
            asset_type: 'video',
            asset_status: 'approved',
            project_id: 'demo-proj-2',
            project_name: 'Aditi & Vikram Sangeet & Reception',
            client_name: 'Aditi Kapoor',
            drive_folder_id: 'folder-2',
            review_token: null,
          },
        ],
      };
    }

    // Attach review links to all files
    const allLinks = getStoredReviewLinks();
    const files = filesResult.files || [];

    for (const f of files) {
      const match = allLinks.find((l) => l.asset_id === f.asset_id);
      if (match?.raw_token_display) {
        f.review_token = match.raw_token_display;
        f.review_link_id = match.id;
        f.review_link_revoked = Boolean(match.revoked_at);
      }
    }

    return {
      cloudStorageUrl: filesResult.cloudStorageUrl,
      files,
    };
  },
  getNotifications: async () => {
    try {
      return await request<{ notifications: any[] }>('/organization/notifications');
    } catch (err) {
      return {
        notifications: [
          {
            id: 'notif-1',
            organization_id: 'demo-org-id',
            project_id: 'demo-proj-1',
            actor_name: 'Client Reviewer',
            event_type: 'comment',
            object_id: 'comment-1',
            metadata: JSON.stringify({ body: 'lalaa', time_seconds: 5.0 }),
            created_at: new Date(Date.now() - 1500000).toISOString(),
            project_name: 'Sharma - Verma Wedding 2026',
            client_name: 'Rahul Sharma & Ananya Verma',
            target_asset_id: 'demo-asset-1',
          },
          {
            id: 'notif-2',
            organization_id: 'demo-org-id',
            project_id: 'demo-proj-1',
            actor_name: 'Studio Director',
            event_type: 'version_uploaded',
            object_id: 'demo-ver-1',
            metadata: JSON.stringify({ filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4', size: 7450000 }),
            created_at: new Date(Date.now() - 7200000).toISOString(),
            project_name: 'Sharma - Verma Wedding 2026',
            client_name: 'Rahul Sharma & Ananya Verma',
            target_asset_id: 'demo-asset-1',
          },
        ],
      };
    }
  },

  // Projects
  getProjects: async () => {
    try {
      const res = await request<{ projects: Project[] }>('/projects');
      if (res?.projects && Array.isArray(res.projects)) {
        const localProjects = getStoredProjects();
        const merged = [...res.projects];
        for (const lp of localProjects) {
          if (!merged.some((m) => m.id === lp.id)) {
            merged.push(lp);
          }
        }
        return { projects: merged };
      }
    } catch (err) {}
    return { projects: getStoredProjects() };
  },
  getProject: async (id: string) => {
    try {
      const res = await request<{ project: Project; assets: Asset[] }>(`/projects/${id}`);
      if (res && res.project) {
        const storedAssets = getStoredAssets(id);
        const isDemo = id === 'proj-1' || id === 'demo-proj-1' || id === 'proj-2' || id === 'demo-proj-2';

        if (!isDemo) {
          // Strictly isolate non-demo projects: filter out hardcoded demo cuts (ast-1, ast-2, etc.)
          const validAssets = (res.assets || []).filter(
            (a) => a.project_id === id && a.id !== 'ast-1' && a.id !== 'demo-asset-1' && a.id !== 'ast-2' && a.id !== 'demo-asset-2'
          );
          for (const sa of storedAssets) {
            if (!validAssets.some((va) => va.id === sa.id)) {
              validAssets.push(sa);
            }
          }
          return {
            project: {
              ...res.project,
              asset_count: validAssets.length,
            },
            assets: validAssets,
          };
        }
        return res;
      }
    } catch (err) {
      const projects = getStoredProjects();
      const project = projects.find((p) => p.id === id) || {
        id,
        organization_id: 'org-wedding-studio',
        name: 'New Wedding Film',
        client_name: 'Wedding Client',
        description: '',
        status: 'active',
        drive_folder_id: `fld-${id}`,
        created_by: 'usr-director',
        created_at: new Date().toISOString(),
        asset_count: 0,
        total_bytes: 0,
      };
      const assets = getStoredAssets(id);
      return { project, assets };
    }
  },
  createProject: async (data: { name: string; clientName: string; description?: string }) => {
    try {
      return await request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(data) });
    } catch (err) {
      console.warn('Backend unavailable, saving project locally:', err);
      const projects = getStoredProjects();
      const newProject: Project = {
        id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: 'demo-org-id',
        name: data.name,
        client_name: data.clientName,
        description: data.description || '',
        status: 'active',
        drive_folder_id: `gdrive_folder_${Date.now()}`,
        created_by: 'demo-director-id',
        created_at: new Date().toISOString(),
        asset_count: 0,
        total_bytes: 0,
      };
      projects.unshift(newProject);
      saveStoredProjects(projects);
      return { project: newProject };
    }
  },
  updateProject: async (id: string, data: Partial<Project>) => {
    try {
      return await request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    } catch (err) {
      const projects = getStoredProjects();
      const idx = projects.findIndex(p => p.id === id);
      if (idx !== -1) {
        projects[idx] = { ...projects[idx], ...data };
        saveStoredProjects(projects);
        return { project: projects[idx] };
      }
      return { project: { ...DEMO_PROJECTS[0], ...data } };
    }
  },
  getProjectActivity: async (id: string) => {
    try {
      return await request<{ activities: any[] }>(`/projects/${id}/activity`);
    } catch (err) {
      return { activities: [] };
    }
  },

  // Assets
  uploadAsset: async (projectId: string, formData: FormData) => {
    const file = formData.get('file') as File | null;
    let res: { asset: Asset; currentVersion: AssetVersion };

    try {
      res = await request<{ asset: Asset; currentVersion: AssetVersion }>(`/projects/${projectId}/assets`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.warn('Backend unavailable, storing asset locally:', err);
      const name = (formData.get('name') as string) || file?.name || 'Wedding Media Cut';
      const assetId = `ast-${Date.now()}`;
      const versionId = `ver-${Date.now()}`;
      const isVideo = !file || file.type.startsWith('video') || name.endsWith('.mp4') || name.endsWith('.mov');
      const isImage = file?.type.startsWith('image') || name.endsWith('.jpg') || name.endsWith('.png');

      const currentVersion: AssetVersion = {
        id: versionId,
        asset_id: assetId,
        version_number: 1,
        original_filename: name,
        download_filename: name,
        mime_type: file?.type || (isVideo ? 'video/mp4' : isImage ? 'image/jpeg' : 'application/octet-stream'),
        size_bytes: file?.size || 15400000,
        duration_seconds: isVideo ? 24.0 : 0,
        created_at: new Date().toISOString(),
      };

      const asset: Asset = {
        id: assetId,
        project_id: projectId,
        name,
        asset_type: isVideo ? 'video' : isImage ? 'image' : 'other',
        status: 'ready_for_review',
        current_version_id: versionId,
        created_by: 'demo-director-id',
        created_at: new Date().toISOString(),
        version_number: 1,
        mime_type: currentVersion.mime_type,
        size_bytes: currentVersion.size_bytes,
        duration_seconds: currentVersion.duration_seconds,
        original_filename: name,
        comment_count: 0,
        open_comment_count: 0,
      };

      saveAsset(projectId, asset, currentVersion);
      res = { asset, currentVersion };
    }

    // Persist blob to IndexedDB for zero-latency local playback
    if (file && res?.currentVersion?.id) {
      try {
        await saveMediaBlob(res.currentVersion.id, file);
        await saveMediaBlob(res.asset.id, file);
      } catch (e) {
        console.warn('Could not cache file in IndexedDB:', e);
      }
    }

    return res;
  },
  getAsset: async (id: string) => {
    try {
      return await request<{ asset: Asset; currentVersion: AssetVersion; versions: AssetVersion[] }>(`/assets/${id}`);
    } catch (err) {
      const allAssets = Object.values(DEMO_ASSETS).flat();
      const asset = allAssets.find(a => a.id === id) || DEMO_ASSETS['demo-proj-1'][0];
      const version: AssetVersion = {
        id: asset.current_version_id || 'demo-ver-1',
        asset_id: asset.id,
        version_number: asset.version_number || 1,
        original_filename: asset.original_filename || 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        download_filename: asset.original_filename || 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        mime_type: asset.mime_type || 'video/mp4',
        size_bytes: asset.size_bytes || 7450000,
        duration_seconds: asset.duration_seconds || 15.2,
        created_at: asset.created_at,
      };
      return { asset, currentVersion: version, versions: [version] };
    }
  },
  uploadNewVersion: async (assetId: string, formData: FormData) => {
    const file = formData.get('file') as File | null;
    let res: { asset: Asset; version: AssetVersion };

    try {
      res = await request<{ asset: Asset; version: AssetVersion }>(`/assets/${assetId}/versions`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      const name = file?.name || 'Updated Cut V2';
      const versionId = `ver-${Date.now()}`;
      const version: AssetVersion = {
        id: versionId,
        asset_id: assetId,
        version_number: 2,
        original_filename: name,
        download_filename: name,
        mime_type: file?.type || 'video/mp4',
        size_bytes: file?.size || 18500000,
        duration_seconds: 28.0,
        created_at: new Date().toISOString(),
      };
      const asset: Asset = {
        id: assetId,
        project_id: 'demo-proj-1',
        name,
        asset_type: 'video',
        status: 'ready_for_review',
        current_version_id: versionId,
        created_by: 'demo-director-id',
        created_at: new Date().toISOString(),
        version_number: 2,
      };
      res = { asset, version };
    }

    if (file && res?.version?.id) {
      try {
        await saveMediaBlob(res.version.id, file);
      } catch (e) {}
    }

    return res;
  },
  updateAssetStatus: async (id: string, status: string) => {
    try {
      return await request<{ asset: Asset }>(`/assets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      const asset: Asset = {
        id,
        project_id: 'demo-proj-1',
        name: 'Wedding Media Cut',
        asset_type: 'video',
        status: status as any,
        current_version_id: 'demo-ver-1',
        created_by: 'demo-director-id',
        created_at: new Date().toISOString(),
      };
      return { asset };
    }
  },

  // Review links (Persistent in storage & localStorage)
  createReviewLink: async (assetId: string, data: any) => {
    // Find parent project & asset for richer metadata
    const allProjects = getStoredProjects();
    let parentProject: Project | undefined;
    let targetAsset: Asset | undefined;

    for (const p of allProjects) {
      const assets = getStoredAssets(p.id);
      const a = assets.find((ast) => ast.id === assetId);
      if (a) {
        targetAsset = a;
        parentProject = p;
        break;
      }
    }

    const prjId = parentProject?.id || data.projectId || 'demo-proj-1';
    const astName = targetAsset?.name || data.assetName || 'Wedding Media Cut';
    const prjName = parentProject?.name || data.projectName || 'Wedding Film';
    const cliName = parentProject?.client_name || data.clientName || 'Wedding Client';
    const linkId = `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const tokenPayload = {
      id: linkId,
      asset_id: assetId,
      astId: assetId,
      project_id: prjId,
      prjId: prjId,
      asset_name: astName,
      astName: astName,
      project_name: prjName,
      prjName: prjName,
      client_name: cliName,
      cliName: cliName,
      can_comment: data.canComment !== false ? 1 : 0,
      com: data.canComment !== false ? 1 : 0,
      can_download: data.canDownload !== false ? 1 : 0,
      dwn: data.canDownload !== false ? 1 : 0,
      can_approve: data.canApprove !== false ? 1 : 0,
      app: data.canApprove !== false ? 1 : 0,
      show_previous_versions: data.showPreviousVersions !== false ? 1 : 0,
      prev: data.showPreviousVersions !== false ? 1 : 0,
      passphrase_hash: data.passphrase || undefined,
      pass: data.passphrase || undefined,
      expires_at: data.expiresAt || undefined,
      exp: data.expiresAt || undefined,
      created_at: new Date().toISOString(),
    };

    const selfDescribingToken = encodeReviewToken(tokenPayload);
    const rawToken = data.token || selfDescribingToken;
    let createdLink: ReviewLink | null = null;

    try {
      const res = await request<{ reviewLink: ReviewLink }>(`/assets/${assetId}/review-links`, {
        method: 'POST',
        body: JSON.stringify({ ...data, token: rawToken }),
      });
      if (res?.reviewLink) {
        createdLink = res.reviewLink;
      }
    } catch (err) {
      console.warn('Backend unavailable, saving review link locally:', err);
    }

    const tokenToUse = createdLink?.raw_token_display || rawToken;
    const finalLink: ReviewLink = {
      id: createdLink?.id || linkId,
      project_id: prjId,
      asset_id: assetId,
      raw_token_display: tokenToUse,
      shareUrl: `/review/${tokenToUse}`,
      can_comment: data.canComment !== false ? 1 : 0,
      can_download: data.canDownload !== false ? 1 : 0,
      can_approve: data.canApprove !== false ? 1 : 0,
      show_previous_versions: data.showPreviousVersions !== false ? 1 : 0,
      passphrase_hash: data.passphrase || undefined,
      expires_at: data.expiresAt || undefined,
      created_by: 'demo-director-id',
      created_at: new Date().toISOString(),
      asset_name: astName,
      project_name: prjName,
      client_name: cliName,
    };

    // Save to localStorage
    const existing = getStoredReviewLinks();
    const updated = [finalLink, ...existing.filter((l) => l.id !== finalLink.id && l.raw_token_display !== finalLink.raw_token_display)];
    saveStoredReviewLinks(updated);

    return { reviewLink: finalLink };
  },

  getReviewLinks: async (assetId: string) => {
    let apiLinks: ReviewLink[] = [];
    try {
      const res = await request<{ reviewLinks: ReviewLink[] }>(`/assets/${assetId}/review-links`);
      if (res?.reviewLinks && Array.isArray(res.reviewLinks)) {
        apiLinks = res.reviewLinks;
      }
    } catch (err) {}

    const localLinks = getStoredReviewLinks().filter((l) => l.asset_id === assetId);
    const merged = [...apiLinks];
    for (const ll of localLinks) {
      if (!merged.some((m) => m.id === ll.id || m.raw_token_display === ll.raw_token_display)) {
        merged.push(ll);
      }
    }
    return { reviewLinks: merged };
  },

  getAllReviewLinks: async () => {
    let apiLinks: ReviewLink[] = [];
    try {
      const res = await request<{ reviewLinks: ReviewLink[] }>('/review-links');
      if (res?.reviewLinks && Array.isArray(res.reviewLinks)) {
        apiLinks = res.reviewLinks;
      }
    } catch (err) {}

    const localLinks = getStoredReviewLinks();
    const merged = [...apiLinks];
    for (const ll of localLinks) {
      if (!merged.some((m) => m.id === ll.id || m.raw_token_display === ll.raw_token_display)) {
        merged.push(ll);
      }
    }
    return { reviewLinks: merged };
  },

  revokeReviewLink: async (id: string) => {
    try {
      await request<{ success: boolean }>(`/review-links/${id}`, { method: 'DELETE' });
    } catch (e) {}

    const links = getStoredReviewLinks();
    const idx = links.findIndex((l) => l.id === id);
    if (idx !== -1) {
      links[idx].revoked_at = new Date().toISOString();
      saveStoredReviewLinks(links);
    }
    return { success: true };
  },

  // Comments (Staff Workflow)
  getVersionComments: async (versionId: string) => {
    try {
      return await request<{ comments: Comment[] }>(`/comments/version/${versionId}`);
    } catch (err) {
      return { comments: DEMO_COMMENTS[versionId] || DEMO_COMMENTS['demo-ver-1'] || [] };
    }
  },
  addStaffComment: async (versionId: string, data: { body: string; timeSeconds?: number | null; authorName?: string }) => {
    try {
      return await request<{ comment: Comment }>(`/comments/version/${versionId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        asset_version_id: versionId,
        author_name: data.authorName || 'Studio Member',
        body: data.body,
        time_seconds: data.timeSeconds ?? null,
        status: 'open',
        created_at: new Date().toISOString(),
      };
      if (!DEMO_COMMENTS[versionId]) DEMO_COMMENTS[versionId] = [];
      DEMO_COMMENTS[versionId].push(newComment);
      return { comment: newComment };
    }
  },
  updateCommentStatus: async (commentId: string, status: 'open' | 'in_progress' | 'done') => {
    try {
      return await request<{ comment: Comment; statusEvent: any }>(`/comments/${commentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      return {
        comment: {
          id: commentId,
          asset_version_id: 'demo-ver-1',
          author_name: 'Client Reviewer',
          body: 'lalaa',
          status,
          created_at: new Date().toISOString(),
        },
        statusEvent: { id: `event-${Date.now()}`, previous_status: 'open', new_status: status },
      };
    }
  },
  getCommentHistory: async (commentId: string) => {
    try {
      return await request<{ history: any[] }>(`/comments/${commentId}/history`);
    } catch (err) {
      return { history: [] };
    }
  },

  // Client Review Room
  getClientReview: async (token: string, passphrase?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (passphrase) headers['x-review-passphrase'] = passphrase;
      const res = await request<ClientReviewData>(`/review/${token}`, { headers });
      if (res && res.asset) {
        return res;
      }
    } catch (err: any) {
      if (err?.message?.includes('revoked') || err?.message?.includes('expired')) {
        throw err;
      }
      console.warn('Backend review lookup failed, checking local stored review links:', err);
    }

    // Resolve dynamic token from localStorage
    const storedLinks = getStoredReviewLinks();
    const matchedLink = storedLinks.find(
      (l) => l.raw_token_display === token || l.id === token
    );

    if (matchedLink) {
      if (matchedLink.revoked_at) {
        throw new Error('This review link has been revoked by the studio.');
      }
      if (matchedLink.expires_at && new Date(matchedLink.expires_at) < new Date()) {
        throw new Error('This review link has expired.');
      }
      const projects = getStoredProjects();
      const proj = projects.find((p) => p.id === matchedLink.project_id) || {
        id: matchedLink.project_id,
        name: matchedLink.project_name || 'Wedding Film',
        client_name: matchedLink.client_name || 'Wedding Client',
      };

      const assets = getStoredAssets(matchedLink.project_id);
      const asset = assets.find((a) => a.id === matchedLink.asset_id) || {
        id: matchedLink.asset_id,
        project_id: matchedLink.project_id,
        name: matchedLink.asset_name || 'Wedding Media Cut',
        asset_type: 'video',
        status: 'ready_for_review',
        currentVersionId: 'ver-' + matchedLink.asset_id,
        created_by: 'demo-director-id',
        created_at: matchedLink.created_at,
      };

      let versions: AssetVersion[] = [];
      try {
        const vSaved = localStorage.getItem(`wedding_platform_ver_${asset.id}`);
        if (vSaved) versions = JSON.parse(vSaved);
      } catch (e) {}

      if (versions.length === 0) {
        versions = [
          {
            id: asset.current_version_id || 'ver-1',
            asset_id: asset.id,
            version_number: 1,
            original_filename: asset.original_filename || `${asset.name}.mp4`,
            download_filename: asset.original_filename || `${asset.name}.mp4`,
            mime_type: asset.mime_type || 'video/mp4',
            size_bytes: asset.size_bytes || 7450000,
            duration_seconds: asset.duration_seconds || 15.2,
            created_at: asset.created_at,
          },
        ];
      }

      return {
        requiresPassphrase: Boolean(matchedLink.passphrase_hash && passphrase !== matchedLink.passphrase_hash),
        project: {
          name: proj.name,
          clientName: proj.client_name,
        },
        asset: {
          id: asset.id,
          name: asset.name,
          type: (asset.asset_type as any) || 'video',
          status: asset.status || 'ready_for_review',
          currentVersionId: versions[0].id,
        },
        permissions: {
          canComment: Boolean(matchedLink.can_comment),
          canDownload: Boolean(matchedLink.can_download),
          canApprove: Boolean(matchedLink.can_approve),
          showPreviousVersions: Boolean(matchedLink.show_previous_versions),
        },
        currentVersion: versions[0],
        versions,
        comments: DEMO_COMMENTS[versions[0].id] || [],
      };
    }

    // Resolve self-describing token (e.g. rev_...) for cross-origin or cold start client access
    const decoded = decodeReviewToken(token);
    if (decoded) {
      if (decoded.revoked_at) {
        throw new Error('This review link has been revoked by the studio.');
      }
      if (decoded.expires_at && new Date(decoded.expires_at) < new Date()) {
        throw new Error('This review link has expired.');
      }
      const astId = decoded.asset_id || decoded.astId || 'ast-1';
      const prjId = decoded.project_id || decoded.prjId || 'proj-1';
      const astName = decoded.asset_name || decoded.astName || 'Wedding Media Cut';
      const prjName = decoded.project_name || decoded.prjName || 'Wedding Film';
      const cliName = decoded.client_name || decoded.cliName || 'Wedding Client';

      const version: AssetVersion = {
        id: `ver-${astId}`,
        asset_id: astId,
        version_number: 1,
        original_filename: `${astName}.mp4`,
        download_filename: `${astName}.mp4`,
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
        created_at: decoded.created_at || new Date().toISOString(),
      };

      return {
        requiresPassphrase: Boolean(
          (decoded.passphrase_hash || decoded.pass) &&
          passphrase !== (decoded.passphrase_hash || decoded.pass)
        ),
        project: {
          name: prjName,
          clientName: cliName,
        },
        asset: {
          id: astId,
          name: astName,
          type: 'video',
          status: 'ready_for_review',
          currentVersionId: version.id,
        },
        permissions: {
          canComment: decoded.can_comment !== undefined ? Boolean(decoded.can_comment) : (decoded.com !== undefined ? Boolean(decoded.com) : true),
          canDownload: decoded.can_download !== undefined ? Boolean(decoded.can_download) : (decoded.dwn !== undefined ? Boolean(decoded.dwn) : true),
          canApprove: decoded.can_approve !== undefined ? Boolean(decoded.can_approve) : (decoded.app !== undefined ? Boolean(decoded.app) : true),
          showPreviousVersions: decoded.show_previous_versions !== undefined ? Boolean(decoded.show_previous_versions) : (decoded.prev !== undefined ? Boolean(decoded.prev) : true),
        },
        currentVersion: version,
        versions: [version],
        comments: [],
      };
    }

    // Only allow explicit demo tokens to fall back to the demo cut
    const isDemoToken = token === 'sharma-wedding-teaser-review' || token === 'demo-review-token';
    if (isDemoToken) {
      const asset = DEMO_ASSETS['demo-proj-1'][0];
      const version: AssetVersion = {
        id: 'demo-ver-1',
        asset_id: asset.id,
        version_number: 2,
        original_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        download_filename: 'WhatsApp Video 2026-07-29 at 15.25.53.mp4',
        mime_type: 'video/mp4',
        size_bytes: 7450000,
        duration_seconds: 15.2,
        created_at: '2026-07-29T11:00:00.000Z',
      };
      return {
        requiresPassphrase: false,
        project: {
          name: 'Sharma - Verma Wedding 2026',
          clientName: 'Rahul Sharma & Ananya Verma',
        },
        asset: {
          id: asset.id,
          name: asset.name,
          type: 'video',
          status: 'ready_for_review',
          currentVersionId: 'demo-ver-1',
        },
        permissions: {
          canComment: true,
          canDownload: true,
          canApprove: true,
          showPreviousVersions: true,
        },
        currentVersion: version,
        versions: [version],
        comments: DEMO_COMMENTS['demo-ver-1'] || [],
      };
    }

    // For any other token that cannot be resolved, throw an explicit error!
    throw new Error('This review link was not found or has expired.');
  },
  submitClientComment: async (token: string, data: any, passphrase?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (passphrase) headers['x-review-passphrase'] = passphrase;
      return await request<{ comment: Comment }>(`/review/${token}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    } catch (err) {
      const comment: Comment = {
        id: `cmt-${Date.now()}`,
        asset_version_id: data.versionId || 'demo-ver-1',
        author_name: data.authorName || 'Client Reviewer',
        body: data.body,
        time_seconds: data.timeSeconds ?? null,
        status: 'open',
        created_at: new Date().toISOString(),
      };
      return { comment };
    }
  },
  submitClientDecision: async (token: string, data: any, passphrase?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (passphrase) headers['x-review-passphrase'] = passphrase;
      return await request<{ decision: any; assetStatus: string }>(`/review/${token}/decision`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    } catch (err) {
      return {
        decision: {
          id: `dec-${Date.now()}`,
          decision: data.decision,
          message: data.message || '',
          reviewer_name: data.reviewerName || 'Client Reviewer',
          created_at: new Date().toISOString(),
        },
        assetStatus: data.decision === 'approved' ? 'approved' : 'changes_requested',
      };
    }
  },
  getClientMediaUrl: (token: string, versionId?: string, passphrase?: string) => {
    let url = `${API_BASE}/review/${token}/media`;
    const params = new URLSearchParams();
    if (versionId) params.set('versionId', versionId);
    if (passphrase) params.set('passphrase', passphrase);
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  },
  getClientDownloadUrl: (token: string, versionId: string, passphrase?: string) => {
    let url = `${API_BASE}/review/${token}/download/${versionId}`;
    if (passphrase) url += `?passphrase=${encodeURIComponent(passphrase)}`;
    return url;
  },
  getStaffMediaUrl: (assetId: string, versionId: string) => {
    const token = getAuthToken();
    return `${API_BASE}/assets/${assetId}/versions/${versionId}/media${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
