import assert from 'assert';

// Mock minimal localStorage if not present
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  };
}

import { encodeReviewToken, decodeReviewToken, api } from '../client/src/services/api.ts';

async function testTokenAndReview() {
  console.log('🧪 Testing Self-Describing Tokens & Review Isolation...\n');

  // Test 1: encodeReviewToken produces valid rev_ prefixed base64url string
  console.log('Test 1: encodeReviewToken & decodeReviewToken');
  const payload = {
    id: 'link-test-101',
    asset_id: 'ast-custom-1',
    astId: 'ast-custom-1',
    project_id: 'proj-custom-1',
    prjId: 'proj-custom-1',
    asset_name: 'Goa Beach Vows Teaser Cut',
    astName: 'Goa Beach Vows Teaser Cut',
    project_name: 'Dia & Rohan Beach Wedding',
    prjName: 'Dia & Rohan Beach Wedding',
    client_name: 'Dia & Rohan',
    cliName: 'Dia & Rohan',
    can_comment: 1,
    can_download: 0,
    can_approve: 1,
  };

  const token = encodeReviewToken(payload);
  assert(token.startsWith('rev_'), 'Token must start with rev_ prefix');
  const decoded = decodeReviewToken(token);
  assert.strictEqual(decoded.asset_name, 'Goa Beach Vows Teaser Cut');
  assert.strictEqual(decoded.project_name, 'Dia & Rohan Beach Wedding');
  assert.strictEqual(decoded.can_download, 0);
  console.log('  ✅ encodeReviewToken and decodeReviewToken verified.');

  // Test 2: Unknown non-demo token throws error in getClientReview
  console.log('\nTest 2: getClientReview throws for unknown non-demo token');
  let threw = false;
  try {
    await api.getClientReview('completely-invalid-bogus-token-xyz');
  } catch (err: any) {
    threw = true;
    assert(err.message.includes('not found') || err.message.includes('expired'), 'Error message describes link not found');
  }
  assert(threw, 'Unknown non-demo token must throw error');
  console.log('  ✅ Unknown non-demo token correctly threw error.');

  // Test 3: Demo token resolves demo cut
  console.log('\nTest 3: Demo token resolves demo cut');
  const demoReview = await api.getClientReview('sharma-wedding-teaser-review');
  assert.strictEqual(demoReview.project.name, 'Sharma - Verma Wedding 2026');
  assert.strictEqual(demoReview.asset.name, 'Wedding Teaser Cut V2');
  console.log('  ✅ Demo review token resolved demo wedding cut.');

  // Test 4: Decoded rev_ token resolves without server
  console.log('\nTest 4: Decoded rev_ token resolves without server');
  const customReview = await api.getClientReview(token);
  assert.strictEqual(customReview.asset.name, 'Goa Beach Vows Teaser Cut');
  assert.strictEqual(customReview.project.name, 'Dia & Rohan Beach Wedding');
  assert.strictEqual(customReview.permissions.canDownload, false);
  assert.strictEqual(customReview.permissions.canComment, true);
  console.log('  ✅ Stateless self-describing token resolved correctly.');

  // Test 5: Revoked token throws revocation error
  console.log('\nTest 5: Revoked token throws revocation error');
  const revokedPayload = { ...payload, revoked_at: new Date().toISOString() };
  const revokedToken = encodeReviewToken(revokedPayload);
  let revokedThrew = false;
  try {
    await api.getClientReview(revokedToken);
  } catch (err: any) {
    revokedThrew = true;
    assert(err.message.includes('revoked'), 'Error message must specify revoked');
  }
  assert(revokedThrew, 'Revoked token must throw error');
  console.log('  ✅ Revoked review token threw revocation error.');

  // Test 6: Create Project starts with 0 assets
  console.log('\nTest 6: Create Project starts with 0 assets');
  const newProjRes = await api.createProject({
    name: 'Jodhpur Royal Wedding',
    clientName: 'Sanjay & Sunita',
  });
  assert(newProjRes.project.id);
  const projDetails = await api.getProject(newProjRes.project.id);
  assert.strictEqual(projDetails.assets.length, 0, 'New project must have 0 assets');
  assert.strictEqual(projDetails.project.asset_count, 0, 'New project asset count must be 0');
  console.log(`  ✅ New project verified clean with 0 assets.`);

  console.log('\n========================================================');
  console.log('🎉 ALL CLIENT TOKEN & REVIEW TESTS PASSED!');
  console.log('========================================================\n');
}

testTokenAndReview().catch((err) => {
  console.error('\n❌ Test Failed:', err);
  process.exit(1);
});
