import { Router, Response } from 'express';
import { db } from '../db';
import { requireStaffAuth, AuthRequest } from '../middleware/auth';
import { CONFIG } from '../config';
import { driveAdapter } from '../storage/driveAdapter';

const router = Router();

// Storage usage metrics and quota
router.get('/usage', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;

    // Recalculate accurately from database
    const usedBytes = driveAdapter.recalculateOrgStorage(orgId);

    const org = db.query(`
      SELECT name, drive_root_folder_id, storage_quota_bytes, storage_used_bytes
      FROM organizations
      WHERE id = ?
    `).get(orgId) as any;

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const quotaBytes = org.storage_quota_bytes || CONFIG.DEFAULT_QUOTA_BYTES;
    const usedPercentage = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
    const remainingBytes = Math.max(0, quotaBytes - usedBytes);

    const isWarning = usedPercentage >= CONFIG.WARNING_THRESHOLD_PERCENT; // 80%
    const isBlocking = usedPercentage >= CONFIG.BLOCKING_THRESHOLD_PERCENT; // 95%

    return res.json({
      organization: {
        id: orgId,
        name: org.name,
        driveRootFolderId: org.drive_root_folder_id,
        cloudStorageUrl: CONFIG.CLOUD_STORAGE_URL,
      },
      storage: {
        quotaBytes,
        quotaGb: (quotaBytes / (1024 * 1024 * 1024)).toFixed(1),
        usedBytes,
        usedGb: (usedBytes / (1024 * 1024 * 1024)).toFixed(2),
        usedPercentage: Math.min(100, parseFloat(usedPercentage.toFixed(2))),
        remainingBytes,
        remainingGb: (remainingBytes / (1024 * 1024 * 1024)).toFixed(2),
        warningThreshold: CONFIG.WARNING_THRESHOLD_PERCENT,
        blockingThreshold: CONFIG.BLOCKING_THRESHOLD_PERCENT,
        isWarning,
        isBlocking,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET all files across all projects in the organization (Storage Section)
router.get('/files', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;

    const files = db.query(`
      SELECT 
        av.id as version_id,
        av.version_number,
        av.original_filename,
        av.download_filename,
        av.mime_type,
        av.size_bytes,
        av.duration_seconds,
        av.drive_file_id,
        av.created_at,
        a.id as asset_id,
        a.name as asset_name,
        a.asset_type,
        a.status as asset_status,
        p.id as project_id,
        p.name as project_name,
        p.client_name,
        p.drive_folder_id,
        (
          SELECT rl.raw_token_display 
          FROM review_links rl 
          WHERE rl.asset_id = a.id AND rl.revoked_at IS NULL 
          ORDER BY rl.created_at DESC 
          LIMIT 1
        ) as review_token
      FROM asset_versions av
      JOIN assets a ON av.asset_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE p.organization_id = ?
      ORDER BY av.created_at DESC
    `).all(orgId);

    return res.json({
      files,
      cloudStorageUrl: CONFIG.CLOUD_STORAGE_URL,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list storage files' });
  }
});

// GET all notifications / activity events across all projects
router.get('/notifications', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;

    const notifications = db.query(`
      SELECT 
        ae.*,
        p.name as project_name,
        p.client_name,
        (
          SELECT a.id 
          FROM assets a 
          WHERE a.id = ae.object_id OR a.current_version_id = ae.object_id OR a.project_id = ae.project_id 
          LIMIT 1
        ) as target_asset_id
      FROM activity_events ae
      JOIN projects p ON ae.project_id = p.id
      WHERE ae.organization_id = ?
      ORDER BY ae.created_at DESC
      LIMIT 100
    `).all(orgId);

    return res.json({ notifications });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get notifications' });
  }
});

export default router;
