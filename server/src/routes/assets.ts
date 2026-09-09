import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { requireStaffAuth, AuthRequest } from '../middleware/auth';
import { driveAdapter } from '../storage/driveAdapter';
import { logActivity } from '../utils/activity';
import { generateReviewToken, hashToken, hashPassword } from '../utils/tokens';

const router = Router();

// Multer temporary upload directory
const tempUploadDir = path.resolve(process.cwd(), '.tmp_uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const upload = multer({
  dest: tempUploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10 GB file limit per asset
  },
  fileFilter: (req, file, cb) => {
    // PRD FILE-02: MVP supported formats are MP4 video, JPG, PNG, and PDF
    const allowedMime = [
      'video/mp4',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (allowedMime.includes(file.mimetype) || file.originalname.match(/\.(mp4|jpg|jpeg|png|webp|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. MVP supports MP4 video, JPG, PNG, and PDF.'));
    }
  },
});

// Helper to determine asset type
function getAssetType(mimetype: string, filename: string): 'video' | 'image' | 'pdf' | 'other' {
  if (mimetype.startsWith('video/') || filename.endsWith('.mp4')) return 'video';
  if (mimetype.startsWith('image/') || filename.match(/\.(jpg|jpeg|png|webp)$/i)) return 'image';
  if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf';
  return 'other';
}

// 1. Upload new asset to project
router.post('/projects/:projectId/assets', requireStaffAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const file = req.file;
  const tempPath = file ? file.path : null;

  try {
    const { projectId } = req.params;
    const { name } = req.body;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Verify project belongs to user org
    const project = db.query(`SELECT * FROM projects WHERE id = ? AND organization_id = ?`).get(projectId, orgId) as any;
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check storage quota before uploading (PRD FILE-03, FILE-04)
    const quotaCheck = await driveAdapter.checkQuota(orgId, file.size);
    if (!quotaCheck.allowed) {
      return res.status(400).json({
        error: `Upload blocked: Exceeds 150 GB organization quota. Current usage: ${(quotaCheck.currentUsage / 1e9).toFixed(2)} GB.`,
      });
    }

    const assetName = name ? name.trim() : path.parse(file.originalname).name;
    const assetType = getAssetType(file.mimetype, file.originalname);
    const assetId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Upload to Google Drive storage location
    const driveUpload = await driveAdapter.uploadFile(
      orgId,
      project.drive_folder_id,
      file.path,
      file.originalname,
      file.mimetype
    );

    // Create Asset record
    db.run(`
      INSERT INTO assets (id, project_id, name, asset_type, status, current_version_id, created_by, created_at)
      VALUES (?, ?, ?, ?, 'ready_for_review', ?, ?, ?)
    `, [assetId, projectId, assetName, assetType, versionId, userId, now]);

    // Create Version 1 record (PRD ASSET-02, ASSET-03)
    db.run(`
      INSERT INTO asset_versions (id, asset_id, version_number, drive_file_id, original_filename, download_filename, mime_type, size_bytes, duration_seconds, uploaded_by, created_at)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, 0, ?, ?)
    `, [
      versionId,
      assetId,
      driveUpload.fileId,
      file.originalname,
      file.originalname,
      file.mimetype,
      driveUpload.sizeBytes,
      userId,
      now,
    ]);

    logActivity({
      organizationId: orgId,
      projectId,
      actorUserId: userId,
      actorName: req.user!.fullName,
      eventType: 'upload',
      objectId: assetId,
      metadata: {
        assetName,
        version: 1,
        filename: file.originalname,
        sizeBytes: driveUpload.sizeBytes,
        driveFileId: driveUpload.fileId,
      },
    });

    // Auto-create default review link for immediate sharing
    const rawToken = generateReviewToken();
    const tokenHash = hashToken(rawToken);
    const linkId = crypto.randomUUID();
    db.run(`
      INSERT INTO review_links (
        id, project_id, asset_id, token_hash, raw_token_display,
        can_comment, can_download, can_approve, show_previous_versions,
        passphrase_hash, expires_at, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1, NULL, NULL, ?, ?)
    `, [linkId, projectId, assetId, tokenHash, rawToken, userId, now]);

    const createdAsset = db.query(`SELECT * FROM assets WHERE id = ?`).get(assetId);
    const createdVersion = db.query(`SELECT * FROM asset_versions WHERE id = ?`).get(versionId);

    return res.status(201).json({ asset: createdAsset, currentVersion: createdVersion });
  } catch (err: any) {
    console.error('Upload asset error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload asset' });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {}
    }
  }
});

// 2. Upload new version to existing asset (PRD Section 6.4, ASSET-02)
router.post('/assets/:id/versions', requireStaffAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const file = req.file;
  const tempPath = file ? file.path : null;

  try {
    const assetId = req.params.id;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const asset = db.query(`
      SELECT a.*, p.organization_id, p.drive_folder_id, p.id as project_id
      FROM assets a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ? AND p.organization_id = ?
    `).get(assetId, orgId) as any;

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check quota
    const quotaCheck = await driveAdapter.checkQuota(orgId, file.size);
    if (!quotaCheck.allowed) {
      return res.status(400).json({
        error: `Upload blocked: Exceeds 150 GB quota. Current usage: ${(quotaCheck.currentUsage / 1e9).toFixed(2)} GB.`,
      });
    }

    // Get current max version number
    const maxVerRow = db.query(`SELECT MAX(version_number) as max_ver FROM asset_versions WHERE asset_id = ?`).get(assetId) as any;
    const newVersionNumber = (maxVerRow?.max_ver || 0) + 1;

    // Upload new binary to Google Drive
    const driveUpload = await driveAdapter.uploadFile(
      orgId,
      asset.drive_folder_id,
      file.path,
      file.originalname,
      file.mimetype
    );

    const versionId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert new version
    db.run(`
      INSERT INTO asset_versions (id, asset_id, version_number, drive_file_id, original_filename, download_filename, mime_type, size_bytes, duration_seconds, uploaded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, [
      versionId,
      assetId,
      newVersionNumber,
      driveUpload.fileId,
      file.originalname,
      file.originalname,
      file.mimetype,
      driveUpload.sizeBytes,
      userId,
      now,
    ]);

    // Update asset current version and reset status to 'ready_for_review' (PRD APPROVE-05)
    db.run(`
      UPDATE assets 
      SET current_version_id = ?, status = 'ready_for_review'
      WHERE id = ?
    `, [versionId, assetId]);

    logActivity({
      organizationId: orgId,
      projectId: asset.project_id,
      actorUserId: userId,
      actorName: req.user!.fullName,
      eventType: 'version_created',
      objectId: assetId,
      metadata: {
        versionNumber: newVersionNumber,
        originalFilename: file.originalname,
        sizeBytes: driveUpload.sizeBytes,
        driveFileId: driveUpload.fileId,
      },
    });

    const updatedAsset = db.query(`SELECT * FROM assets WHERE id = ?`).get(assetId);
    const versionRecord = db.query(`SELECT * FROM asset_versions WHERE id = ?`).get(versionId);

    return res.status(201).json({
      asset: updatedAsset,
      version: versionRecord,
    });
  } catch (err: any) {
    console.error('Upload version error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload new version' });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {}
    }
  }
});

// 3. Get asset and current version with all versions
router.get('/assets/:id', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const assetId = req.params.id;
    const orgId = req.user!.organizationId;

    const asset = db.query(`
      SELECT a.*, p.name as project_name, p.client_name, p.organization_id
      FROM assets a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ? AND p.organization_id = ?
    `).get(assetId, orgId) as any;

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const versions = db.query(`
      SELECT av.*, prof.full_name as uploader_name
      FROM asset_versions av
      LEFT JOIN profiles prof ON av.uploaded_by = prof.id
      WHERE av.asset_id = ?
      ORDER BY av.version_number DESC
    `).all(assetId);

    const currentVersion = versions.find((v: any) => v.id === asset.current_version_id) || versions[0];

    return res.json({ asset, currentVersion, versions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get asset' });
  }
});

// 4. Get version history
router.get('/assets/:id/versions', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const assetId = req.params.id;
    const orgId = req.user!.organizationId;

    const asset = db.query(`
      SELECT a.id 
      FROM assets a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ? AND p.organization_id = ?
    `).get(assetId, orgId);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const versions = db.query(`
      SELECT av.*, prof.full_name as uploader_name,
        (SELECT COUNT(*) FROM comments c WHERE c.asset_version_id = av.id) as comment_count,
        (SELECT COUNT(*) FROM review_decisions rd WHERE rd.asset_version_id = av.id) as decision_count
      FROM asset_versions av
      LEFT JOIN profiles prof ON av.uploaded_by = prof.id
      WHERE av.asset_id = ?
      ORDER BY av.version_number DESC
    `).all(assetId);

    return res.json({ versions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get versions' });
  }
});

// 5. Update asset status (e.g., mark delivered)
router.patch('/assets/:id/status', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const assetId = req.params.id;
    const orgId = req.user!.organizationId;
    const { status } = req.body;

    const validStatuses = ['draft', 'ready_for_review', 'changes_requested', 'approved', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid asset status' });
    }

    const asset = db.query(`
      SELECT a.*, p.id as project_id
      FROM assets a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ? AND p.organization_id = ?
    `).get(assetId, orgId) as any;

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    db.run(`UPDATE assets SET status = ? WHERE id = ?`, [status, assetId]);

    if (status === 'delivered') {
      logActivity({
        organizationId: orgId,
        projectId: asset.project_id,
        actorUserId: req.user!.id,
        actorName: req.user!.fullName,
        eventType: 'asset_delivered',
        objectId: assetId,
        metadata: { assetName: asset.name, previousStatus: asset.status, newStatus: status },
      });
    }

    const updated = db.query(`SELECT * FROM assets WHERE id = ?`).get(assetId);
    return res.json({ asset: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update asset status' });
  }
});

// 6. Create review link (PRD Section 6.2, 7.5 LINK-01 to LINK-08)
router.post('/assets/:id/review-links', requireStaffAuth, async (req: AuthRequest, res: Response) => {
  try {
    const assetId = req.params.id;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;
    const {
      canComment = true,
      canDownload = true,
      canApprove = true,
      showPreviousVersions = true,
      passphrase,
      expiresAt,
    } = req.body;

    const asset = db.query(`
      SELECT a.*, p.id as project_id
      FROM assets a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ? AND p.organization_id = ?
    `).get(assetId, orgId) as any;

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Cryptographically random token (PRD LINK-06, LINK-07) or client-supplied token
    const rawToken = (req.body.token && typeof req.body.token === 'string' && req.body.token.trim()) || generateReviewToken();
    const tokenHash = hashToken(rawToken);
    const linkId = crypto.randomUUID();
    const now = new Date().toISOString();

    let passphraseHash = null;
    if (passphrase && passphrase.trim().length > 0) {
      passphraseHash = await hashPassword(passphrase.trim());
    }

    db.run(`
      INSERT INTO review_links (
        id, project_id, asset_id, token_hash, raw_token_display,
        can_comment, can_download, can_approve, show_previous_versions,
        passphrase_hash, expires_at, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      linkId,
      asset.project_id,
      assetId,
      tokenHash,
      rawToken, // displayed to staff for easy copying
      canComment ? 1 : 0,
      canDownload ? 1 : 0,
      canApprove ? 1 : 0,
      showPreviousVersions ? 1 : 0,
      passphraseHash,
      expiresAt || null,
      userId,
      now,
    ]);

    logActivity({
      organizationId: orgId,
      projectId: asset.project_id,
      actorUserId: userId,
      actorName: req.user!.fullName,
      eventType: 'review_link_created',
      objectId: linkId,
      metadata: { assetId, canComment, canDownload, canApprove, hasPassphrase: !!passphraseHash, expiresAt },
    });

    const linkRecord = db.query(`
      SELECT rl.*, a.name as asset_name, p.name as project_name, p.client_name
      FROM review_links rl
      JOIN assets a ON rl.asset_id = a.id
      JOIN projects p ON rl.project_id = p.id
      WHERE rl.id = ?
    `).get(linkId) as any;

    return res.status(201).json({
      reviewLink: {
        ...linkRecord,
        rawToken, // Sent once for user copy
        raw_token_display: rawToken,
        shareUrl: `/review/${rawToken}`,
      },
    });
  } catch (err: any) {
    console.error('Create review link error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create review link' });
  }
});

// 7. List review links for asset
router.get('/assets/:id/review-links', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const assetId = req.params.id;
    const orgId = req.user!.organizationId;

    const links = db.query(`
      SELECT rl.*, prof.full_name as creator_name, a.name as asset_name, p.name as project_name, p.client_name
      FROM review_links rl
      JOIN projects p ON rl.project_id = p.id
      JOIN assets a ON rl.asset_id = a.id
      LEFT JOIN profiles prof ON rl.created_by = prof.id
      WHERE rl.asset_id = ? AND p.organization_id = ?
      ORDER BY rl.created_at DESC
    `).all(assetId, orgId);

    return res.json({ reviewLinks: links });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list review links' });
  }
});

// 7.1. List all review links for organization (Dashboard & Storage Vault)
router.get('/review-links', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;

    const links = db.query(`
      SELECT rl.*, prof.full_name as creator_name, a.name as asset_name, p.name as project_name, p.client_name
      FROM review_links rl
      JOIN projects p ON rl.project_id = p.id
      JOIN assets a ON rl.asset_id = a.id
      LEFT JOIN profiles prof ON rl.created_by = prof.id
      WHERE p.organization_id = ?
      ORDER BY rl.created_at DESC
    `).all(orgId);

    return res.json({ reviewLinks: links });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list review links' });
  }
});

// 8. Revoke review link (PRD LINK-08)
router.delete('/review-links/:id', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const linkId = req.params.id;
    const orgId = req.user!.organizationId;

    const link = db.query(`
      SELECT rl.*, p.organization_id
      FROM review_links rl
      JOIN projects p ON rl.project_id = p.id
      WHERE (rl.id = ? OR rl.raw_token_display = ?) AND p.organization_id = ?
    `).get(linkId, linkId, orgId) as any;

    if (!link) {
      return res.status(404).json({ error: 'Review link not found' });
    }

    const now = new Date().toISOString();
    db.run(`UPDATE review_links SET revoked_at = ? WHERE id = ?`, [now, link.id]);

    logActivity({
      organizationId: orgId,
      projectId: link.project_id,
      actorUserId: req.user!.id,
      actorName: req.user!.fullName,
      eventType: 'review_link_revoked',
      objectId: link.id,
      metadata: { assetId: link.asset_id },
    });

    return res.json({ success: true, message: 'Review link revoked' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to revoke review link' });
  }
});

// 9. Stream media preview for staff user
router.get('/assets/:id/versions/:versionId/media', requireStaffAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id: assetId, versionId } = req.params;
    const orgId = req.user!.organizationId;

    const version = db.query(`
      SELECT av.*
      FROM asset_versions av
      JOIN assets a ON av.asset_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE av.id = ? AND a.id = ? AND p.organization_id = ?
    `).get(versionId, assetId, orgId) as any;

    if (!version) {
      return res.status(404).json({ error: 'Asset version not found' });
    }

    const range = req.headers.range;
    const streamData = await driveAdapter.getFileStream(version.drive_file_id, range);

    res.writeHead(streamData.isPartial ? 206 : 200, {
      'Content-Range': streamData.contentRange || `bytes 0-${streamData.totalSize - 1}/${streamData.totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': streamData.contentLength,
      'Content-Type': streamData.mimeType,
      'Cache-Control': 'no-cache',
    });

    streamData.stream.pipe(res);
  } catch (err: any) {
    console.error('Media stream error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Failed to stream media' });
    }
  }
});

export default router;
