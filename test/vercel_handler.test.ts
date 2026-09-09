import assert from 'assert';
import { EventEmitter } from 'events';
import handler from '../api/index.js';

// Helper to simulate Vercel serverless request/response
function createMockReqRes(options: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const req: any = {
    method: options.method || 'GET',
    url: options.url,
    headers: options.headers || {},
    body: options.body || null,
  };

  const headers: Record<string, string> = {};
  let statusCode = 200;
  let responseData: any = null;
  let isEnded = false;
  const chunks: Buffer[] = [];

  const res: any = new EventEmitter();
  res.statusCode = 200;
  res.setHeader = (k: string, v: string) => {
    headers[k.toLowerCase()] = v;
  };
  res.writeHead = (code: number, hdrs?: Record<string, string>) => {
    statusCode = code;
    if (hdrs) {
      for (const [k, v] of Object.entries(hdrs)) {
        headers[k.toLowerCase()] = v;
      }
    }
  };
  res.status = (code: number) => {
    statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    responseData = data;
    isEnded = true;
    res.emit('finish');
    return res;
  };
  res.write = (chunk: any) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  };
  res.end = (data?: any) => {
    if (data) {
      chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
      responseData = data;
    }
    isEnded = true;
    res.emit('finish');
    return res;
  };

  return {
    req,
    res,
    getResponse: () => ({
      statusCode,
      headers,
      data: responseData,
      buffer: Buffer.concat(chunks),
      isEnded,
    }),
  };
}

async function runTests() {
  console.log('🧪 Running Vercel Serverless Handler Tests for api/index.js...\n');

  // Test 1: Issue 2 - Create new project starts with 0 assets
  console.log('Test 1: Create New Project starts with 0 assets');
  const { req: pReq, res: pRes, getResponse: getPResp } = createMockReqRes({
    method: 'POST',
    url: '/api/projects',
    body: {
      name: 'Kapoor & Sons Destination Wedding',
      clientName: 'Rohan & Dia Kapoor',
      description: 'Goa 2026',
    },
  });
  await handler(pReq, pRes);
  const pResponse = getPResp();
  assert.strictEqual(pResponse.statusCode, 200);
  assert(pResponse.data?.project?.id, 'Project created with ID');
  assert.strictEqual(pResponse.data.project.asset_count, 0, 'New project must have 0 assets');
  const newProjectId = pResponse.data.project.id;
  console.log(`  ✅ Project created: ID=${newProjectId}, asset_count=0`);

  // Test 2: Issue 2 - Query newly created project returns strictly 0 assets (empty array)
  console.log('\nTest 2: Query newly created project returns clean 0 assets');
  const { req: getPReq, res: getPRes, getResponse: getPGetResp } = createMockReqRes({
    method: 'GET',
    url: `/api/projects/${newProjectId}`,
  });
  await handler(getPReq, getPRes);
  const pGetResp = getPGetResp();
  assert.strictEqual(pGetResp.statusCode, 200);
  assert.strictEqual(pGetResp.data.project.asset_count, 0, 'Project asset_count must be 0');
  assert.strictEqual(pGetResp.data.assets.length, 0, 'Newly created project must have 0 assets');
  console.log('  ✅ Verified newly created project has 0 assets (no unwanted video auto-uploaded).');

  // Test 3: Demo project still has demo assets
  console.log('\nTest 3: Demo project proj-1 retains initial demo assets');
  const { req: demoReq, res: demoRes, getResponse: getDemoResp } = createMockReqRes({
    method: 'GET',
    url: '/api/projects/proj-1',
  });
  await handler(demoReq, demoRes);
  const demoResp = getDemoResp();
  assert.strictEqual(demoResp.statusCode, 200);
  assert(demoResp.data.assets.length > 0, 'Demo project has assets');
  console.log(`  ✅ Demo project proj-1 has ${demoResp.data.assets.length} demo assets.`);

  // Test 4: Issue 1 - Create Review Link saves persistently
  console.log('\nTest 4: Create Review Link saves persistently');
  const customToken = `custom-review-token-${Date.now()}`;
  const { req: linkReq, res: linkRes, getResponse: getLinkResp } = createMockReqRes({
    method: 'POST',
    url: '/api/assets/ast-1/review-links',
    body: {
      rawToken: customToken,
      canComment: true,
      canDownload: true,
      canApprove: true,
      showPreviousVersions: true,
    },
  });
  await handler(linkReq, linkRes);
  const linkResp = getLinkResp();
  assert.strictEqual(linkResp.statusCode, 200);
  assert(linkResp.data?.reviewLink?.id, 'Review link ID generated');
  assert.strictEqual(linkResp.data.reviewLink.raw_token_display, customToken);
  const createdLinkId = linkResp.data.reviewLink.id;
  console.log(`  ✅ Review link created: ID=${createdLinkId}, Token=${customToken}`);

  // Test 5: Issue 1 - List review links on asset returns newly created link
  console.log('\nTest 5: List Review Links on Asset returns created link');
  const { req: listReq, res: listRes, getResponse: getListResp } = createMockReqRes({
    method: 'GET',
    url: '/api/assets/ast-1/review-links',
  });
  await handler(listReq, listRes);
  const listResp = getListResp();
  assert.strictEqual(listResp.statusCode, 200);
  const foundLink = listResp.data.reviewLinks.find((l: any) => l.id === createdLinkId);
  assert(foundLink, 'Newly created review link must be present in asset review links');
  console.log(`  ✅ Asset ast-1 has ${listResp.data.reviewLinks.length} review links.`);

  // Test 6: Issue 1 - List all review links (/api/review-links) returns newly created link
  console.log('\nTest 6: Root /api/review-links includes newly created link');
  const { req: allReq, res: allRes, getResponse: getAllResp } = createMockReqRes({
    method: 'GET',
    url: '/api/review-links',
  });
  await handler(allReq, allRes);
  const allResp = getAllResp();
  assert.strictEqual(allResp.statusCode, 200);
  assert(allResp.data.reviewLinks.some((l: any) => l.id === createdLinkId), 'Found in all review links');
  console.log(`  ✅ Root review links endpoint has ${allResp.data.reviewLinks.length} links.`);

  // Test 7: Issue 3 - Client Review Room resolves dynamic token
  console.log('\nTest 7: Client Review Room resolves dynamic token');
  const { req: revReq, res: revRes, getResponse: getRevResp } = createMockReqRes({
    method: 'GET',
    url: `/api/review/${customToken}`,
  });
  await handler(revReq, revRes);
  const revResp = getRevResp();
  assert.strictEqual(revResp.statusCode, 200);
  assert.strictEqual(revResp.data.asset.id, 'ast-1');
  assert.strictEqual(revResp.data.permissions.canComment, true);
  assert.strictEqual(revResp.data.permissions.canDownload, true);
  console.log(`  ✅ Dynamic review token resolved: Asset="${revResp.data.asset.name}"`);

  // Test 8: Issue 3 - HTTP 206 Partial Content Range streaming
  console.log('\nTest 8: HTTP 206 Partial Content Range Streaming');
  const { req: streamReq, res: streamRes, getResponse: getStreamResp } = createMockReqRes({
    method: 'GET',
    url: `/api/review/${customToken}/media`,
    headers: { range: 'bytes=0-1023' },
  });
  await handler(streamReq, streamRes);
  await new Promise((resolve) => {
    streamRes.on('finish', resolve);
    setTimeout(resolve, 300);
  });
  const streamResp = getStreamResp();
  assert.strictEqual(streamResp.statusCode, 206, 'Should respond with 206 Partial Content');
  assert.strictEqual(streamResp.headers['content-type'], 'video/mp4');
  assert.strictEqual(streamResp.headers['accept-ranges'], 'bytes');
  assert(streamResp.headers['content-range']?.startsWith('bytes 0-1023/'));
  assert.strictEqual(streamResp.headers['content-length'], 1024);
  console.log(`  ✅ HTTP 206 range streaming verified: Content-Type=${streamResp.headers['content-type']}, Range=${streamResp.headers['content-range']}`);

  // Test 9: Issue 1 - Revoke Review Link
  console.log('\nTest 9: Revoke Review Link');
  const { req: delReq, res: delRes, getResponse: getDelResp } = createMockReqRes({
    method: 'DELETE',
    url: `/api/review-links/${createdLinkId}`,
  });
  await handler(delReq, delRes);
  const delResp = getDelResp();
  assert.strictEqual(delResp.statusCode, 200);

  // Verification after revocation:
  const { req: checkRevReq, res: checkRevRes, getResponse: getCheckRevResp } = createMockReqRes({
    method: 'GET',
    url: `/api/review/${customToken}`,
  });
  await handler(checkRevReq, checkRevRes);
  const checkRevResp = getCheckRevResp();
  assert.strictEqual(checkRevResp.statusCode, 403, 'Revoked link should return 403 Forbidden');
  console.log('  ✅ Revoked link correctly denied with 403 Forbidden.');

  // Test 10: Unknown review token returns 404 Not Found
  console.log('\nTest 10: Unknown non-existent review token returns 404');
  const { req: unkReq, res: unkRes, getResponse: getUnkResp } = createMockReqRes({
    method: 'GET',
    url: '/api/review/completely-invalid-nonexistent-token-12345',
  });
  await handler(unkReq, unkRes);
  const unkResp = getUnkResp();
  assert.strictEqual(unkResp.statusCode, 404, 'Unknown token should return 404 Not Found');
  console.log('  ✅ Unknown review token correctly returned 404 Not Found.');

  // Test 11: Self-describing rev_ token resolves without database dependency
  console.log('\nTest 11: Self-describing rev_ token resolves dynamically');
  const payload = {
    id: 'link-stateless-999',
    asset_id: 'custom-asset-999',
    project_id: 'custom-proj-999',
    asset_name: 'Jaipur Palace Royal Sangeet Highlights',
    project_name: 'Royal Rajputana Wedding 2026',
    client_name: 'Aishwarya & Vikram',
    can_comment: 1,
    can_download: 1,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const revToken = `rev_${b64}`;

  const { req: selfReq, res: selfRes, getResponse: getSelfResp } = createMockReqRes({
    method: 'GET',
    url: `/api/review/${revToken}`,
  });
  await handler(selfReq, selfRes);
  const selfResp = getSelfResp();
  assert.strictEqual(selfResp.statusCode, 200, 'Self-describing token should resolve with 200');
  assert.strictEqual(selfResp.data.asset.name, 'Jaipur Palace Royal Sangeet Highlights');
  assert.strictEqual(selfResp.data.project.name, 'Royal Rajputana Wedding 2026');
  assert.strictEqual(selfResp.data.project.clientName, 'Aishwarya & Vikram');
  console.log(`  ✅ Self-describing token resolved: Asset="${selfResp.data.asset.name}", Project="${selfResp.data.project.name}"`);

  // Test 12: Query project by demo-proj-1 alias returns demo assets
  console.log('\nTest 12: Query project by demo-proj-1 alias returns demo assets');
  const { req: aliasReq, res: aliasRes, getResponse: getAliasResp } = createMockReqRes({
    method: 'GET',
    url: '/api/projects/demo-proj-1',
  });
  await handler(aliasReq, aliasRes);
  const aliasResp = getAliasResp();
  assert.strictEqual(aliasResp.statusCode, 200);
  assert(aliasResp.data.assets.length > 0, 'demo-proj-1 must return demo assets');
  console.log(`  ✅ demo-proj-1 alias returned ${aliasResp.data.assets.length} demo assets.`);

  // Test 13: Comments isolation - Demo version ver-1 has 2 sample comments
  console.log('\nTest 13: Demo version ver-1 returns sample comments');
  const { req: demoCmtReq, res: demoCmtRes, getResponse: getDemoCmtResp } = createMockReqRes({
    method: 'GET',
    url: '/api/comments/version/ver-1',
  });
  await handler(demoCmtReq, demoCmtRes);
  const demoCmtResp = getDemoCmtResp();
  assert.strictEqual(demoCmtResp.statusCode, 200);
  assert.strictEqual(demoCmtResp.data.comments.length, 2, 'ver-1 must have 2 comments');
  console.log(`  ✅ Demo version ver-1 returned ${demoCmtResp.data.comments.length} sample comments.`);

  // Test 14: Comments isolation - New cut version starts with strictly 0 comments
  const uniqueTestVerId = `ver-new-${Date.now()}`;
  console.log(`\nTest 14: New cut version ${uniqueTestVerId} starts with strictly 0 comments`);
  const { req: newCmtReq, res: newCmtRes, getResponse: getNewCmtResp } = createMockReqRes({
    method: 'GET',
    url: `/api/comments/version/${uniqueTestVerId}`,
  });
  await handler(newCmtReq, newCmtRes);
  const newCmtResp = getNewCmtResp();
  assert.strictEqual(newCmtResp.statusCode, 200);
  assert.strictEqual(newCmtResp.data.comments.length, 0, 'New cut version must have strictly 0 comments');
  console.log(`  ✅ Verified new cut version ${uniqueTestVerId} starts clean with 0 comments.`);

  // Test 15: Review room for a new cut token starts with strictly 0 comments
  console.log('\nTest 15: Review room for new cut token starts with strictly 0 comments');
  const newCutPayload = {
    id: `link-new-${Date.now()}`,
    asset_id: `custom-asset-${Date.now()}`,
    project_id: `custom-proj-${Date.now()}`,
    asset_name: 'Haldi Ceremony Highlights',
    can_comment: 1,
    can_download: 1,
  };
  const newCutB64 = Buffer.from(JSON.stringify(newCutPayload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const newCutToken = `rev_${newCutB64}`;

  const { req: newCutReq, res: newCutRes, getResponse: getNewCutResp } = createMockReqRes({
    method: 'GET',
    url: `/api/review/${newCutToken}`,
  });
  await handler(newCutReq, newCutRes);
  const newCutResp = getNewCutResp();
  assert.strictEqual(newCutResp.statusCode, 200);
  assert.strictEqual(newCutResp.data.comments.length, 0, 'Review room for new cut must have strictly 0 comments');
  console.log('  ✅ Review room for new cut has 0 comments (no unwanted demo reviews).');

  // Test 16: Posting a comment on new cut saves and isolates to that cut
  console.log('\nTest 16: Posting comment on new cut saves and isolates to that cut');
  const { req: postCmtReq, res: postCmtRes, getResponse: getPostCmtResp } = createMockReqRes({
    method: 'POST',
    url: `/api/comments/version/${uniqueTestVerId}`,
    body: {
      body: 'Client loves the entry sequence, audio level needs +2dB',
      authorName: 'Aarav Sharma',
      timeSeconds: 12.4,
    },
  });
  await handler(postCmtReq, postCmtRes);
  const postCmtResp = getPostCmtResp();
  assert.strictEqual(postCmtResp.statusCode, 200);
  assert(postCmtResp.data?.comment?.id, 'Comment created with ID');
  assert.strictEqual(postCmtResp.data.comment.asset_version_id, uniqueTestVerId);

  // Verify subsequent GET returns strictly the 1 newly added comment
  const { req: checkCmtReq, res: checkCmtRes, getResponse: getCheckCmtResp } = createMockReqRes({
    method: 'GET',
    url: `/api/comments/version/${uniqueTestVerId}`,
  });
  await handler(checkCmtReq, checkCmtRes);
  const checkCmtResp = getCheckCmtResp();
  assert.strictEqual(checkCmtResp.data.comments.length, 1, 'Version should now have exactly 1 comment');
  assert.strictEqual(checkCmtResp.data.comments[0].body, 'Client loves the entry sequence, audio level needs +2dB');
  console.log(`  ✅ New comment saved and retrieved exclusively on ${uniqueTestVerId}.`);

  // Test 17: Other new cut versions still have 0 comments (no cross-contamination)
  const otherVerId = `ver-other-cut-${Date.now()}`;
  console.log(`\nTest 17: Other new cut version ${otherVerId} still has strictly 0 comments`);
  const { req: otherCmtReq, res: otherCmtRes, getResponse: getOtherCmtResp } = createMockReqRes({
    method: 'GET',
    url: `/api/comments/version/${otherVerId}`,
  });
  await handler(otherCmtReq, otherCmtRes);
  const otherCmtResp = getOtherCmtResp();
  assert.strictEqual(otherCmtResp.data.comments.length, 0, 'Other new cut version must have 0 comments');
  console.log(`  ✅ Verified no comment leakage: ${otherVerId} has 0 comments.`);

  console.log('\n========================================================');
  console.log('🎉 ALL 17 SERVERLESS HANDLER VERIFICATION TESTS PASSED!');
  console.log('========================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Serverless Test Failed:', err);
  process.exit(1);
});
