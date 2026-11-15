import {test} from 'node:test';import assert from 'node:assert/strict';
import {planSharedSchedulerShadow} from './shared-scheduler-shadow.mjs';
const base={company_id:'fenix',environment:'LAB',scheduler_id:'cerebro-fact001-headless-operator-lab-20261111',
cron_quota:5,crons_used:5,now_ms:1711111111111,engines:['LAB-CF-CANARY-001'],
guard:{old_contract_snapshotted:true,dependency_map_snapshotted:true,rollback_dry_run_green:true,existing_scheduler_tests_green:true}};
const job=(id,priority,overrides={})=>({company_id:'fenix',environment:'LAB',engine_id:'LAB-CF-CANARY-001',job_id:id,
idempotency_key:'key-'+id,priority,due_at_ms:1711111110000,paused:false,cost_eur:0,external_actions_allowed:false,...overrides});
test('No permission to change 5/5 Cloudflare cron budget; shadow never executes',()=>{
 const r=planSharedSchedulerShadow({...base,jobs:[job('job-one',1)]});
 assert.equal(r.status,'SHADOW_PLAN_ONLY');assert.equal(r.existing_crons_untouched,true);
 assert.equal(r.additional_cost_eur,0);assert.equal(r.runtime_execution,false);assert.equal(r.external_actions,0);
 assert.equal(r.cron_changes,0);assert.equal(r.needs_provider_integration,true);
});
test('Priority controls order and pause is respected without external execution',()=>{
 const r=planSharedSchedulerShadow({...base,jobs:[job('job-low',5),job('job-high',1),job('job-paused',1,{paused:true}),job('job-middle',3),job('job-future',1,{due_at_ms:1711111111112})]});
 assert.equal(r.status,'SHADOW_PLAN_ONLY');
 assert.deepEqual(r.selected.map(x=>x.job_id),['job-high','job-middle']);
 assert.deepEqual(r.deferred.map(x=>x.reason).sort(),['FAIRNESS_LIMIT','NOT_DUE','PAUSED'].sort());
 assert.equal(r.concurrency_limit,1);
});
test('Fail-closed on cross-company/prod, drift, missing backup, cost or duplicate keys',()=>{
 const cases=[
 {...base,company_id:'another-company'}, {...base,environment:'PROD'}, {...base,crons_used:4},
 {...base,scheduler_id:'cerebro-facebook-buffer-replenisher-lab'},
 {...base,guard:{}},{...base,jobs:[job('one',1,{cost_eur:1})]},
 {...base,jobs:[job('one',1,{environment:'PROD'})]},
 {...base,jobs:[job('one',1),job('two',1,{idempotency_key:'key-one'})]}
 ];
 for(const c of cases){const v=planSharedSchedulerShadow(c);assert.equal(v.status,'DENIED',JSON.stringify(c));
 assert.deepEqual(v.selected,[]);assert.equal(v.cron_changes,0);assert.equal(v.external_actions,0)}
});
test('No network, queues, database writes or Cloudflare mutations in shadow',async()=>{
 const {readFileSync}=await import('node:fs');
 const s=readFileSync(new URL('./shared-scheduler-shadow.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(s,/\bfetch\s*\(|\bPUT\b|\bPOST\b|await\s|\.send\(|\.prepare\(|\.get\(|\.put\(/);
});
