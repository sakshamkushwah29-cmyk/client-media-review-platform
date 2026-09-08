import crypto from 'crypto';
import { db, initDatabase } from './index';
import { hashPassword, hashToken } from '../utils/tokens';
import { driveAdapter } from '../storage/driveAdapter';
import { ensureSampleMedia } from './generateMedia';
import { CONFIG } from '../config';

export async function seedDatabase() {
  initDatabase();

  const existingOrg = db.query(`SELECT count(*) as count FROM organizations`).get() as { count: number };
  if (existingOrg.count > 0) {
    console.log('Database already populated, skipping seed.');
    return;
  }

  console.log('Seeding initial organization, staff users, sample projects and media...');

  const now = new Date().toISOString();
  const orgId = crypto.randomUUID();
  const rootDriveFolderId = `gdrive_root_${crypto.randomBytes(8).toString('hex')}`;

  // 1. Organization
  db.run(`
    INSERT INTO organizations (id, name, drive_root_folder_id, storage_quota_bytes, storage_used_bytes, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `, [orgId, 'Lumina Wedding Cinema & Studio', rootDriveFolderId, CONFIG.DEFAULT_QUOTA_BYTES, now]);

  // 2. Staff Profiles
  const ownerId = crypto.randomUUID();
  const staffId = crypto.randomUUID();
  const defaultPasswordHash = await hashPassword('password123');

  db.run(`
    INSERT INTO profiles (id, organization_id, full_name, email, password_hash, role, created_at)
    VALUES (?, ?, 'Arjun Verma', 'arjun@luminastudio.com', ?, 'owner', ?)
  `, [ownerId, orgId, defaultPasswordHash, now]);

  db.run(`
    INSERT INTO profiles (id, organization_id, full_name, email, password_hash, role, created_at)
    VALUES (?, ?, 'Priya Sen', 'priya@luminastudio.com', ?, 'contributor', ?)
  `, [staffId, orgId, defaultPasswordHash, now]);

  // 3. Project 1: Sharma & Verma Royal Wedding
  const projectId1 = crypto.randomUUID();
  const driveFolder1 = await driveAdapter.createProjectFolder(orgId, 'Sharma_Verma_Royal_Wedding');

  db.run(`
    INSERT INTO projects (id, organization_id, name, client_name, description, status, drive_folder_id, created_by, created_at)
    VALUES (?, ?, 'Sharma & Verma Royal Wedding', 'Aarav Sharma & Diya Verma', 'Cinematic 4K wedding highlights, drone sequences, and teaser trailer', 'active', ?, ?, ?)
  `, [projectId1, orgId, driveFolder1, ownerId, now]);

  // Project 2: Mehta Anniversary
  const projectId2 = crypto.randomUUID();
  const driveFolder2 = await driveAdapter.createProjectFolder(orgId, 'Mehta_Anniversary_Celebration');

  db.run(`
    INSERT INTO projects (id, organization_id, name, client_name, description, status, drive_folder_id, created_by, created_at)
    VALUES (?, ?, 'Mehta Silver Anniversary', 'Rohan & Ananya Mehta', 'Full banquet celebration, speech edits, and family portrait collection', 'active', ?, ?, ?)
  `, [projectId2, orgId, driveFolder2, ownerId, now]);

  // 4. Generate & Upload Sample Media
  const { v1Path, v2Path, imgPath } = ensureSampleMedia();

  // Upload V1 to Drive
  const v1Upload = await driveAdapter.uploadFile(
    orgId,
    driveFolder1,
    v1Path,
    'Sharma_Verma_Teaser_V1.mp4',
    'video/mp4'
  );

  // Upload V2 to Drive
  const v2Upload = await driveAdapter.uploadFile(
    orgId,
    driveFolder1,
    v2Path,
    'Sharma_Verma_Teaser_V2_Revision.mp4',
    'video/mp4'
  );

  // 5. Create Asset First (to satisfy FK from asset_versions)
  const assetId1 = crypto.randomUUID();
  const v1Id = crypto.randomUUID();
  const v2Id = crypto.randomUUID();

  db.run(`
    INSERT INTO assets (id, project_id, name, asset_type, status, current_version_id, created_by, created_at)
    VALUES (?, ?, 'Cinematic Teaser Trailer', 'video', 'ready_for_review', NULL, ?, ?)
  `, [assetId1, projectId1, ownerId, now]);

  // Insert V1
  db.run(`
    INSERT INTO asset_versions (id, asset_id, version_number, drive_file_id, original_filename, download_filename, mime_type, size_bytes, duration_seconds, uploaded_by, created_at)
    VALUES (?, ?, 1, ?, 'Sharma_Verma_Teaser_V1.mp4', 'Sharma_Verma_Wedding_Teaser_Draft.mp4', 'video/mp4', ?, 20.0, ?, ?)
  `, [v1Id, assetId1, v1Upload.fileId, v1Upload.sizeBytes, staffId, new Date(Date.now() - 86400000).toISOString()]);

  // Insert V2
  db.run(`
    INSERT INTO asset_versions (id, asset_id, version_number, drive_file_id, original_filename, download_filename, mime_type, size_bytes, duration_seconds, uploaded_by, created_at)
    VALUES (?, ?, 2, ?, 'Sharma_Verma_Teaser_V2_Revision.mp4', 'Sharma_Verma_Wedding_Teaser_Final_Cut.mp4', 'video/mp4', ?, 20.0, ?, ?)
  `, [v2Id, assetId1, v2Upload.fileId, v2Upload.sizeBytes, staffId, now]);

  // Update current version to V2
  db.run(`UPDATE assets SET current_version_id = ? WHERE id = ?`, [v2Id, assetId1]);

  // Create second Asset: Couple Portrait
  const imgUpload = await driveAdapter.uploadFile(
    orgId,
    driveFolder1,
    imgPath,
    'Wedding_Portrait_Preview.png',
    'image/png'
  );
  const photoAssetId = crypto.randomUUID();
  const photoVersionId = crypto.randomUUID();

  db.run(`
    INSERT INTO assets (id, project_id, name, asset_type, status, current_version_id, created_by, created_at)
    VALUES (?, ?, 'Couple Portrait Poster', 'image', 'approved', NULL, ?, ?)
  `, [photoAssetId, projectId1, staffId, now]);

  db.run(`
    INSERT INTO asset_versions (id, asset_id, version_number, drive_file_id, original_filename, download_filename, mime_type, size_bytes, duration_seconds, uploaded_by, created_at)
    VALUES (?, ?, 1, ?, 'Wedding_Portrait_Preview.png', 'Wedding_Portrait_Preview.png', 'image/png', ?, 0, ?, ?)
  `, [photoVersionId, photoAssetId, imgUpload.fileId, imgUpload.sizeBytes, staffId, now]);

  db.run(`UPDATE assets SET current_version_id = ? WHERE id = ?`, [photoVersionId, photoAssetId]);

  // 6. Comments on V1 (showing Open, In Progress, Done states)
  const comment1Id = crypto.randomUUID();
  const comment2Id = crypto.randomUUID();
  const comment3Id = crypto.randomUUID();

  // Comment 1: Done
  db.run(`
    INSERT INTO comments (id, asset_version_id, review_link_id, author_user_id, author_name, body, time_seconds, status, created_at)
    VALUES (?, ?, NULL, NULL, 'Diya Verma (Bride)', 'Please adjust the color temperature on the mandap entry to look warmer.', 3.2, 'done', ?)
  `, [comment1Id, v1Id, new Date(Date.now() - 72000000).toISOString()]);

  db.run(`
    INSERT INTO comment_status_events (id, comment_id, changed_by_user_id, previous_status, new_status, created_at)
    VALUES (?, ?, ?, 'open', 'in_progress', ?),
           (?, ?, ?, 'in_progress', 'done', ?)
  `, [
    crypto.randomUUID(), comment1Id, staffId, new Date(Date.now() - 60000000).toISOString(),
    crypto.randomUUID(), comment1Id, staffId, new Date(Date.now() - 50000000).toISOString(),
  ]);

  // Comment 2: In Progress
  db.run(`
    INSERT INTO comments (id, asset_version_id, review_link_id, author_user_id, author_name, body, time_seconds, status, created_at)
    VALUES (?, ?, NULL, NULL, 'Aarav Sharma (Groom)', 'Can we make the drone establishing flyover slightly slower?', 8.5, 'in_progress', ?)
  `, [comment2Id, v1Id, new Date(Date.now() - 40000000).toISOString()]);

  db.run(`
    INSERT INTO comment_status_events (id, comment_id, changed_by_user_id, previous_status, new_status, created_at)
    VALUES (?, ?, ?, 'open', 'in_progress', ?)
  `, [crypto.randomUUID(), comment2Id, staffId, new Date(Date.now() - 30000000).toISOString()]);

  // Comment 3: Open
  db.run(`
    INSERT INTO comments (id, asset_version_id, review_link_id, author_user_id, author_name, body, time_seconds, status, created_at)
    VALUES (?, ?, NULL, NULL, 'Diya Verma (Bride)', 'The background music swell at this timestamp is brilliant! Keep this volume.', 12.0, 'open', ?)
  `, [comment3Id, v1Id, new Date(Date.now() - 20000000).toISOString()]);

  // 7. Review Link (Pre-configured sample link with memorable token)
  const sampleToken = 'sharma-wedding-teaser-review';
  const tokenHash = hashToken(sampleToken);
  const linkId = crypto.randomUUID();

  db.run(`
    INSERT INTO review_links (
      id, project_id, asset_id, token_hash, raw_token_display,
      can_comment, can_download, can_approve, show_previous_versions,
      passphrase_hash, expires_at, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1, NULL, NULL, ?, ?)
  `, [linkId, projectId1, assetId1, tokenHash, sampleToken, ownerId, now]);

  // Recalculate org storage
  driveAdapter.recalculateOrgStorage(orgId);

  console.log('\nSeed completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Staff Login Credentials:');
  console.log('  Email:    arjun@luminastudio.com');
  console.log('  Password: password123');
  console.log('Instant Client Review Link:');
  console.log(`  http://localhost:5173/review/${sampleToken}`);
  console.log('--------------------------------------------------\n');
}

if (import.meta.main) {
  seedDatabase().catch(console.error);
}
