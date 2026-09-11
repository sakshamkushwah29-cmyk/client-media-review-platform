import { CONFIG } from '../config';

export interface HovodAssetCreated {
  id: string;
  playbackId: string;
  status: string;
}

export interface HovodUploadUrlResponse {
  uploadUrl: string;
  sourceKey: string;
  method: string;
}

export interface HovodPlaybackData {
  manifestUrl: string;
  thumbnailUrl: string | null;
  thumbnailVttUrl?: string;
  playerUrl: string;
  title?: string;
  durationSec?: number;
}

export class HovodAdapter {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = (CONFIG.HOVOD_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
    this.apiKey = CONFIG.HOVOD_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});
    
    if (this.apiKey) {
      headers.set('X-API-Key', this.apiKey);
    }
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = (errBody as any)?.error || `Hovod request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    const json = (await res.json()) as { data?: T } & T;
    return (json.data !== undefined ? json.data : json) as T;
  }

  /**
   * Create an asset in Hovod.
   */
  async createAsset(title: string): Promise<HovodAssetCreated> {
    return this.request<HovodAssetCreated>('/v1/assets', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Request a direct presigned upload URL for an asset.
   */
  async getUploadUrl(assetId: string): Promise<HovodUploadUrlResponse> {
    return this.request<HovodUploadUrlResponse>(`/v1/assets/${assetId}/upload-url`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * Mark upload complete in Hovod.
   */
  async completeUpload(assetId: string): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>(`/v1/assets/${assetId}/upload-complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * Trigger multi-rung HLS transcoding and AI processing in Hovod.
   */
  async processAsset(assetId: string): Promise<any> {
    return this.request(`/v1/assets/${assetId}/process`, {
      method: 'POST',
      body: JSON.stringify({
        aiOptions: {
          transcription: true,
          subtitles: true,
          chapters: true,
        },
      }),
    }).catch((err) => {
      console.warn(`Hovod processing trigger notice for ${assetId}:`, err.message);
      return null;
    });
  }

  /**
   * Retrieve public HLS playback info for an asset playbackId.
   */
  async getPlaybackInfo(playbackId: string): Promise<HovodPlaybackData | null> {
    try {
      return await this.request<HovodPlaybackData>(`/v1/playback/${playbackId}`, {
        method: 'GET',
      });
    } catch (err: any) {
      console.warn(`Hovod playback fetch failed for ${playbackId}:`, err.message);
      return null;
    }
  }

  /**
   * Retrieve original or transcode download URL.
   */
  async getDownloadUrl(assetId: string): Promise<string | null> {
    try {
      const res = await this.request<{ downloadUrl: string }>(`/v1/assets/${assetId}/download`, {
        method: 'GET',
      });
      return res.downloadUrl || null;
    } catch (err: any) {
      console.warn(`Hovod download URL fetch failed for ${assetId}:`, err.message);
      return null;
    }
  }

  /**
   * Delete asset from Hovod.
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      await this.request(`/v1/assets/${assetId}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }
}

export const hovodAdapter = new HovodAdapter();
