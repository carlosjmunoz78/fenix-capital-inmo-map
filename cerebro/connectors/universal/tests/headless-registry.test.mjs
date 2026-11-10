import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const x=JSON.parse(readFileSync(new URL('../registry/headless-gates.v1.json',import.meta.url),'utf8'));
test('all five targeted connectors have explicit 4D scope and status',()=>{
 assert.equal(x.company_id,'fenix-capital');assert.equal(x.engine_id,'FACT-001');assert.equal(x.environment,'LAB');
 assert.deepEqual(x.connectors.map(c=>c.id),['cloudflare','vercel','supabase','notion','github']);
 assert.equal(new Set(x.green_requires).size,x.green_requires.length);
});
test('no connector is misleadingly declared fully autonomous without physical evidence in every gate',()=>{
 for(const c of x.connectors){
  assert.ok(['PARTIAL','PLANNED','VERIFIED_FULL'].includes(c.state));
  assert.deepEqual(Object.keys(c.verification),x.green_requires);
  assert.ok(c.evidence.length>0);
  assert.ok(Object.values(c.verification).every(v=>v==='VERIFIED'||v==='PENDING'));
  if(c.state==='VERIFIED_FULL')assert.ok(x.green_requires.every(g=>c.verification[g]==='VERIFIED'),c.id);
 }
});
test('ChatGPT plugin OCR/OAuth claims are not counted as independent service identity',()=>{
 for(const c of x.connectors){
  if(c.id==='notion')assert.equal(c.verification.independent_service_identity,'PENDING');
  assert.equal(c.verification.autonomous_queue,'PENDING');
  assert.equal(c.verification.production_promotion_policy,'PENDING');
 }
});
test('do not confuse reversal of LAB configuration with verified deployment rollback',()=>{
 assert.equal(x.connectors.find(c=>c.id==='vercel').verification.backup_and_rollback,'PENDING');
});
test('destructive operations on production are not marked independently green',()=>{
 assert.ok(x.connectors.every(c=>c.verification.production_promotion_policy!=='VERIFIED'));
});
