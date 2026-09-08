import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { requireStaffAuth, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activity';

const router = Router();

// Staff changes comment status (PRD COMMENT-06, COMMENT-07, COMMENT-08, 7.7.1)
router.patch('/:id/status', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.id;
    const { status } = req.body;
    const userId = req.user!.id;
    const orgId = req.user!.organizationId;

    if (!['open', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "open", "in_progress", or "done"' });
    }

    // Verify comment belongs to user's organization
    const comment = db.query(`
      SELECT c.*, a.id as asset_id, p.id as project_id, p.organization_id
      FROM comments c
      JOIN asset_versions av ON c.asset_version_id = av.id
      JOIN assets a ON av.asset_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE c.id = ? AND p.organization_id = ?
    `).get(commentId, orgId) as any;

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    const previousStatus = comment.status;
    const now = new Date().toISOString();
    const eventId = crypto.randomUUID();

    // Update comment status
    db.run(`UPDATE comments SET status = ? WHERE id = ?`, [status, commentId]);

    // Record in comment_status_events table (PRD Section 9 & 7.7.1)
    db.run(`
      INSERT INTO comment_status_events (id, comment_id, changed_by_user_id, previous_status, new_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [eventId, commentId, userId, previousStatus, status, now]);

    // Record in activity_events
    logActivity({
      organizationId: orgId,
      projectId: comment.project_id,
      actorUserId: userId,
      actorName: req.user!.fullName,
      eventType: 'comment_status_change',
      objectId: commentId,
      metadata: {
        assetId: comment.asset_id,
        previousStatus,
        newStatus: status,
        commentSnippet: comment.body.slice(0, 60),
      },
    });

    const updatedComment = db.query(`SELECT * FROM comments WHERE id = ?`).get(commentId);
    return res.json({ comment: updatedComment, statusEvent: { id: eventId, previousStatus, newStatus: status, changedAt: now } });
  } catch (err: any) {
    console.error('Update comment status error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update comment status' });
  }
});

// Get status history for comment
router.get('/:id/history', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.id;
    const orgId = req.user!.organizationId;

    const history = db.query(`
      SELECT cse.*, prof.full_name as changed_by_name
      FROM comment_status_events cse
      JOIN comments c ON cse.comment_id = c.id
      JOIN asset_versions av ON c.asset_version_id = av.id
      JOIN assets a ON av.asset_id = a.id
      JOIN projects p ON a.project_id = p.id
      LEFT JOIN profiles prof ON cse.changed_by_user_id = prof.id
      WHERE cse.comment_id = ? AND p.organization_id = ?
      ORDER BY cse.created_at ASC
    `).all(commentId, orgId);

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get comment history' });
  }
});

// Get all comments for an asset version (Staff authenticated)
router.get('/version/:versionId', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const orgId = req.user!.organizationId;

    const version = db.query(`
      SELECT av.id, a.id as asset_id, p.organization_id
      FROM asset_versions av
      JOIN assets a ON av.asset_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE av.id = ? AND p.organization_id = ?
    `).get(versionId, orgId);

    if (!version) {
      return res.status(404).json({ error: 'Asset version not found or unauthorized' });
    }

    const comments = db.query(`
      SELECT id, asset_version_id, review_link_id, author_user_id, author_name, body, time_seconds, x_percent, y_percent, status, created_at
      FROM comments
      WHERE asset_version_id = ?
      ORDER BY time_seconds ASC, created_at ASC
    `).all(versionId);

    return res.json({ comments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get version comments' });
  }
});

// Staff adds comment directly to an asset version
router.post('/version/:versionId', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const { versionId } = req.params;
    const { body, timeSeconds, xPercent, yPercent } = req.body;
    const userId = req.user!.id;
    const orgId = req.user!.organizationId;
    const authorName = req.user!.fullName;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    const version = db.query(`
      SELECT av.id, a.id as asset_id, a.name as asset_name, p.id as project_id, p.organization_id
      FROM asset_versions av
      JOIN assets a ON av.asset_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE av.id = ? AND p.organization_id = ?
    `).get(versionId, orgId) as any;

    if (!version) {
      return res.status(404).json({ error: 'Asset version not found or unauthorized' });
    }

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const timeSec = timeSeconds !== undefined && timeSeconds !== null ? parseFloat(timeSeconds) : null;

    db.run(`
      INSERT INTO comments (
        id, asset_version_id, review_link_id, author_user_id,
        author_name, body, time_seconds, x_percent, y_percent,
        status, created_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'open', ?)
    `, [
      commentId,
      versionId,
      userId,
      authorName,
      body.trim(),
      timeSec,
      xPercent || null,
      yPercent || null,
      now,
    ]);

    logActivity({
      organizationId: orgId,
      projectId: version.project_id,
      actorUserId: userId,
      actorName,
      eventType: 'comment',
      objectId: commentId,
      metadata: {
        assetId: version.asset_id,
        versionId,
        timeSeconds: timeSec,
        commentSnippet: body.trim().slice(0, 80),
      },
    });

    const createdComment = db.query(`SELECT * FROM comments WHERE id = ?`).get(commentId);
    return res.status(201).json({ comment: createdComment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create comment' });
  }
});

export default router;
