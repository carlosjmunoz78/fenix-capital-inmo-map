import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const x=JSON.parse(readFileSync(new URL('../registry/headless-gates.v1.json',import.meta.url),'utf8'));

// Preserve scoped historical physical evidence without promoting the provider to FULL.
// Only these exact gate-level LAB evidence labels are recognized. New values require review.
const scoped=Object.freeze({
 autonomous_queue:'VERIFIED_LAB_SIGNED_WORKFLOW',
 isolated_lab_update:'VERIFIED_PHYSICAL_VAULT_SIGNED',
 backup_and_rollback:'VERIFIED_LAB_FRAMEWORK_SETTINGS',
 observability_and_audit:'VERIFIED_LAB_5_EVENTS'
});
test('all five targeted connectors have explicit 4D scope and status',()=>{
 assert.equal(x.company_id,'fenix-capital');assert.equal(x.engine_id,'FACT-001');assert.equal(x.environment,'LAB');
 assert.deepEqual(x.connectors.map(c=>c.id),['cloudflare','vercel','supabase','notion','github']);
 assert.equal(new Set(x.green_requires).size,x.green_requires.length);
});
test('scoped LAB proof is valid evidence but cannot imply universal FULL',()=>{
 for(const c of x.connectors){
  assert.ok(['PARTIAL','PLANNED','VERIFIED_FULL'].includes(c.state));
  assert.deepEqual(Object.keys(c.verification),x.green_requires);
  assert.ok(c.evidence.length>0,c.id);
  for(const [gate,status] of Object.entries(c.verification)){
   const allowed=status==='VERIFIED'||status==='PENDING'||
     (c.id==='vercel'&&scoped[gate]===status);
   assert.ok(allowed,c.id+':'+gate+'='+status);
  }
  if(c.state==='VERIFIED_FULL'){
   assert.ok(x.green_requires.every(g=>c.verification[g]==='VERIFIED'),c.id);
   assert.ok(!Object.values(c.verification).some(v=>v.startsWith('VERIFIED_LAB_')),c.id);
  }
 }
});
test('Notion LAB CRUD evidence exists, but autonomous queue and PROD remain pending',()=>{
 for(const c of x.connectors){
  if(c.id==='notion'){
   assert.equal(c.verification.independent_service_identity,'VERIFIED');
   assert.ok(c.evidence.some(e=>e.includes('42849043493')));
   assert.equal(c.verification.isolated_lab_create,'VERIFIED');
   assert.ok(c.evidence.some(e=>e.includes('42853530709')));
  }
  if(c.id!=='vercel')assert.equal(c.verification.autonomous_queue,'PENDING',c.id);
  assert.equal(c.verification.production_promotion_policy,'PENDING',c.id);
 }
});
test('Vercel signed service framework rollback and ChatGPT protected deploy rollback remain separate proofs',()=>{
 const v=x.connectors.find(c=>c.id==='vercel');
 assert.equal(v.state,'PARTIAL');
 assert.equal(v.verification.autonomous_queue,'VERIFIED_LAB_SIGNED_WORKFLOW');
 assert.equal(v.verification.backup_and_rollback,'VERIFIED_LAB_FRAMEWORK_SETTINGS');
 assert.equal(v.verification.cost_guard_verified,'PENDING');
 assert.equal(v.protected_lab_deployment_rollback_20261111.state,'VERIFIED_LAB_FROM_CHATGPT_OAUTH_NOT_CEREBRO_HEADLESS');
 assert.equal(v.protected_lab_deployment_rollback_20261111.baseline_alias_count_after_rollback,2);
 assert.equal(v.protected_lab_deployment_rollback_20261111.update_alias_count_after_rollback,0);
 assert.equal(v.protected_lab_deployment_rollback_20261111.full_headless_autonomy,'PENDING');
 assert.ok(v.gaps.some(s=>s.includes('broad deployments')&&s.includes('pending')));
 assert.ok(v.evidence.some(s=>s.includes('43054365439')));
});
test('destructive operations on production are not marked independently green',()=>{
 assert.ok(x.connectors.every(c=>c.verification.production_promotion_policy!=='VERIFIED'));
 assert.ok(x.connectors.every(c=>c.state!=='VERIFIED_FULL'));
});
