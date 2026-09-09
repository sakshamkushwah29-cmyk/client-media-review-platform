// IndexedDB storage service for caching and streaming uploaded media files (videos, images, PDFs)
// Enables zero-latency local playback and prevents missing file errors.

const DB_NAME = 'wedding_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function saveMediaBlob(key: string, blob: Blob | File): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to store media blob in IndexedDB:', err);
  }
}

export async function getMediaBlob(key: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve media blob from IndexedDB:', err);
    return null;
  }
}

// In-memory cache of object URLs to prevent duplicate allocations
const blobUrlCache = new Map<string, string>();

export async function getMediaBlobUrl(key: string): Promise<string | null> {
  if (blobUrlCache.has(key)) {
    return blobUrlCache.get(key)!;
  }

  const blob = await getMediaBlob(key);
  if (!blob) return null;

  try {
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(key, url);
    return url;
  } catch (e) {
    console.warn('Failed to create object URL for blob:', e);
    return null;
  }
}

export function revokeBlobUrl(key: string): void {
  const url = blobUrlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    blobUrlCache.delete(key);
  }
}

export async function hasMediaBlob(key: string): Promise<boolean> {
  const blob = await getMediaBlob(key);
  return blob !== null;
}
