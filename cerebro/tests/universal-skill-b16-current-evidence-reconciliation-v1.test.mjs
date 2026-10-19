import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {listRangeReconciliations,resolveLatestRangeReconciliation,resolveCurrentLegacyItem,assertNoProdAuthority} from '../runtime/universal-skill-reconciliation-resolver-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(__dirname,'../..');
const readJson=(ref)=>JSON.parse(fs.readFileSync(path.join(repoRoot,ref),'utf8'));

test('B16 resolver preserves history and selects newest 176-184 reconciliation',()=>{
  const rows=listRangeReconciliations({repo_root:repoRoot,start:176,end:184});
  assert.ok(rows.some(row=>row.ref.endsWith('.v2.json')));
  assert.ok(rows.some(row=>row.ref.endsWith('.v3.json')));
  const latest=resolveLatestRangeReconciliation({repo_root:repoRoot,start:176,end:184});
  assert.equal(latest.ref,'cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v3.json');
  assert.ok(latest.history_refs.includes('cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v2.json'));
});

test('B16 item 181 remains wrapper/partial and does not become a duplicate full App Factory',()=>{
  const current=resolveCurrentLegacyItem({repo_root:repoRoot,item_id:181});
  assert.equal(current.ref,'cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v3.json');
  assert.match(current.item.state,/^PARTIAL_PREPROD_APPBOOT_WRAPPER_/);
  assert.deepEqual(current.item.owner_engine_ids,['FACT-001','APPBOOT-001']);
  assert.doesNotMatch(current.item.state,/FULL/i);
  assertNoProdAuthority(current);
});

test('B16 item 183 consumes newer physical evidence but keeps Android device gate open',()=>{
  const current=resolveCurrentLegacyItem({repo_root:repoRoot,item_id:183});
  const physical=readJson('cerebro/registry/fact001-android-staging-48-183.v0.json');
  assert.equal(current.item.state,'PARTIAL_PREPROD_STAGING_RENDER_AND_SIGNED_ANDROID_BUILD_GREEN_PHYSICAL_DEVICE_PENDING');
  assert.ok(current.item.evidence.includes('cerebro/registry/fact001-android-staging-48-183.v0.json'));
  assert.equal(current.item.verified.wordpress_staging_draft_render_readback,true);
  assert.equal(current.item.verified.signed_preprod_android_apk_build,true);
  assert.equal(current.item.verified.physical_device_installed,false);
  assert.equal(current.item.next_gate,'AUTHORIZED_DEVICE_INSTALL_AND_RENDER_E2E');
  assert.equal(physical.item_183.verified_state,'STAGING_DRAFT_RENDER_PLUS_SIGNED_ANDROID_APK_BUILD_GREEN');
  assert.equal(physical.item_183.physical_device_installed,false);
  assert.equal(physical.item_183.remaining_gate,'AUTHORIZED_DEVICE_INSTALL_AND_RENDER_E2E');
  assertNoProdAuthority(current);
});

test('B16 historical v2 remains stale history rather than being rewritten',()=>{
  const historical=readJson('cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v2.json');
  const item181=historical.items.find(row=>row.id===181);
  const item183=historical.items.find(row=>row.id===183);
  assert.equal(item181.state,'PARTIAL_PREPROD_SCAFFOLD_PLAN');
  assert.equal(item183.state,'DEFINED_NOT_BUILT_TEMPLATE_PACKS');
  assert.equal(item183.next_gate,'FACT001_APPBOOT_TEMPLATE_PACKS_PREPROD');
});

test('B16 current global convergence agrees that Android 48/183 remains physical partial',()=>{
  const global=readJson('cerebro/skills/cerebro-184-live-convergence.v3.json');
  const android=global.remaining_physical_gates.find(row=>row.id==='ANDROID_48_183');
  assert.equal(global.all_184_physically_active,false);
  assert.equal(android.state,'PARCIAL');
  assert.match(android.next_gate,/AUTHORIZED_PHYSICAL_ANDROID_DEVICE_E2E/);
  assert.equal(global.authority.prod_authorized,false);
  assert.equal(global.authority.prod_write_authorized,false);
});
