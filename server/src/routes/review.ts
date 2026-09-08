import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { db } from '../db';
import { hashToken, comparePassword } from '../utils/tokens';
import { driveAdapter } from '../storage/driveAdapter';
import { logActivity } from '../utils/activity';

const router = Router();

// Helper to resolve and validate review link
async function resolveReviewLink(token: string, passphrase?: string): Promise<{ link: any; error?: string; status?: number; requiresPassphrase?: boolean }> {
  if (!token) {
    return { error: 'Missing review token', status: 400 };
  }

  const tokenHash = hashToken(token);
  const link = db.query(`
    SELECT rl.*, p.organization_id, p.name as project_name, p.client_name
    FROM review_links rl
    JOIN projects p ON rl.project_id = p.id
    WHERE rl.token_hash = ?
  `).get(tokenHash) as any;

  if (!link) {
    return { error: 'Review link not found or invalid', status: 404 };
  }

  // Check revocation (PRD LINK-08, LINK-09)
  if (link.revoked_at) {
    return { error: 'This review link has been revoked by the studio.', status: 403 };
  }

  // Check expiration (PRD LINK-04, LINK-09)
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { error: 'This review link has expired.', status: 403 };
  }

  // Check passphrase (PRD LINK-05)
  if (link.passphrase_hash) {
    if (!passphrase) {
      return { link, requiresPassphrase: true };
    }
    const isPassValid = await comparePassword(passphrase, link.passphrase_hash);
    if (!isPassValid) {
      return { error: 'Invalid passphrase', status: 401, requiresPassphrase: true };
    }
  }

  return { link };
}

// 1. Resolve review link details for client
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const passphrase = (req.headers['x-review-passphrase'] as string) || (req.query.passphrase as string);

    const resolved = await resolveReviewLink(token, passphrase);
    if (resolved.error) {
      return res.status(resolved.status || 400).json({
        error: resolved.error,
        requiresPassphrase: resolved.requiresPassphrase || false,
      });
    }

    const link = resolved.link;

    if (resolved.requiresPassphrase) {
      return res.json({
        requiresPassphrase: true,
        projectName: link.project_name,
        clientName: link.client_name,
      });
    }

    // Fetch the asset
    const asset = db.query(`
      SELECT id, project_id, name, asset_type, status, current_version_id
      FROM assets
      WHERE id = ?
    `).get(link.asset_id) as any;

    if (!asset) {
      return res.status(404).json({ error: 'Asset no longer available' });
    }

    // Fetch versions allowed by link
    let versions: any[] = [];
    if (link.show_previous_versions) {
      versions = db.query(`
        SELECT id, asset_id, version_number, download_filename, mime_type, size_bytes, duration_seconds, created_at
        FROM asset_versions
        WHERE asset_id = ?
        ORDER BY version_number DESC
      `).all(asset.id);
    } else {
      // Only current version
      versions = db.query(`
        SELECT id, asset_id, version_number, download_filename, mime_type, size_bytes, duration_seconds, created_at
        FROM asset_versions
        WHERE id = ?
      `).all(asset.current_version_id);
    }

    const currentVersion = versions.find((v: any) => v.id === asset.current_version_id) || versions[0];

    // Fetch comments for all visible versions
    const versionIds = versions.map((v: any) => v.id);
    let comments: any[] = [];
    if (versionIds.length > 0) {
      const placeholders = versionIds.map(() => '?').join(',');
      comments = db.query(`
        SELECT id, asset_version_id, author_name, body, time_seconds, x_percent, y_percent, status, created_at
        FROM comments
        WHERE asset_version_id IN (${placeholders})
        ORDER BY time_seconds ASC, created_at ASC
      `).all(...versionIds);
    }

    // Fetch latest review decision if any
    const latestDecision = db.query(`
      SELECT decision, message, reviewer_name, created_at, asset_version_id
      FROM review_decisions
      WHERE asset_version_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(currentVersion?.id);

    return res.json({
      requiresPassphrase: false,
      project: {
        name: link.project_name,
        clientName: link.client_name,
      },
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.asset_type,
        status: asset.status,
        currentVersionId: asset.current_version_id,
      },
      permissions: {
        canComment: Boolean(link.can_comment),
        canDownload: Boolean(link.can_download),
        canApprove: Boolean(link.can_approve),
        showPreviousVersions: Boolean(link.show_previous_versions),
      },
      currentVersion,
      versions,
      comments,
      latestDecision,
    });
  } catch (err: any) {
    console.error('Resolve review error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. Stream media preview for client video player (supports HTTP 206 Partial Range requests)
router.get('/:token/media', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const versionId = req.query.versionId as string;
    const passphrase = (req.headers['x-review-passphrase'] as string) || (req.query.passphrase as string);

    const resolved = await resolveReviewLink(token, passphrase);
    if (resolved.error || resolved.requiresPassphrase) {
      return res.status(resolved.status || 401).json({ error: resolved.error || 'Passphrase required' });
    }

    const link = resolved.link;

    // Get targeted version or current version
    let version: any;
    if (versionId) {
      version = db.query(`
        SELECT av.*
        FROM asset_versions av
        WHERE av.id = ? AND av.asset_id = ?
      `).get(versionId, link.asset_id);
    } else {
      const asset = db.query(`SELECT current_version_id FROM assets WHERE id = ?`).get(link.asset_id) as any;
      version = db.query(`SELECT * FROM asset_versions WHERE id = ?`).get(asset.current_version_id);
    }

    if (!version) {
      return res.status(404).json({ error: 'Media version not found' });
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
    console.error('Client media stream error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Failed to stream media' });
    }
  }
});

// 3. Create client feedback comment (PRD Section 6.3, 7.7)
router.post('/:token/comments', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { versionId, authorName, body, timeSeconds, xPercent, yPercent } = req.body;
    const passphrase = (req.headers['x-review-passphrase'] as string) || (req.query.passphrase as string);

    const resolved = await resolveReviewLink(token, passphrase);
    if (resolved.error || resolved.requiresPassphrase) {
      return res.status(resolved.status || 401).json({ error: resolved.error || 'Passphrase required' });
    }

    const link = resolved.link;
    if (!link.can_comment) {
      return res.status(403).json({ error: 'Commenting is disabled for this review link' });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment message is required' });
    }

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const cleanAuthor = authorName && authorName.trim() ? authorName.trim() : (link.client_name || 'Client Reviewer');

    // Target version
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const asset = db.query(`SELECT current_version_id FROM assets WHERE id = ?`).get(link.asset_id) as any;
      targetVersionId = asset.current_version_id;
    }

    // Video comments store timestamp in seconds (PRD COMMENT-02)
    const timeSec = timeSeconds !== undefined && timeSeconds !== null ? parseFloat(timeSeconds) : null;

    db.run(`
      INSERT INTO comments (
        id, asset_version_id, review_link_id, author_user_id,
        author_name, body, time_seconds, x_percent, y_percent,
        status, created_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'open', ?)
    `, [
      commentId,
      targetVersionId,
      link.id,
      cleanAuthor,
      body.trim(),
      timeSec,
      xPercent || null,
      yPercent || null,
      now,
    ]);

    logActivity({
      organizationId: link.organization_id,
      projectId: link.project_id,
      actorName: cleanAuthor,
      eventType: 'comment',
      objectId: commentId,
      metadata: {
        assetId: link.asset_id,
        versionId: targetVersionId,
        timeSeconds: timeSec,
        commentSnippet: body.trim().slice(0, 80),
      },
    });

    const createdComment = db.query(`SELECT * FROM comments WHERE id = ?`).get(commentId);
    return res.status(201).json({ comment: createdComment });
  } catch (err: any) {
    console.error('Create comment error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit comment' });
  }
});

// 4. Submit review decision (Approve or Request Changes) (PRD Section 7.8)
router.post('/:token/decision', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { decision, message, reviewerName, versionId } = req.body;
    const passphrase = (req.headers['x-review-passphrase'] as string) || (req.query.passphrase as string);

    const resolved = await resolveReviewLink(token, passphrase);
    if (resolved.error || resolved.requiresPassphrase) {
      return res.status(resolved.status || 401).json({ error: resolved.error || 'Passphrase required' });
    }

    const link = resolved.link;
    if (!link.can_approve) {
      return res.status(403).json({ error: 'Review decision submission is disabled for this review link' });
    }

    if (!['approved', 'changes_requested'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approved" or "changes_requested"' });
    }

    // Determine targeted version
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const asset = db.query(`SELECT current_version_id FROM assets WHERE id = ?`).get(link.asset_id) as any;
      targetVersionId = asset.current_version_id;
    }

    const decisionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const clientReviewerName = reviewerName && reviewerName.trim() ? reviewerName.trim() : (link.client_name || 'Client Reviewer');

    // Store decision against the exact version (PRD APPROVE-04)
    db.run(`
      INSERT INTO review_decisions (id, asset_version_id, review_link_id, decision, message, reviewer_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [decisionId, targetVersionId, link.id, decision, message ? message.trim() : null, clientReviewerName, now]);

    // Update asset status
    const newAssetStatus = decision === 'approved' ? 'approved' : 'changes_requested';
    db.run(`UPDATE assets SET status = ? WHERE id = ?`, [newAssetStatus, link.asset_id]);

    logActivity({
      organizationId: link.organization_id,
      projectId: link.project_id,
      actorName: clientReviewerName,
      eventType: decision === 'approved' ? 'approval' : 'changes_requested',
      objectId: decisionId,
      metadata: {
        assetId: link.asset_id,
        versionId: targetVersionId,
        decision,
        message: message ? message.trim() : null,
      },
    });

    const recordedDecision = db.query(`SELECT * FROM review_decisions WHERE id = ?`).get(decisionId);

    return res.status(201).json({
      decision: recordedDecision,
      assetStatus: newAssetStatus,
    });
  } catch (err: any) {
    console.error('Submit decision error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit review decision' });
  }
});

// 5. Authorized file download (PRD Section 6.5, 7.9 DOWNLOAD-01 to DOWNLOAD-08)
router.get('/:token/download/:versionId', async (req: Request, res: Response) => {
  try {
    const { token, versionId } = req.params;
    const passphrase = (req.headers['x-review-passphrase'] as string) || (req.query.passphrase as string);

    const resolved = await resolveReviewLink(token, passphrase);
    if (resolved.error || resolved.requiresPassphrase) {
      return res.status(resolved.status || 401).json({ error: resolved.error || 'Passphrase required' });
    }

    const link = resolved.link;

    // PRD DOWNLOAD-03: The application checks the link's download permission before every download
    if (!link.can_download) {
      return res.status(403).json({ error: 'Downloads are not permitted for this review link' });
    }

    // Verify version belongs to this asset
    const version = db.query(`
      SELECT *
      FROM asset_versions
      WHERE id = ? AND asset_id = ?
    `).get(versionId, link.asset_id) as any;

    if (!version) {
      return res.status(404).json({ error: 'Selected asset version not found' });
    }

    // Retrieve file from Google Drive storage (PRD DOWNLOAD-04)
    const fileData = await driveAdapter.getFileForDownload(version.drive_file_id);

    // Record download event (PRD DOWNLOAD-06)
    logActivity({
      organizationId: link.organization_id,
      projectId: link.project_id,
      actorName: link.client_name || 'Client Reviewer',
      eventType: 'download',
      objectId: version.id,
      metadata: {
        assetId: link.asset_id,
        versionNumber: version.version_number,
        filename: version.download_filename,
        sizeBytes: fileData.size,
      },
    });

    // Set download headers with client-facing filename (PRD DOWNLOAD-05)
    const encodedFilename = encodeURIComponent(version.download_filename || version.original_filename);
    res.setHeader('Content-Disposition', `attachment; filename="${version.download_filename || version.original_filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fileData.size);

    const fileStream = fs.createReadStream(fileData.filePath);
    fileStream.pipe(res);
  } catch (err: any) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Download failed' });
    }
  }
});

export default router;
