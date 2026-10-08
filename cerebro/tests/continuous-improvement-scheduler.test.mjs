import test from 'node:test';
import assert from 'node:assert/strict';
import {CADENCES,createCyclePlan,shouldRunHorizon,nextRetry,eventToCandidate} from '../runtime/continuous-improvement-scheduler.mjs';

test('cycle plan is multi-company, deterministic, zero-cost and non-PROD',()=>{
  const args={company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.1.0',cadence:CADENCES.DAILY,now:'2026-10-08T12:00:00Z'};
  const a=createCyclePlan(args),b=createCyclePlan(args);
  assert.equal(a.lock_key,b.lock_key);
  assert.equal(a.budget_eur,0);
  assert.equal(a.allow_prod_writes,false);
  assert.throws(()=>createCyclePlan({...args,environment:'PROD'}),/prod_context_not_allowed/);
  assert.throws(()=>createCyclePlan({...args,budget_eur:0.01}),/0 EUR/);
});

test('EVENT cadence only accepts canonical event triggers',()=>{
  const base={company_id:'fenix',engine_id:'LRN-001',environment:'LAB',version:'0.1.0',cadence:CADENCES.EVENT,now:'2026-10-08T12:00:00Z'};
  assert.equal(createCyclePlan({...base,event_type:'REGRESSION'}).event_type,'REGRESSION');
  assert.throws(()=>createCyclePlan({...base,event_type:'UNKNOWN'}),/invalid event trigger/);
});

test('horizons preserve daily weekly monthly event semantics',()=>{
  assert.equal(shouldRunHorizon({cadence:CADENCES.DAILY,last_run_at:'2026-10-07T12:00:00Z',now:'2026-10-08T12:00:00Z'}),true);
  assert.equal(shouldRunHorizon({cadence:CADENCES.WEEKLY,last_run_at:'2026-10-02T12:00:00Z',now:'2026-10-08T12:00:00Z'}),false);
  assert.equal(shouldRunHorizon({cadence:CADENCES.MONTHLY,last_run_at:'2026-09-01T12:00:00Z',now:'2026-10-08T12:00:00Z'}),true);
  assert.equal(shouldRunHorizon({cadence:CADENCES.EVENT,last_run_at:'2026-10-08T11:59:59Z',now:'2026-10-08T12:00:00Z'}),true);
});

test('retry exhausts after bounded attempts without inventing HUMAN_REQUIRED',()=>{
  assert.deepEqual(nextRetry({attempt:1,max_attempts:3}),{retry:true,after_seconds:30,human_required:null,exhausted:false});
  assert.deepEqual(nextRetry({attempt:3,max_attempts:3}),{retry:false,human_required:null,exhausted:true});
});

test('event candidate mapping is deterministic and never authorizes PROD',()=>{
  const c=eventToCandidate('INCIDENT');
  assert.equal(c.candidate_type,'IMPROVEMENT_CANDIDATE');
  assert.equal(c.priority,'HIGH');
  assert.equal(c.prod_authorized,false);
});
