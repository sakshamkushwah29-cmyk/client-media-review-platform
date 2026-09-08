import crypto from 'crypto';
import { db } from '../db';

export function logActivity(params: {
  organizationId: string;
  projectId: string;
  actorUserId?: string | null;
  actorName: string;
  eventType: 'upload' | 'version_created' | 'comment' | 'comment_status_change' | 'approval' | 'changes_requested' | 'download' | 'review_link_created' | 'review_link_revoked' | 'asset_delivered';
  objectId: string;
  metadata?: Record<string, any>;
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const metadataStr = params.metadata ? JSON.stringify(params.metadata) : null;

  db.run(`
    INSERT INTO activity_events (id, organization_id, project_id, actor_user_id, actor_name, event_type, object_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    params.organizationId,
    params.projectId,
    params.actorUserId || null,
    params.actorName,
    params.eventType,
    params.objectId,
    metadataStr,
    createdAt
  ]);
}
