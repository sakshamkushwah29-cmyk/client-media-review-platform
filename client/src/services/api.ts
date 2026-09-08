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

const API_BASE = '/api';

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

export const api = {
  // Auth
  login: (data: any) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  syncClerkUser: (data: { email: string; fullName?: string; clerkId: string }) =>
    request<{ token: string; user: User }>('/auth/clerk-sync', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<{ user: User }>('/auth/me'),

  // Org & Storage Quota
  getStorageUsage: () => request<OrganizationUsage>('/organization/usage'),
  getStorageFiles: () => request<{ files: any[]; cloudStorageUrl: string }>('/organization/files'),
  getNotifications: () => request<{ notifications: any[] }>('/organization/notifications'),

  // Projects
  getProjects: () => request<{ projects: Project[] }>('/projects'),
  getProject: (id: string) => request<{ project: Project; assets: Asset[] }>(`/projects/${id}`),
  createProject: (data: { name: string; clientName: string; description?: string }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getProjectActivity: (id: string) => request<{ activities: any[] }>(`/projects/${id}/activity`),

  // Assets
  uploadAsset: (projectId: string, formData: FormData) =>
    request<{ asset: Asset; currentVersion: AssetVersion }>(`/projects/${projectId}/assets`, {
      method: 'POST',
      body: formData,
    }),
  getAsset: (id: string) => request<{ asset: Asset; currentVersion: AssetVersion; versions: AssetVersion[] }>(`/assets/${id}`),
  uploadNewVersion: (assetId: string, formData: FormData) =>
    request<{ asset: Asset; version: AssetVersion }>(`/assets/${assetId}/versions`, {
      method: 'POST',
      body: formData,
    }),
  updateAssetStatus: (id: string, status: string) =>
    request<{ asset: Asset }>(`/assets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Review links
  createReviewLink: (assetId: string, data: any) =>
    request<{ reviewLink: ReviewLink }>(`/assets/${assetId}/review-links`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReviewLinks: (assetId: string) =>
    request<{ reviewLinks: ReviewLink[] }>(`/assets/${assetId}/review-links`),
  revokeReviewLink: (id: string) =>
    request<{ success: boolean }>(`/review-links/${id}`, { method: 'DELETE' }),

  // Comments (Staff Workflow)
  getVersionComments: (versionId: string) =>
    request<{ comments: Comment[] }>(`/comments/version/${versionId}`),
  addStaffComment: (versionId: string, data: { body: string; timeSeconds?: number | null; authorName?: string }) =>
    request<{ comment: Comment }>(`/comments/version/${versionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCommentStatus: (commentId: string, status: 'open' | 'in_progress' | 'done') =>
    request<{ comment: Comment; statusEvent: any }>(`/comments/${commentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getCommentHistory: (commentId: string) =>
    request<{ history: any[] }>(`/comments/${commentId}/history`),

  // Client Review Room
  getClientReview: (token: string, passphrase?: string) => {
    const headers: Record<string, string> = {};
    if (passphrase) headers['x-review-passphrase'] = passphrase;
    return request<ClientReviewData>(`/review/${token}`, { headers });
  },
  submitClientComment: (token: string, data: any, passphrase?: string) => {
    const headers: Record<string, string> = {};
    if (passphrase) headers['x-review-passphrase'] = passphrase;
    return request<{ comment: Comment }>(`/review/${token}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  },
  submitClientDecision: (token: string, data: any, passphrase?: string) => {
    const headers: Record<string, string> = {};
    if (passphrase) headers['x-review-passphrase'] = passphrase;
    return request<{ decision: any; assetStatus: string }>(`/review/${token}/decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  },
  getClientMediaUrl: (token: string, versionId?: string, passphrase?: string) => {
    let url = `/api/review/${token}/media`;
    const params = new URLSearchParams();
    if (versionId) params.set('versionId', versionId);
    if (passphrase) params.set('passphrase', passphrase);
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  },
  getClientDownloadUrl: (token: string, versionId: string, passphrase?: string) => {
    let url = `/api/review/${token}/download/${versionId}`;
    if (passphrase) url += `?passphrase=${encodeURIComponent(passphrase)}`;
    return url;
  },
  getStaffMediaUrl: (assetId: string, versionId: string) => {
    const token = getAuthToken();
    return `/api/assets/${assetId}/versions/${versionId}/media${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
