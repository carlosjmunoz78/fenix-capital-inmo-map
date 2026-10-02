import test from "node:test";
import assert from "node:assert/strict";
import { CADENCES, createCyclePlan, shouldRunHorizon, nextRetry, eventToCandidate } from "../runtime/continuous-improvement-scheduler.mjs";

test("daily plan is incremental, zero-cost and no PROD writes",()=>{
 const p=createCyclePlan({company_id:"fenix-capital",engine_id:"SUP-001",cadence:CADENCES.DAILY,now:"2026-09-19T02:00:00Z"});
 assert.equal(p.execution_mode,"INCREMENTAL");
 assert.equal(p.budget_eur,0);
 assert.equal(p.allow_prod_writes,false);
 assert.equal(p.max_attempts,3);
});

test("same checkpoint gets same lock key",()=>{
 const args={company_id:"fenix-capital",engine_id:"SUP-001",cadence:CADENCES.DAILY,now:"2026-09-19T02:00:00Z",checkpoint:"c1"};
 assert.equal(createCyclePlan(args).lock_key,createCyclePlan(args).lock_key);
});

test("event trigger creates immediate candidate",()=>{
 assert.deepEqual(eventToCandidate("REGRESSION"),{candidate_type:"IMPROVEMENT_CANDIDATE",priority:"HIGH"});
 assert.deepEqual(eventToCandidate("HUMAN_CORRECTION"),{candidate_type:"LEARNING_CANDIDATE",priority:"NORMAL"});
});

test("horizons respect elapsed time",()=>{
 assert.equal(shouldRunHorizon({cadence:CADENCES.DAILY,last_run_at:"2026-09-18T00:00:00Z",now:"2026-09-19T00:00:00Z"}),true);
 assert.equal(shouldRunHorizon({cadence:CADENCES.WEEKLY,last_run_at:"2026-09-15T00:00:00Z",now:"2026-09-19T00:00:00Z"}),false);
 assert.equal(shouldRunHorizon({cadence:CADENCES.MONTHLY,last_run_at:"2026-08-01T00:00:00Z",now:"2026-09-19T00:00:00Z"}),true);
});

test("retry is bounded and backs off",()=>{
 assert.deepEqual(nextRetry({attempt:1}),{retry:true,after_seconds:30,exhausted:false});
 assert.deepEqual(nextRetry({attempt:3}),{retry:false,human_required:false,exhausted:true});
});

test("invalid event or excessive attempts fail closed",()=>{
 assert.throws(()=>createCyclePlan({company_id:"x",engine_id:"SUP-001",cadence:CADENCES.EVENT,event_type:"UNKNOWN",now:"2026-09-19T00:00:00Z"}));
 assert.throws(()=>createCyclePlan({company_id:"x",engine_id:"SUP-001",cadence:CADENCES.DAILY,now:"2026-09-19T00:00:00Z",max_attempts:4}));
});
