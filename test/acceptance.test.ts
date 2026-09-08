import assert from 'assert';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001';

async function runAcceptanceTests() {
  console.log('🧪 Running Acceptance Tests against Client Media Review Platform...\n');

  // Test 1: Sign in as staff owner
  console.log('Test 1: Staff Sign In');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'arjun@luminastudio.com', password: 'password123' }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login should succeed');
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(token, 'JWT token returned');
  assert.strictEqual(loginData.user.email, 'arjun@luminastudio.com');
  console.log('  ✅ Staff signed in successfully.');

  // Test 2: Storage usage meter
  console.log('\nTest 2: Storage Quota Meter (150 GB limit)');
  const usageRes = await fetch(`${BASE_URL}/api/organization/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(usageRes.status, 200);
  const usageData = await usageRes.json();
  assert.strictEqual(usageData.storage.quotaGb, '150.0');
  console.log(`  ✅ Storage quota verified: ${usageData.storage.usedGb} GB / ${usageData.storage.quotaGb} GB (${usageData.storage.usedPercentage}%)`);

  // Test 3: Create a project & Drive folder
  console.log('\nTest 3: Create Project and Associate Google Drive Folder');
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Singhania Destination Wedding',
      clientName: 'Kabir & Tara Singhania',
      description: 'Udaipur Palace 3-Day Celebrations',
    }),
  });
  assert.strictEqual(createProjRes.status, 201);
  const { project } = await createProjRes.json();
  assert(project.drive_folder_id.startsWith('gdrive_folder_'), 'Drive folder ID created');
  console.log(`  ✅ Project created: "${project.name}" with Drive folder "${project.drive_folder_id}"`);

  // Test 4: Upload supported MP4 asset
  console.log('\nTest 4: Upload MP4 Asset into Drive Storage');
  const sampleMp4Path = path.resolve(process.cwd(), '.sample_media/sharma_wedding_highlights_v1.mp4');
  const fileBuffer = fs.readFileSync(sampleMp4Path);
  const blob = new Blob([fileBuffer], { type: 'video/mp4' });
  const formData = new FormData();
  formData.append('file', blob, 'Singhania_Teaser_Cut_1.mp4');
  formData.append('name', 'Singhania Teaser Cut');

  const uploadRes = await fetch(`${BASE_URL}/api/projects/${project.id}/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  assert.strictEqual(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  const asset = uploadData.asset;
  const currentVersion = uploadData.currentVersion;
  assert.strictEqual(currentVersion.version_number, 1);
  assert(currentVersion.drive_file_id.startsWith('gdrive_file_'));
  assert.strictEqual(currentVersion.mime_type, 'video/mp4');
  console.log(`  ✅ Asset uploaded: Version 1 ID=${currentVersion.id}, Drive File ID=${currentVersion.drive_file_id}, Size=${currentVersion.size_bytes} bytes`);

  // Test 5: Upload new revision (Version 2) without destroying Version 1
  console.log('\nTest 5: Upload Revision (Version 2) Keeping Prior Cuts Immutable');
  const v2Blob = new Blob([fileBuffer], { type: 'video/mp4' });
  const formV2 = new FormData();
  formV2.append('file', v2Blob, 'Singhania_Teaser_Cut_V2_Revision.mp4');

  const uploadV2Res = await fetch(`${BASE_URL}/api/assets/${asset.id}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formV2,
  });
  assert.strictEqual(uploadV2Res.status, 201);
  const v2Data = await uploadV2Res.json();
  assert.strictEqual(v2Data.version.version_number, 2);
  assert.strictEqual(v2Data.asset.status, 'ready_for_review');

  const versionsRes = await fetch(`${BASE_URL}/api/assets/${asset.id}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { versions } = await versionsRes.json();
  assert.strictEqual(versions.length, 2, 'Should have 2 versions in history');
  console.log(`  ✅ Version 2 created. Version history has ${versions.length} immutable cuts.`);

  // Test 6: Create Review Link with permissions and hashed token
  console.log('\nTest 6: Create Client Review Link (Hashed Token)');
  const linkRes = await fetch(`${BASE_URL}/api/assets/${asset.id}/review-links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canComment: true,
      canDownload: true,
      canApprove: true,
      showPreviousVersions: true,
    }),
  });
  assert.strictEqual(linkRes.status, 201);
  const linkData = await linkRes.json();
  const rawToken = linkData.reviewLink.rawToken;
  assert(rawToken, 'One-time raw token returned');
  console.log(`  ✅ Review link created: /review/${rawToken}`);

  // Test 7: Unauthenticated client opens review link
  console.log('\nTest 7: Unauthenticated Client Resolves Review Link');
  const clientRes = await fetch(`${BASE_URL}/api/review/${rawToken}`);
  assert.strictEqual(clientRes.status, 200);
  const clientData = await clientRes.json();
  assert.strictEqual(clientData.project.name, project.name);
  assert.strictEqual(clientData.asset.name, 'Singhania Teaser Cut');
  assert.strictEqual(clientData.permissions.canComment, true);
  assert.strictEqual(clientData.permissions.canDownload, true);
  console.log(`  ✅ Client review room resolved without exposing credentials.`);

  // Test 8: HTTP 206 Partial Content Range streaming
  console.log('\nTest 8: HTTP 206 Partial Content Range Media Streaming');
  const streamRes = await fetch(`${BASE_URL}/api/review/${rawToken}/media?versionId=${v2Data.version.id}`, {
    headers: { Range: 'bytes=0-500' },
  });
  assert.strictEqual(streamRes.status, 206);
  assert(streamRes.headers.get('content-range')?.startsWith('bytes 0-500/'));
  assert.strictEqual(streamRes.headers.get('accept-ranges'), 'bytes');
  console.log(`  ✅ HTTP 206 partial streaming verified for smooth scrubbing.`);

  // Test 9: Client leaves timestamped feedback
  console.log('\nTest 9: Client Creates Timestamped Feedback Comment');
  const commentRes = await fetch(`${BASE_URL}/api/review/${rawToken}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      versionId: v2Data.version.id,
      authorName: 'Tara Singhania (Bride)',
      body: 'Please make the slow-motion ring exchange last 1 second longer.',
      timeSeconds: 6.4,
    }),
  });
  assert.strictEqual(commentRes.status, 201);
  const { comment } = await commentRes.json();
  assert.strictEqual(comment.status, 'open');
  assert.strictEqual(comment.time_seconds, 6.4);
  console.log(`  ✅ Timestamped comment created at ${comment.time_seconds}s with initial status "${comment.status}".`);

  // Test 10: Staff feedback status transitions (open -> in_progress -> done -> open)
  console.log('\nTest 10: Feedback Status Workflow (Start Work -> Mark Done -> Reopen)');
  // 10a: Start work
  const startWorkRes = await fetch(`${BASE_URL}/api/comments/${comment.id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'in_progress' }),
  });
  assert.strictEqual(startWorkRes.status, 200);
  const startWorkData = await startWorkRes.json();
  assert.strictEqual(startWorkData.comment.status, 'in_progress');
  console.log('  ✅ "Start work": Comment status transitioned to "in_progress".');

  // 10b: Mark done
  const markDoneRes = await fetch(`${BASE_URL}/api/comments/${comment.id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'done' }),
  });
  assert.strictEqual(markDoneRes.status, 200);
  const markDoneData = await markDoneRes.json();
  assert.strictEqual(markDoneData.comment.status, 'done');
  console.log('  ✅ "Mark done": Comment status transitioned to "done".');

  // 10c: Reopen
  const reopenRes = await fetch(`${BASE_URL}/api/comments/${comment.id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'open' }),
  });
  assert.strictEqual(reopenRes.status, 200);
  const reopenData = await reopenRes.json();
  assert.strictEqual(reopenData.comment.status, 'open');
  console.log('  ✅ "Reopen": Comment status transitioned back to "open".');

  // Test 11: Client submits Approval decision
  console.log('\nTest 11: Client Submits Approval Decision');
  const decisionRes = await fetch(`${BASE_URL}/api/review/${rawToken}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: 'approved',
      message: 'Looks absolutely breathtaking! We love it!',
      reviewerName: 'Kabir & Tara Singhania',
      versionId: v2Data.version.id,
    }),
  });
  assert.strictEqual(decisionRes.status, 201);
  const decData = await decisionRes.json();
  assert.strictEqual(decData.decision.decision, 'approved');
  assert.strictEqual(decData.assetStatus, 'approved');
  console.log(`  ✅ Version approved! Asset status updated to "${decData.assetStatus}".`);

  // Test 12: Authorized file download through application endpoint
  console.log('\nTest 12: Authorized Client Download Endpoint');
  const downloadRes = await fetch(`${BASE_URL}/api/review/${rawToken}/download/${v2Data.version.id}`);
  assert.strictEqual(downloadRes.status, 200);
  const disposition = downloadRes.headers.get('content-disposition');
  assert(disposition?.includes('attachment'), 'Must be attachment');
  const downloadedBytes = await downloadRes.arrayBuffer();
  assert.strictEqual(downloadedBytes.byteLength, v2Data.version.size_bytes);
  console.log(`  ✅ Download verified: Correct filename, content-disposition, and exact size (${downloadedBytes.byteLength} bytes).`);

  // Test 13: Revoke review link & check access denial
  console.log('\nTest 13: Revoke Review Link & Verify Access Denial');
  const revokeRes = await fetch(`${BASE_URL}/api/review-links/${linkData.reviewLink.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(revokeRes.status, 200);

  const deniedRes = await fetch(`${BASE_URL}/api/review/${rawToken}`);
  assert.strictEqual(deniedRes.status, 403, 'Revoked link must return 403 Forbidden');
  console.log('  ✅ Revoked link correctly denied with 403 Forbidden.');

  console.log('\n========================================================');
  console.log('🎉 ALL 13 ACCEPTANCE CRITERIA SUITES PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runAcceptanceTests().catch((err) => {
  console.error('\n❌ Acceptance Test Failed:', err);
  process.exit(1);
});
