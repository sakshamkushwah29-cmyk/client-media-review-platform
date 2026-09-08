import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { requireStaffAuth, AuthRequest } from '../middleware/auth';
import { driveAdapter } from '../storage/driveAdapter';
import { logActivity } from '../utils/activity';

const router = Router();

// List accessible projects
router.get('/', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;

    const projects = db.query(`
      SELECT 
        p.*,
        COUNT(DISTINCT a.id) as asset_count,
        COALESCE(SUM(av.size_bytes), 0) as total_bytes
      FROM projects p
      LEFT JOIN assets a ON p.id = a.project_id
      LEFT JOIN asset_versions av ON a.id = av.asset_id
      WHERE p.organization_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all(orgId);

    return res.json({ projects });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list projects' });
  }
});

// Create project and Drive folder
router.post('/', requireStaffAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, clientName, description } = req.body;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;

    if (!name || !clientName) {
      return res.status(400).json({ error: 'Project name and client name are required' });
    }

    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create corresponding Google Drive folder for project media
    const driveFolderId = await driveAdapter.createProjectFolder(orgId, name);

    db.run(`
      INSERT INTO projects (id, organization_id, name, client_name, description, status, drive_folder_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `, [projectId, orgId, name.trim(), clientName.trim(), description ? description.trim() : null, driveFolderId, userId, now]);

    logActivity({
      organizationId: orgId,
      projectId,
      actorUserId: userId,
      actorName: req.user!.fullName,
      eventType: 'upload',
      objectId: projectId,
      metadata: { action: 'project_created', name, clientName, driveFolderId },
    });

    const createdProject = db.query(`SELECT * FROM projects WHERE id = ?`).get(projectId);
    return res.status(201).json({ project: createdProject });
  } catch (err: any) {
    console.error('Project creation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create project' });
  }
});

// Get project details
router.get('/:id', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const projectId = req.params.id;

    const project = db.query(`
      SELECT p.*, prof.full_name as creator_name
      FROM projects p
      LEFT JOIN profiles prof ON p.created_by = prof.id
      WHERE p.id = ? AND p.organization_id = ?
    `).get(projectId, orgId) as any;

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get assets summary
    const assets = db.query(`
      SELECT 
        a.*,
        av.version_number,
        av.mime_type,
        av.size_bytes,
        av.duration_seconds,
        av.original_filename,
        av.download_filename,
        av.created_at as current_version_created_at,
        (SELECT COUNT(*) FROM comments c WHERE c.asset_version_id = a.current_version_id) as comment_count,
        (SELECT COUNT(*) FROM comments c WHERE c.asset_version_id = a.current_version_id AND c.status = 'open') as open_comment_count
      FROM assets a
      LEFT JOIN asset_versions av ON a.current_version_id = av.id
      WHERE a.project_id = ?
      ORDER BY a.created_at DESC
    `).all(projectId);

    return res.json({ project, assets });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get project' });
  }
});

// Update project status / details (including archive)
router.patch('/:id', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const projectId = req.params.id;
    const { name, clientName, description, status } = req.body;

    const project = db.query(`SELECT id FROM projects WHERE id = ? AND organization_id = ?`).get(projectId, orgId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (status && !['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, completed, or archived' });
    }

    db.run(`
      UPDATE projects
      SET 
        name = COALESCE(?, name),
        client_name = COALESCE(?, client_name),
        description = COALESCE(?, description),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [name ? name.trim() : null, clientName ? clientName.trim() : null, description ? description.trim() : null, status || null, projectId]);

    const updated = db.query(`SELECT * FROM projects WHERE id = ?`).get(projectId);
    return res.json({ project: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update project' });
  }
});

// Project activity feed
router.get('/:id/activity', requireStaffAuth, (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organizationId;
    const projectId = req.params.id;

    const activities = db.query(`
      SELECT *
      FROM activity_events
      WHERE project_id = ? AND organization_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(projectId, orgId);

    return res.json({ activities });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get activity' });
  }
});

export default router;
