import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserOrchestratorV2,BROWSER_ORCHESTRATOR_V2_CONTRACT} from '../runtime/browser-orchestrator-v2.mjs';

function job(n,{company='fenix',department='seo',profile=`p${n}`,priority=50,max_attempts=3}={}){
  return {job_id:`j${n}`,idempotency_key:`i${n}`,company_id:company,department_id:department,engine_id:'CONSOLE-001',identity_id:`id${n}`,account_id:`a${n}`,browser_profile_id:profile,environment:'PREPROD',priority,max_attempts,expected_cost_eur:0};
}

test('idempotent enqueue never duplicates',()=>{
  const o=createBrowserOrchestratorV2();
  const a=o.enqueue(job(1)); const b=o.enqueue(job(1));
  assert.equal(a.job_id,b.job_id); assert.equal(o.snapshot().queued_jobs,1);
});

test('leases multiple departments concurrently up to global limit',()=>{
  const o=createBrowserOrchestratorV2({global_limit:4,default_department_limit:2});
  o.enqueue(job(1,{department:'seo'})); o.enqueue(job(2,{department:'marketing'}));
  o.enqueue(job(3,{department:'crm'})); o.enqueue(job(4,{department:'finance'}));
  const leases=[1,2,3,4].map(n=>o.lease(`w${n}`));
  assert.equal(leases.filter(Boolean).length,4); assert.equal(o.snapshot().active_jobs,4);
});

test('same browser profile cannot have two simultaneous writers',()=>{
  const o=createBrowserOrchestratorV2({global_limit:4,default_department_limit:4});
  o.enqueue(job(1,{profile:'same'})); o.enqueue(job(2,{profile:'same',department:'crm'}));
  assert.ok(o.lease('w1')); assert.equal(o.lease('w2'),null);
});

test('department quota prevents monopoly and fairness serves another department',()=>{
  const o=createBrowserOrchestratorV2({global_limit:4,default_department_limit:1});
  o.enqueue(job(1,{department:'seo',priority:90})); o.enqueue(job(2,{department:'seo',priority:90}));
  o.enqueue(job(3,{department:'crm',priority:50}));
  const first=o.lease('w1'); const second=o.lease('w2');
  assert.equal(first.department_id,'seo'); assert.equal(second.department_id,'crm');
});

test('company quota isolates capacity between companies',()=>{
  const o=createBrowserOrchestratorV2({global_limit:4,default_company_limit:1,default_department_limit:4});
  o.enqueue(job(1,{company:'fenix',department:'seo'}));
  o.enqueue(job(2,{company:'fenix',department:'crm'}));
  o.enqueue(job(3,{company:'captacasa',department:'seo'}));
  const a=o.lease('w1'); const b=o.lease('w2');
  assert.notEqual(a.company_id,b.company_id);
});

test('priority wins when quotas allow it',()=>{
  const o=createBrowserOrchestratorV2({global_limit:2,default_department_limit:2});
  o.enqueue(job(1,{department:'seo',priority:20})); o.enqueue(job(2,{department:'crm',priority:80}));
  assert.equal(o.lease('w1').job_id,'j2');
});

test('cancel queued job consumes no worker',()=>{
  const o=createBrowserOrchestratorV2(); o.enqueue(job(1));
  assert.equal(o.cancel('j1').state,'CANCELLED'); assert.equal(o.lease('w1'),null);
});

test('retry budget ends in dead letter without blocking other profiles',()=>{
  let now=1000; const o=createBrowserOrchestratorV2({global_limit:2,retry_base_ms:1,clock:()=>now});
  o.enqueue(job(1,{max_attempts:2})); o.enqueue(job(2,{profile:'other',department:'crm'}));
  let a=o.lease('w1'); let b=o.lease('w2'); assert.equal(b.job_id,'j2');
  o.complete(a.job_id,a.lease_id,'w1',{ok:false,error_code:'E1'}); now+=10; o.reapExpired();
  a=o.lease('w1'); o.complete(a.job_id,a.lease_id,'w1',{ok:false,error_code:'E2'});
  assert.equal(o.get('j1').state,'DEAD_LETTER');
  assert.equal(o.complete(b.job_id,b.lease_id,'w2',{ok:true}).state,'SUCCEEDED');
});

test('expired worker lease is recovered and profile lock released',()=>{
  let now=1000; const o=createBrowserOrchestratorV2({lease_seconds:30,retry_base_ms:1,clock:()=>now});
  o.enqueue(job(1,{max_attempts:2})); const a=o.lease('w1'); assert.ok(a);
  now+=31_000; o.reapExpired(); assert.equal(o.get('j1').state,'RETRY_WAIT'); now+=10; o.reapExpired();
  const b=o.lease('w2'); assert.equal(b.job_id,'j1'); assert.notEqual(b.lease_id,a.lease_id);
});

test('high risk jobs are never auto-leased and non-zero-cost jobs are rejected at ingress',()=>{
  const o=createBrowserOrchestratorV2();
  o.enqueue({...job(1),risk:'HIGH'});
  assert.throws(()=>o.enqueue({...job(2),expected_cost_eur:1}),/INVALID_EXPECTED_COST_EUR/);
  assert.equal(o.lease('w1'),null);
});

test('contract explicitly preserves Browser 1 serial rollback',()=>{
  assert.equal(BROWSER_ORCHESTRATOR_V2_CONTRACT.wraps_existing_browser1,true);
  assert.equal(BROWSER_ORCHESTRATOR_V2_CONTRACT.replaces_browser1,false);
  assert.equal(BROWSER_ORCHESTRATOR_V2_CONTRACT.serial_v1_rollback_preserved,true);
  assert.equal(BROWSER_ORCHESTRATOR_V2_CONTRACT.incremental_cost_eur,0);
});
